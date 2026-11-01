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
# Settings (environment, all optional):
#   DEPLOY_SERVICE        systemd user unit to switch     happy-wedding.service
#   DEPLOY_PORT           port that unit listens on       3200
#   DEPLOY_CHECK_PORT     spare port for the boot check   3290 (E2E uses 3201)
#   DEPLOY_BACKUP_DIR     database backups                <checkout>-backups, beside the checkout
#   DEPLOY_MIN_MEMORY_MB  "available" memory to build     1800
#   DEPLOY_MIN_DISK_MB    free disk to build              400
set -Eeuo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
cd "$ROOT"

SERVICE=${DEPLOY_SERVICE:-happy-wedding.service}
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

WORK=$(mktemp -d)
CHECK_PID=
SITE_DOWN=false

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

on_exit() {
  local code=$?
  if [[ -n $CHECK_PID ]]; then
    kill "$CHECK_PID" 2>/dev/null || true
    wait "$CHECK_PID" 2>/dev/null || true
  fi
  restore_build_files
  rm -rf -- "$WORK"
  if [[ $code -ne 0 && $SITE_DOWN == true ]]; then
    printf '\nThe site is DOWN: %s is stopped. See "Rollback" in docs/OPERATIONS.md.\n' \
      "$SERVICE" >&2
  fi
}
trap on_exit EXIT
trap 'die "command failed at line $LINENO"' ERR

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
  unit_dir=$(systemctl --user show -p WorkingDirectory --value "$SERVICE") ||
    die "cannot read $SERVICE"
  [[ $unit_dir == "$ROOT" ]] ||
    die "$SERVICE runs from '$unit_dir', not $ROOT"
  # Read whole, then matched (grep -q would cut a pipe short under
  # pipefail); never printed, as the unit could hold settings.
  unit_exec=$(systemctl --user show -p ExecStart --value "$SERVICE")
  unit_env=$(systemctl --user show -p Environment --value "$SERVICE")
  grep -q 'bin/next start ' <<<"$unit_exec" ||
    die "$SERVICE does not run 'next start'; install the unit from docs/OPERATIONS.md first"
  grep -qw 'NODE_ENV=production' <<<"$unit_env" ||
    die "$SERVICE does not set NODE_ENV=production"
fi

export NODE_ENV=production
db_line=$(node --import tsx scripts/check-prod-env.ts) ||
  die "fix the production settings (.env.production.local) and run again"
DATABASE_URL=${db_line#DATABASE_URL=}
export DATABASE_URL
echo "Settings: valid for production"

set +e
migrate_status=$(pnpm exec prisma migrate status 2>&1)
migrate_code=$?
set -e
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
stopped_at=$SECONDS
systemctl --user stop "$SERVICE"
SITE_DOWN=true

backup=
if [[ $MIGRATE == true ]]; then
  # After the stop, so the copy holds every write the old server made.
  backup=$(python3 scripts/backup.py --db-only "$BACKUP_DIR")
  backup=${backup#Backup saved: }
  echo "Database backup: $backup"
  if ! pnpm db:migrate; then
    if [[ -f $LIVE/BUILD_ID ]]; then
      systemctl --user start "$SERVICE"
      SITE_DOWN=false
      die "migration failed; the previous bundle was started again. Backup: $backup"
    fi
    die "migration failed and $LIVE is not a production build. Backup: $backup"
  fi
fi

if [[ -e $LIVE ]]; then mv -- "$LIVE" "$PREVIOUS"; fi
mv -- "$STAGING" "$LIVE"
# Optimised images do not depend on the build: keep them (a 45 MP photo takes
# seconds to resize). `next dev` kept its cache under .next/dev.
for cache in "$PREVIOUS/cache/images" "$PREVIOUS/dev/cache/images"; do
  if [[ -d $cache && ! -e $LIVE/cache/images ]]; then
    mkdir -p "$LIVE/cache"
    mv -- "$cache" "$LIVE/cache/images"
  fi
done

systemctl --user start "$SERVICE"
if ! wait_for_health "$PORT" 90; then
  journalctl --user -u "$SERVICE" -n 40 --no-pager >&2 || true
  printf '\nRoll back (docs/OPERATIONS.md, "Rollback"):\n' >&2
  printf '  systemctl --user stop %s\n' "$SERVICE" >&2
  printf '  cd %s && mv %s .next-failed && mv %s %s\n' "$ROOT" "$LIVE" "$PREVIOUS" "$LIVE" >&2
  if [[ -n $backup ]]; then
    printf '  restore the database from %s (the old code expects the old schema)\n' "$backup" >&2
  fi
  printf '  systemctl --user start %s\n' "$SERVICE" >&2
  die "$SERVICE did not answer $HEALTH_PATH on port $PORT within 90 s"
fi
SITE_DOWN=false

step "Live: $(cat "$LIVE/BUILD_ID") answered after $((SECONDS - stopped_at)) s"
if [[ -d $PREVIOUS ]]; then
  echo "The previous bundle stays in $PREVIOUS ($(du -sh "$PREVIOUS" | cut -f1)) until the next deploy."
fi
