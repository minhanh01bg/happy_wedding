#!/usr/bin/env bash
# Builds a production bundle beside the running server, then switches to it
# with a few seconds of downtime. docs/OPERATIONS.md ("Production") has the
# systemd unit, the nginx block and the first switch from `next dev`.
#
#   scripts/deploy-prod.sh               check, build, migrate if needed, switch
#   scripts/deploy-prod.sh --build-only  check and build only; the running
#                                        server and its .next stay untouched
#
# The new bundle is built in .next-staging, boot-checked on a spare port, and
# renamed to .next while the service is stopped; the bundle it replaces stays
# in .next-prev for a rollback until the next deploy. Pending migrations run
# while the service is stopped, after a database backup. It never runs
# `prisma generate` or `pnpm install`.
#
# Once the service is stopped, any failure or interruption (Ctrl-C, SIGTERM,
# a lost SSH session) puts the previous server back by itself: the new
# bundle is stopped and moved back to .next-staging, .next-prev back to
# .next, and what ran before starts again (on the first switch, the old user
# unit, enabled as it was). The database is not restored. When that restore
# fails, the script prints the commands that are left to run.
#
# The service is a system unit (ops/happy-wedding.service, protected from the
# OOM killer) when /etc/systemd/system/<DEPLOY_SERVICE> exists, else a user
# unit. A system unit is read with plain `systemctl` and started and stopped
# with `sudo -n systemctl`, which ops/sudoers-happy-wedding allows without a
# password. Both units listen on the same port, so while the system unit is
# switched in, a user unit of the same name that still runs or starts at
# boot is stopped and disabled, after a copy of its unit file is saved. The
# system unit is enabled by hand once it serves (the script reminds you).
#
# Settings (environment, all optional):
#   DEPLOY_SERVICE        systemd unit to switch          happy-wedding.service
#   DEPLOY_UNIT_SCOPE     auto, system or user            auto (see above)
#   DEPLOY_PORT           port that unit listens on       3200
#   DEPLOY_CHECK_PORT     spare port for the boot check   3290 (E2E uses 3201)
#   DEPLOY_BACKUP_DIR     database and unit backups       <checkout>-backups, beside the checkout
#   DEPLOY_MIN_MEMORY_MB  "available" memory to build     1800
#   DEPLOY_MIN_DISK_MB    free disk to build              400
set -Eeuo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
cd "$ROOT"

SERVICE=${DEPLOY_SERVICE:-happy-wedding.service}
SCOPE=${DEPLOY_UNIT_SCOPE:-auto}
SYSTEM_UNIT_FILE=/etc/systemd/system/$SERVICE
PORT=${DEPLOY_PORT:-3200}
CHECK_PORT=${DEPLOY_CHECK_PORT:-3290}
BACKUP_DIR=${DEPLOY_BACKUP_DIR:-$ROOT-backups}
MIN_MEMORY_MB=${DEPLOY_MIN_MEMORY_MB:-1800}
MIN_DISK_MB=${DEPLOY_MIN_DISK_MB:-400}
LIVE=.next
STAGING=.next-staging
PREVIOUS=.next-prev
NEXT_BIN=node_modules/next/dist/bin/next
# Static, no database: proves the server booted, which it only does once
# src/instrumentation.ts accepted the production settings.
HEALTH_PATH=/robots.txt

BUILD_ONLY=false
case "${1:-}" in
  "") ;;
  --build-only) BUILD_ONLY=true ;;
  *)
    echo "Usage: scripts/deploy-prod.sh [--build-only]" >&2
    exit 2
    ;;
esac

case $SCOPE in
  auto) if [[ -e $SYSTEM_UNIT_FILE ]]; then SCOPE=system; else SCOPE=user; fi ;;
  system | user) ;;
  *)
    echo "DEPLOY_UNIT_SCOPE must be auto, system or user" >&2
    exit 2
    ;;
esac
if [[ $SCOPE == system ]]; then
  UNIT_READ=(systemctl)
  UNIT_CONTROL=(sudo -n systemctl)
  UNIT_JOURNAL=(journalctl)
else
  UNIT_READ=(systemctl --user)
  UNIT_CONTROL=(systemctl --user)
  UNIT_JOURNAL=(journalctl --user)
fi

WORK=$(mktemp -d)
CHECK_PID=
SITE_DOWN=false
RETIRE_USER_UNIT=false
USER_UNIT_RETIRED=false
# What the switch did, for the restore. Each is set before its step runs,
# and the restore checks the folders themselves, so a step interrupted half
# way is undone too.
RESTORE_TARGET=none   # what ran before the stop: unit (SERVICE), user (old user unit) or none
RESTORE_RAN=false
SERVICE_STARTED=false # the new bundle may run under SERVICE
LIVE_MOVED=false      # .next -> .next-prev
STAGED=false          # .next-staging -> .next
CACHE_MOVED_FROM=     # image cache moved from here into the new .next
PORT_BUSY=false
MIGRATED=false
USER_ENABLED_AGAIN=false
backup=

step() { printf '\n==> %s\n' "$*"; }
die() {
  printf '\nERROR: %s\n' "$*" >&2
  exit 1
}

# next build adds its distDir to tsconfig.json and rewrites next-env.d.ts;
# put both back so the checkout stays clean.
restore_build_files() {
  local file
  for file in tsconfig.json next-env.d.ts; do
    if [[ -f $WORK/$file ]]; then
      cmp -s "$WORK/$file" "$file" || cp -p "$WORK/$file" "$file"
    fi
  done
}

# Runs once, on every exit. It must not stop half way: errexit and the ERR
# trap are off (each step checks its own result), and signals are ignored
# until it is done.
on_exit() {
  local code=$?
  trap - ERR
  trap '' INT TERM HUP PIPE
  set +e
  if [[ -n $CHECK_PID ]]; then
    kill "$CHECK_PID" 2>/dev/null
    wait "$CHECK_PID" 2>/dev/null
  fi
  restore_build_files
  if [[ $SITE_DOWN == true && $RESTORE_RAN == false ]]; then
    ((code != 0)) || code=1
    restore_previous_server
  fi
  rm -rf -- "$WORK"
  exit "$code"
}
trap on_exit EXIT
trap 'die "command failed at line $LINENO"' ERR
trap 'printf "\nInterrupted (SIGINT)\n" >&2; exit 130' INT
trap 'printf "\nInterrupted (SIGTERM)\n" >&2; exit 143' TERM
trap 'exit 129' HUP

# wait_for_health PORT SECONDS [PID]: true once HEALTH_PATH answers 200.
wait_for_health() {
  local port=$1 deadline=$((SECONDS + $2)) pid=${3:-} code
  while ((SECONDS < deadline)); do
    if [[ -n $pid ]] && ! kill -0 "$pid" 2>/dev/null; then return 1; fi
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
      "http://127.0.0.1:$port$HEALTH_PATH" || true)
    [[ $code == 200 ]] && return 0
    sleep 0.5
  done
  return 1
}

port_in_use() {
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 \
    "http://127.0.0.1:$1/" || true)
  [[ $code != 000 ]]
}

unit_show() { "${UNIT_READ[@]}" show -p "$1" --value "$SERVICE"; }

# unit_state [--user]: "<ActiveState> <UnitFileState>" of SERVICE in the
# system (or user) manager, which also answers for a unit it does not know
# ("inactive none"). Fails when that manager cannot be reached.
unit_state() {
  local out key value active= file_state=
  out=$(systemctl "$@" show -p ActiveState -p UnitFileState "$SERVICE" 2>/dev/null) ||
    return 1
  while IFS='=' read -r key value; do
    case $key in
      ActiveState) active=$value ;;
      UnitFileState) file_state=$value ;;
    esac
  done <<<"$out"
  printf '%s %s\n' "${active:-inactive}" "${file_state:-none}"
}
is_running() { [[ $1 != inactive && $1 != failed ]]; }
is_enabled() { [[ $1 == enabled || $1 == enabled-runtime ]]; }

# Switching to the system unit: the old user unit must neither run nor start
# at boot again (same port). Its unit file stays in place, disabled, and a
# copy goes to BACKUP_DIR for "Rollback" in docs/OPERATIONS.md.
backup_user_unit() {
  local file
  file=$(systemctl --user show -p FragmentPath --value "$SERVICE")
  if [[ -n $file && -f $file ]]; then
    mkdir -p -- "$BACKUP_DIR"
    USER_UNIT_BACKUP=$BACKUP_DIR/$SERVICE.user.$(date +%Y%m%d-%H%M%S)
    cp -p -- "$file" "$USER_UNIT_BACKUP"
    echo "Old user unit file saved: $USER_UNIT_BACKUP"
  fi
}
retire_user_unit() {
  USER_UNIT_RETIRED=true
  if is_running "$USER_ACTIVE"; then systemctl --user stop "$SERVICE"; fi
  if is_enabled "$USER_ENABLED"; then systemctl --user disable "$SERVICE"; fi
  echo "Old user unit: stopped and disabled"
}
# The system unit is enabled only after the first switch (two enabled units
# would both start at boot on the same port), with a password: the sudoers
# file allows start, stop and restart only.
system_unit_enabled() { is_enabled "$(unit_show UnitFileState 2>/dev/null || true)"; }
system_unit_running() { is_running "$(unit_show ActiveState 2>/dev/null || echo unknown)"; }

# --- Restore (from on_exit only) --------------------------------------------
# Puts the old user unit back as it was before this run (no sudo needed),
# and starts it when it was the server that ran. Never next to the system
# unit: it starts only while the system unit is stopped, and is enabled
# again only while the system unit is not enabled.
restore_user_unit() {
  if is_enabled "$USER_ENABLED" && [[ $USER_ENABLED_AGAIN == false ]]; then
    if system_unit_enabled; then
      echo "Old user unit: left disabled, because the system unit $SERVICE is enabled (both would start at boot on port $PORT)"
      if [[ $RESTORE_TARGET == user ]]; then
        printf 'To start the old user unit at boot instead, run:\n  sudo systemctl disable %s   # asks for the password\n  systemctl --user enable %s\n' \
          "$SERVICE" "$SERVICE"
      fi
    else
      systemctl --user enable "$SERVICE" || return 1
      USER_ENABLED_AGAIN=true
      echo "Old user unit: enabled again"
    fi
  fi
  if [[ $RESTORE_TARGET == user ]]; then
    if system_unit_running; then
      echo "The system unit $SERVICE still runs (or its state cannot be read): the old user unit is not started next to it" >&2
      return 1
    fi
    systemctl --user start "$SERVICE" || return 1
    echo "Old user unit: started again"
  fi
  USER_UNIT_RETIRED=false
}

# Moves the folders back to where they were before the switch. Each move is
# a rename, so it either happened or not: look at the folders.
restore_folders() {
  if [[ -n $CACHE_MOVED_FROM && -d $LIVE/cache/images && ! -e $CACHE_MOVED_FROM ]]; then
    # Only a cache: losing it costs time, not data.
    mkdir -p -- "$(dirname -- "$CACHE_MOVED_FROM")" &&
      mv -T -- "$LIVE/cache/images" "$CACHE_MOVED_FROM" ||
      echo "Warning: the image cache stays in $LIVE/cache/images of the new bundle" >&2
  fi
  CACHE_MOVED_FROM=
  if [[ $STAGED == true ]]; then
    if [[ -e $LIVE && ! -e $STAGING ]]; then
      mv -T -- "$LIVE" "$STAGING" || return 1
      echo "New bundle moved back to $STAGING"
    fi
    STAGED=false
  fi
  if [[ $LIVE_MOVED == true ]]; then
    if [[ ! -e $LIVE && -e $PREVIOUS ]]; then
      mv -T -- "$PREVIOUS" "$LIVE" || return 1
      echo "Previous bundle moved back to $LIVE"
    fi
    LIVE_MOVED=false
  fi
}

# The commands still needed to finish the restore by hand, worked out from
# what the restore got done.
print_manual_rollback() {
  printf '\nRun these to bring the previous server back (docs/OPERATIONS.md, "Rollback"):\n' >&2
  printf '  cd %s\n' "$ROOT" >&2
  printf '  %s stop %s\n' "${UNIT_CONTROL[*]}" "$SERVICE" >&2
  local unstage=false
  if [[ $STAGED == true && -e $LIVE && ! -e $STAGING ]]; then
    unstage=true
    printf '  mv -T %s %s\n' "$LIVE" "$STAGING" >&2
  fi
  if [[ $LIVE_MOVED == true && -e $PREVIOUS ]] && [[ $unstage == true || ! -e $LIVE ]]; then
    printf '  mv -T %s %s\n' "$PREVIOUS" "$LIVE" >&2
  fi
  case $RESTORE_TARGET in
    user)
      if system_unit_enabled; then
        printf '  sudo systemctl disable %s   # asks for the password\n' "$SERVICE" >&2
      fi
      if is_enabled "$USER_ENABLED" && [[ $USER_ENABLED_AGAIN == false ]]; then
        printf '  systemctl --user enable --now %s   # the old user unit\n' "$SERVICE" >&2
      else
        printf '  systemctl --user start %s   # the old user unit\n' "$SERVICE" >&2
      fi
      ;;
    unit)
      if [[ $USER_UNIT_RETIRED == true ]] && is_enabled "$USER_ENABLED" &&
        [[ $USER_ENABLED_AGAIN == false ]] && ! system_unit_enabled; then
        printf '  systemctl --user enable %s   # enabled before this run; it stays stopped\n' "$SERVICE" >&2
      fi
      printf '  %s start %s\n' "${UNIT_CONTROL[*]}" "$SERVICE" >&2
      ;;
  esac
  if [[ $MIGRATED == true ]]; then
    printf '  # The database was migrated. If the previous code fails on it, restore\n  # %s first (see "Rollback").\n' "$backup" >&2
  fi
}

restore_failed() {
  printf '\nThe site is DOWN: the previous server could not be put back (%s).\n' "$1" >&2
  print_manual_rollback
}

# Brings back what ran before the stop. Called once, from on_exit.
restore_previous_server() {
  RESTORE_RAN=true
  step "Restore: putting the previous server back (do not interrupt)"
  if [[ $SERVICE_STARTED == true ]]; then
    if ! "${UNIT_CONTROL[@]}" stop "$SERVICE"; then
      restore_failed "'${UNIT_CONTROL[*]} stop $SERVICE' failed"
      return
    fi
    SERVICE_STARTED=false
  fi
  if ! restore_folders; then
    restore_failed "moving the bundles back failed"
    return
  fi
  case $RESTORE_TARGET in
    user)
      if ! restore_user_unit; then
        restore_failed "the old user unit did not start"
        return
      fi
      ;;
    unit)
      if [[ $USER_UNIT_RETIRED == true ]] && ! restore_user_unit; then
        restore_failed "the old user unit could not be enabled again"
        return
      fi
      if ! "${UNIT_CONTROL[@]}" start "$SERVICE"; then
        restore_failed "'${UNIT_CONTROL[*]} start $SERVICE' failed"
        return
      fi
      ;;
    none)
      if [[ $USER_UNIT_RETIRED == true ]]; then restore_user_unit; fi
      printf '\nThe site is DOWN, as it was before this run: no server ran when it started, so none was started again.\n' >&2
      return
      ;;
  esac
  if ! wait_for_health "$PORT" 90; then
    restore_failed "it was started but does not answer $HEALTH_PATH on port $PORT; see its journal"
    return
  fi
  SITE_DOWN=false
  if [[ $RESTORE_TARGET == user ]]; then
    printf '\nThe previous server is back: the old user unit %s runs again and port %s answers.\n' \
      "$SERVICE" "$PORT" >&2
  else
    printf '\nThe previous server is back: %s runs the previous bundle and port %s answers.\n' \
      "$SERVICE" "$PORT" >&2
  fi
  if [[ $PORT_BUSY == true ]]; then
    printf 'But something else answered on port %s before the restore, so the answer may not come from it: check with ss -ltnp.\n' \
      "$PORT" >&2
  fi
  if [[ $MIGRATED == true ]]; then
    printf 'The database stays migrated; backup from before: %s\n' "$backup" >&2
  fi
}

# ---------------------------------------------------------------------------
step "Checks (nothing changes yet)"
for tool in node pnpm python3 curl flock free df; do
  command -v "$tool" >/dev/null || die "$tool is not in PATH"
done
[[ -f $NEXT_BIN ]] || die "$NEXT_BIN is missing (node_modules)"

exec 9>"${TMPDIR:-/tmp}/happy-wedding-deploy.lock"
flock -n 9 || die "another deploy is running"
# One build at a time on this machine (any checkout): memory is short.
if pgrep -f 'next build' >/dev/null; then die "a next build is already running"; fi

available=$(free -m | awk '/^Mem:/ { print $7 }')
((available >= MIN_MEMORY_MB)) ||
  die "only ${available} MB memory available, need ${MIN_MEMORY_MB}; try again later"

echo "Commit: $(git log -1 --format='%h %s')"
if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
  echo "Warning: tracked files have local changes; they are built as they are."
fi

if [[ $BUILD_ONLY == false ]]; then
  command -v systemctl >/dev/null || die "systemctl is not in PATH"
  echo "Unit: $SERVICE ($SCOPE unit)"
  if [[ $SCOPE == system ]]; then
    command -v sudo >/dev/null || die "sudo is not in PATH"
    load_state=$(unit_show LoadState) || load_state=unknown
    [[ $load_state == loaded ]] ||
      die "the system unit $SERVICE is $load_state, not loaded; install it and run 'sudo systemctl daemon-reload' (docs/OPERATIONS.md, \"systemd system unit\")"
    # Asks sudo whether each command may run, without running it. sudo also
    # says yes when any other NOPASSWD rule exists for this user; the stop
    # below then fails before anything is switched, and the site stays up.
    for action in stop start; do
      sudo -n -l systemctl "$action" "$SERVICE" >/dev/null 2>&1 ||
        die "sudo -n may not run 'systemctl $action $SERVICE' without a password; install ops/sudoers-happy-wedding (docs/OPERATIONS.md, \"systemd system unit\")"
    done
    unit_user=$(unit_show User)
    [[ $unit_user == "$(id -un)" ]] ||
      die "$SERVICE runs as '${unit_user:-root}', not $(id -un); install ops/happy-wedding.service"
  fi
  unit_dir=$(unit_show WorkingDirectory) || die "cannot read $SERVICE"
  [[ $unit_dir == "$ROOT" ]] ||
    die "$SERVICE runs from '$unit_dir', not $ROOT"
  # Read whole, then matched (grep -q would cut a pipe short under
  # pipefail); never printed, as the unit could hold settings.
  unit_exec=$(unit_show ExecStart)
  unit_env=$(unit_show Environment)
  grep -qF "$ROOT/$NEXT_BIN start " <<<"$unit_exec" ||
    die "$SERVICE does not run '$ROOT/$NEXT_BIN start'; install the unit from docs/OPERATIONS.md first"
  grep -qw 'NODE_ENV=production' <<<"$unit_env" ||
    die "$SERVICE does not set NODE_ENV=production"

  # The system and user units of this name both listen on PORT: never let
  # both run, or both start at boot.
  if [[ $SCOPE == system ]]; then
    if state=$(unit_state --user); then
      read -r USER_ACTIVE USER_ENABLED <<<"$state"
      if is_running "$USER_ACTIVE" || is_enabled "$USER_ENABLED"; then
        RETIRE_USER_UNIT=true
        echo "Old user unit: $USER_ACTIVE, $USER_ENABLED; the switch stops and disables it (unit file saved to $BACKUP_DIR)"
      fi
    elif [[ -e ${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user/$SERVICE ]]; then
      die "cannot reach your systemd user manager to check the old user unit $SERVICE; run from a login session of $(id -un)"
    fi
  elif state=$(unit_state); then
    read -r system_active system_enabled <<<"$state"
    if is_running "$system_active" || is_enabled "$system_enabled"; then
      die "the system unit $SERVICE is $system_active and $system_enabled; deploy to it (DEPLOY_UNIT_SCOPE=system), or stop and disable it first"
    fi
  fi
fi

export NODE_ENV=production
db_line=$(node --import tsx scripts/check-prod-env.ts) ||
  die "fix the production settings (.env.production.local) and run again"
DATABASE_URL=${db_line#DATABASE_URL=}
export DATABASE_URL
echo "Settings: valid for production"

# Exits 1 when migrations are pending. Caught with ||: `set +e` would not
# stop the ERR trap, which fires on any failing command that is not tested.
migrate_code=0
migrate_status=$(pnpm exec prisma migrate status 2>&1) || migrate_code=$?
if ((migrate_code == 0)); then
  MIGRATE=false
  echo "Database: up to date"
elif grep -q 'have not yet been applied' <<<"$migrate_status" &&
  ! grep -qiE 'failed|drift|error' <<<"$migrate_status"; then
  MIGRATE=true
  echo "Database: migrations to apply:"
  sed -n '/have not yet been applied/,/^$/p' <<<"$migrate_status" | sed '1d;/^$/d;s/^/  /'
else
  printf '%s\n' "$migrate_status" >&2
  die "prisma migrate status reported a problem; nothing was changed"
fi

# The Prisma client lives in node_modules, outside the bundle, shared with
# the running server. A schema change needs `prisma generate`, which must not
# run before the migration (a restart of the old server would load it), so it
# cannot happen in this script's no-downtime build. The copy Prisma keeps is
# reformatted: compare with whitespace collapsed.
generated_schema=$(node -e '
  const path = require("node:path");
  const client = path.dirname(require.resolve("@prisma/client/package.json"));
  const generated = require.resolve(".prisma/client/default.js", { paths: [client] });
  console.log(path.join(path.dirname(generated), "schema.prisma"));
') || die "cannot find the generated Prisma client"
if ! cmp -s <(tr -s '[:space:]' ' ' <"$generated_schema") \
  <(tr -s '[:space:]' ' ' <prisma/schema.prisma); then
  die "prisma/schema.prisma differs from the generated Prisma client; follow \"Schema change\" in docs/OPERATIONS.md"
fi
echo "Prisma client: matches prisma/schema.prisma"

# Same reason for dependencies: `pnpm install` rewrites the node_modules the
# running server uses. pnpm keeps a copy of the lockfile it installed; that
# copy leaves out other platforms' packages, so compare the direct
# dependencies (`importers`) only.
lock_section() { awk -v name="$1:" '/^[a-z]/ { inside = ($0 == name) } inside' "$2"; }
installed_lock=node_modules/.pnpm/lock.yaml
[[ -f $installed_lock ]] || die "$installed_lock is missing; was node_modules installed with pnpm?"
if ! cmp -s <(lock_section importers "$installed_lock") <(lock_section importers pnpm-lock.yaml); then
  die "dependencies in pnpm-lock.yaml differ from node_modules; follow \"Schema change\" in docs/OPERATIONS.md"
fi
echo "Dependencies: node_modules matches pnpm-lock.yaml"

# ---------------------------------------------------------------------------
step "Build into $STAGING (the running server keeps $LIVE)"
for dir in "$STAGING" "$PREVIOUS"; do
  if [[ -L $dir ]]; then die "$dir is a symlink"; fi
done
# The bundle before the live one: no rollback target once a new build exists.
rm -rf -- "$STAGING" "$PREVIOUS"

disk=$(df -Pm . | awk 'NR == 2 { print $4 }')
((disk >= MIN_DISK_MB)) ||
  die "only ${disk} MB free on disk, need ${MIN_DISK_MB}; uploads also need room"

for file in tsconfig.json next-env.d.ts; do
  if [[ -f $file ]]; then cp -p "$file" "$WORK/$file"; fi
done
NEXT_DIST_DIR=$STAGING NODE_OPTIONS=${NODE_OPTIONS:---max-old-space-size=1536} \
  pnpm build
restore_build_files
[[ -f $STAGING/BUILD_ID ]] || die "the build left no $STAGING/BUILD_ID"
echo "Built $(cat "$STAGING/BUILD_ID") ($(du -sh "$STAGING" | cut -f1))"

# ---------------------------------------------------------------------------
step "Boot check of the new bundle on 127.0.0.1:$CHECK_PORT"
if port_in_use "$CHECK_PORT"; then die "port $CHECK_PORT is in use; set DEPLOY_CHECK_PORT"; fi
NEXT_DIST_DIR=$STAGING node "$NEXT_BIN" start --hostname 127.0.0.1 --port "$CHECK_PORT" \
  >"$WORK/check.log" 2>&1 &
CHECK_PID=$!
if ! wait_for_health "$CHECK_PORT" 60 "$CHECK_PID"; then
  tail -n 30 "$WORK/check.log" >&2
  die "the new bundle did not answer $HEALTH_PATH; the live server was not touched"
fi
kill "$CHECK_PID"
wait "$CHECK_PID" 2>/dev/null || true
CHECK_PID=
echo "Boot check passed"

if [[ $BUILD_ONLY == true ]]; then
  step "Done: $STAGING is ready; the live server was not touched"
  exit 0
fi

# ---------------------------------------------------------------------------
step "Switch: $SERVICE is down from here until it answers again"
if [[ $RETIRE_USER_UNIT == true ]]; then backup_user_unit; fi
# What a failure from here on starts again (restore_previous_server). Both
# running is never put back: the system unit wins.
service_active=$(unit_show ActiveState) || die "cannot read the state of $SERVICE"
if is_running "$service_active"; then
  RESTORE_TARGET=unit
elif [[ $RETIRE_USER_UNIT == true ]] && is_running "$USER_ACTIVE"; then
  RESTORE_TARGET=user
fi
stopped_at=$SECONDS
# Fails before anything else changes when sudo refuses: the site stays up.
"${UNIT_CONTROL[@]}" stop "$SERVICE" ||
  die "'${UNIT_CONTROL[*]} stop $SERVICE' failed; see '${UNIT_READ[*]} status $SERVICE'"
# From here on, on_exit puts the previous server back unless the new one
# answers.
SITE_DOWN=true
if [[ $RETIRE_USER_UNIT == true ]]; then retire_user_unit; fi
# Whatever still answers here would keep the new server from binding the
# port, and would pass the health check in its place.
if port_in_use "$PORT"; then
  PORT_BUSY=true
  die "port $PORT still answers with $SERVICE stopped; stop whatever listens there (ss -ltnp), then run again"
fi

if [[ $MIGRATE == true ]]; then
  # After the stop, so the copy holds every write the old server made.
  backup=$(python3 scripts/backup.py --db-only "$BACKUP_DIR") ||
    die "the database backup failed; nothing was migrated"
  backup=${backup#Backup saved: }
  echo "Database backup: $backup"
  pnpm db:migrate || die "migration failed; database backup: $backup"
  MIGRATED=true
fi

# -T: never move a folder into one that is already there.
if [[ -e $LIVE ]]; then
  LIVE_MOVED=true
  mv -T -- "$LIVE" "$PREVIOUS"
fi
STAGED=true
mv -T -- "$STAGING" "$LIVE"
# Optimised images do not depend on the build: keep them (a 45 MP photo takes
# seconds to resize). `next dev` kept its cache under .next/dev.
for cache in "$PREVIOUS/cache/images" "$PREVIOUS/dev/cache/images"; do
  if [[ -d $cache && ! -e $LIVE/cache/images ]]; then
    CACHE_MOVED_FROM=$cache
    mkdir -p "$LIVE/cache"
    mv -T -- "$cache" "$LIVE/cache/images"
  fi
done

SERVICE_STARTED=true
"${UNIT_CONTROL[@]}" start "$SERVICE" ||
  die "'${UNIT_CONTROL[*]} start $SERVICE' failed"
if ! wait_for_health "$PORT" 90 || ! "${UNIT_READ[@]}" is-active --quiet "$SERVICE"; then
  "${UNIT_JOURNAL[@]}" -u "$SERVICE" -n 40 --no-pager >&2 || true
  if [[ $SCOPE == system ]]; then
    # systemd's own lines about the unit (exit status, OOM kill) are in the
    # system journal, which needs sudo; these properties hold the same.
    systemctl show -p ActiveState -p Result -p ExecMainStatus -p NRestarts "$SERVICE" >&2 || true
  fi
  die "$SERVICE did not answer $HEALTH_PATH on port $PORT within 90 s"
fi
SITE_DOWN=false

step "Live: $(cat "$LIVE/BUILD_ID") answered after $((SECONDS - stopped_at)) s"
if [[ $SCOPE == system ]]; then
  main_pid=$(unit_show MainPID)
  echo "OOM score adjustment of PID $main_pid: $(cat "/proc/$main_pid/oom_score_adj" 2>/dev/null || echo unknown)"
  if ! system_unit_enabled; then
    printf '\nNOTE: %s is not enabled, so it will not start after a reboot. Run once:\n  sudo systemctl enable %s\n' \
      "$SERVICE" "$SERVICE"
  fi
fi
if [[ -d $PREVIOUS ]]; then
  echo "The previous bundle stays in $PREVIOUS ($(du -sh "$PREVIOUS" | cut -f1)) until the next deploy."
fi
