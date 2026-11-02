#!/usr/bin/env bash
# Dry run of scripts/deploy-prod.sh. Runs a copy of it in a throwaway folder,
# with stub systemctl, sudo, journalctl, node, pnpm, curl, python3, free, df,
# pgrep and git first on PATH, through the scenarios below, and checks what it
# did. Nothing real is touched: no unit, no sudo, no port, no build, and not
# this checkout (the copy only sees the throwaway folder). The unit is called
# dry-run-happy-wedding.service, which exists on no machine, and the stubs
# refuse any other unit.
#
#   scripts/deploy-prod-dry-run.sh          every scenario; exit 1 if one fails
#   KEEP=1 scripts/deploy-prod-dry-run.sh   also keep the throwaway folder
#
# Run it after changing scripts/deploy-prod.sh (docs/OPERATIONS.md).
set -Eeuo pipefail

HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
SERVICE=dry-run-happy-wedding.service
PORT=39200
CHECK_PORT=39290
BASE=$(mktemp -d "${TMPDIR:-/tmp}/deploy-dry-run.XXXXXX")
BASE=$(cd -- "$BASE" && pwd -P)
BIN=$BASE/bin
FAILED=0

cleanup() {
  if [[ ${KEEP:-} == 1 || $FAILED -ne 0 ]]; then
    echo "Throwaway folder kept: $BASE"
  else
    rm -rf -- "$BASE"
  fi
}
trap cleanup EXIT

# --- Stubs ------------------------------------------------------------------
# State lives in $DRY_STATE: one file per unit property (system.ActiveState,
# user.UnitFileState, ...), port.<n> while something answers on port n, and
# calls.log. Anything the real deploy must never do lands in violations.
mkdir -p "$BIN"

cat >"$BIN/systemctl" <<'EOF'
#!/usr/bin/env bash
set -uo pipefail
S=$DRY_STATE
scope=system
if [[ ${1:-} == --user ]]; then scope=user; shift; fi
via=
if [[ -n ${DRY_VIA_SUDO:-} ]]; then via=' (sudo)'; fi
printf '%s%s: systemctl %s\n' "$scope" "$via" "$*" >>"$S/calls.log"
violation() { printf 'VIOLATION: %s\n' "$*" | tee -a "$S/violations" >&2; exit 1; }
get() { if [[ -f $S/$1 ]]; then cat "$S/$1"; else printf '%s' "${2-}"; fi; }
put() { printf '%s' "$2" >"$S/$1"; }
(($# >= 2)) || violation "systemctl $*: no unit"
cmd=$1
shift
unit=${!#}
[[ $unit == "$DRY_SERVICE" ]] || violation "systemctl touched the unit '$unit'"
if [[ $scope == user && $(get user.Reachable yes) != yes ]]; then
  echo "Failed to connect to bus: No medium found" >&2
  exit 1
fi
case $cmd in
  show)
    props=()
    value=false
    while (($#)); do
      case $1 in
        -p) props+=("$2"); shift 2 ;;
        --value) value=true; shift ;;
        *) shift ;;
      esac
    done
    for p in "${props[@]}"; do
      case $p in
        ExecStart)
          argv=$(get "$scope.Exec")
          v=
          if [[ -n $argv ]]; then
            v="{ path=${argv%% *} ; argv[]=$argv ; ignore_errors=no ; start_time=[n/a] ; stop_time=[n/a] ; pid=0 ; code=(null) ; status=0/0 }"
          fi
          ;;
        FragmentPath)
          v=
          if [[ $scope == user && -f $HOME/.config/systemd/user/$unit ]]; then
            v=$HOME/.config/systemd/user/$unit
          fi
          ;;
        *) v=$(get "$scope.$p") ;;
      esac
      if [[ $value == true ]]; then printf '%s\n' "$v"; else printf '%s=%s\n' "$p" "$v"; fi
    done
    ;;
  is-active)
    [[ $(get "$scope.ActiveState") == active ]] || exit 3
    ;;
  start | stop | restart | enable | disable)
    if [[ $scope == system && -z ${DRY_VIA_SUDO:-} ]]; then
      echo "Failed to $cmd $unit: Interactive authentication required." >&2
      violation "system unit $cmd without sudo"
    fi
    if [[ $(get "$scope.LoadState") != loaded ]]; then
      echo "Failed to $cmd $unit: Unit $unit not found." >&2
      exit 5
    fi
    case $cmd in
      stop | restart)
        put "$scope.ActiveState" inactive
        if [[ $(get "port.$DRY_PORT") == "$scope" ]]; then rm -f -- "$S/port.$DRY_PORT"; fi
        ;;
    esac
    case $cmd in
      start | restart)
        if [[ -f $S/port.$DRY_PORT ]]; then
          violation "$scope unit started while the $(get "port.$DRY_PORT") unit holds port $DRY_PORT"
        fi
        put "$scope.ActiveState" "$(get "$scope.StartState" active)"
        if [[ $(get "$scope.StartHealthy" yes) == yes ]]; then put "port.$DRY_PORT" "$scope"; fi
        if [[ $(get system.ActiveState) == active && $(get user.ActiveState) == active ]]; then
          violation "both units run"
        fi
        ;;
      enable)
        put "$scope.UnitFileState" enabled
        if [[ $(get system.UnitFileState) == enabled && $(get user.UnitFileState) == enabled ]]; then
          violation "both units enabled"
        fi
        ;;
      disable) put "$scope.UnitFileState" disabled ;;
    esac
    ;;
  *) violation "systemctl $cmd is not used by the deploy" ;;
esac
EOF

# Allows exactly what ops/sudoers-happy-wedding allows, and only with -n:
# listed actions in sudo.list (sudo -n -l), runnable ones in sudo.run.
cat >"$BIN/sudo" <<'EOF'
#!/usr/bin/env bash
S=$DRY_STATE
printf 'sudo %s\n' "$*" >>"$S/calls.log"
violation() { printf 'VIOLATION: %s\n' "$*" | tee -a "$S/violations" >&2; exit 1; }
[[ ${1:-} == -n ]] || violation "sudo without -n: $*"
shift
list=false
if [[ ${1:-} == -l ]]; then list=true; shift; fi
if [[ $# -ne 3 || $1 != systemctl || ! $2 =~ ^(start|stop|restart)$ || $3 != "$DRY_SERVICE" ]]; then
  violation "sudo outside the sudoers rule: $*"
fi
if [[ $list == true ]]; then
  if grep -qx "$2" "$S/sudo.list" 2>/dev/null; then
    echo "/usr/bin/systemctl $2 $3"
    exit 0
  fi
  echo "sudo: a password is required" >&2
  exit 1
fi
if ! grep -qx "$2" "$S/sudo.run" 2>/dev/null; then
  echo "sudo: a password is required" >&2
  exit 1
fi
DRY_VIA_SUDO=1 exec systemctl "$2" "$3"
EOF

cat >"$BIN/journalctl" <<'EOF'
#!/usr/bin/env bash
printf 'journalctl %s\n' "$*" >>"$DRY_STATE/calls.log"
echo "-- dry-run journal: $* --"
EOF

cat >"$BIN/node" <<'EOF'
#!/usr/bin/env bash
S=$DRY_STATE
printf 'node %s\n' "${1:-}${2:+ $2}${3:+ $3}" >>"$S/calls.log"
case ${1:-} in
  --import) echo "DATABASE_URL=file:./dry-run.db" ;;
  -e) echo "$DRY_ROOT/generated/schema.prisma" ;;
  node_modules/next/dist/bin/next)
    [[ ${2:-} == start && -f ${NEXT_DIST_DIR:-.next}/BUILD_ID ]] || exit 1
    args="$*"
    port=${args##*--port }
    port=${port%% *}
    [[ $port =~ ^[0-9]+$ ]] || exit 1
    echo check >"$S/port.$port"
    trap 'rm -f -- "$S/port.$port"; exit 0' TERM INT
    while :; do sleep 0.1; done
    ;;
  *)
    printf 'VIOLATION: node %s\n' "$*" >>"$S/violations"
    exit 1
    ;;
esac
EOF

cat >"$BIN/pnpm" <<'EOF'
#!/usr/bin/env bash
S=$DRY_STATE
printf 'pnpm %s\n' "$*" >>"$S/calls.log"
case "$*" in
  "exec prisma migrate status")
    if [[ -f $S/migrate.pending ]]; then
      printf 'Following migration have not yet been applied:\n20261102000000_dry_run\n\nTo apply migrations run prisma migrate deploy.\n'
      exit 1
    fi
    echo "Database schema is up to date!"
    ;;
  build)
    [[ -n ${NEXT_DIST_DIR:-} ]] || exit 1
    mkdir -p -- "$NEXT_DIST_DIR"
    echo dry-run-build >"$NEXT_DIST_DIR/BUILD_ID"
    echo '// changed by next build' >>tsconfig.json
    ;;
  db:migrate)
    if [[ -f $S/migrate.fails ]]; then
      echo "Error: P3018 dry-run migration failed" >&2
      exit 1
    fi
    ;;
  *)
    printf 'VIOLATION: pnpm %s\n' "$*" >>"$S/violations"
    exit 1
    ;;
esac
EOF

cat >"$BIN/curl" <<'EOF'
#!/usr/bin/env bash
url=${!#}
port=${url#http://127.0.0.1:}
port=${port%%/*}
if [[ -f $DRY_STATE/port.$port ]]; then printf 200; else printf 000; exit 7; fi
EOF

cat >"$BIN/python3" <<'EOF'
#!/usr/bin/env bash
printf 'python3 %s\n' "$*" >>"$DRY_STATE/calls.log"
[[ ${1:-} == scripts/backup.py && ${2:-} == --db-only && -n ${3:-} ]] || exit 1
mkdir -p -- "$3"
: >"$3/dry-run-db.sqlite"
echo "Backup saved: $3/dry-run-db.sqlite"
EOF

cat >"$BIN/free" <<'EOF'
#!/usr/bin/env bash
echo "               total        used        free      shared  buff/cache   available"
echo "Mem:            6000        2000        1000          10        3000        4000"
EOF

cat >"$BIN/df" <<'EOF'
#!/usr/bin/env bash
echo "Filesystem     1048576-blocks  Used Available Capacity Mounted on"
echo "/dev/dry-run           100000 10000     90000      10% /"
EOF

printf '#!/usr/bin/env bash\nexit 1\n' >"$BIN/pgrep"

cat >"$BIN/git" <<'EOF'
#!/usr/bin/env bash
if [[ ${1:-} == log ]]; then echo "0000000 dry run"; fi
EOF

chmod +x "$BIN"/*

for tool in systemctl sudo journalctl node pnpm curl; do
  found=$(PATH="$BIN:/usr/bin:/bin" command -v "$tool")
  [[ $found == "$BIN/$tool" ]] || {
    echo "the $tool stub does not come first on PATH ($found)" >&2
    exit 1
  }
done

# --- Scenario helpers -------------------------------------------------------
setup() {
  NAME=$1
  DIR=$BASE/$NAME
  ROOT=$DIR/root
  STATE=$DIR/state
  HOME_DIR=$DIR/home
  OUT=$DIR/output.txt
  mkdir -p "$ROOT/scripts" "$ROOT/prisma" "$ROOT/generated" \
    "$ROOT/node_modules/next/dist/bin" "$ROOT/node_modules/.pnpm" \
    "$STATE" "$HOME_DIR/.config/systemd/user" "$DIR/tmp"
  cp -p "$HERE/deploy-prod.sh" "$ROOT/scripts/"
  : >"$ROOT/node_modules/next/dist/bin/next"
  echo 'model Wedding { id String @id }' >"$ROOT/prisma/schema.prisma"
  printf 'model Wedding {\n  id String @id\n}\n' >"$ROOT/generated/schema.prisma"
  printf 'lockfileVersion: 9.0\nimporters:\n  .:\n    dependencies:\n      next: 16.0.0\npackages:\n  a: {}\n' >"$ROOT/pnpm-lock.yaml"
  printf 'lockfileVersion: 9.0\nimporters:\n  .:\n    dependencies:\n      next: 16.0.0\npackages:\n  b: {}\n' >"$ROOT/node_modules/.pnpm/lock.yaml"
  echo '{ "compilerOptions": {} }' >"$ROOT/tsconfig.json"
  echo '/// <reference types="next" />' >"$ROOT/next-env.d.ts"
  echo "[Service]" >"$HOME_DIR/.config/systemd/user/$SERVICE"
  : >"$STATE/calls.log"
  printf 'stop\nstart\nrestart\n' >"$STATE/sudo.list"
  cp "$STATE/sudo.list" "$STATE/sudo.run"
  SCENARIO_FAILED=0
  printf '\n%s\n' "$2"
}

# unit SCOPE LoadState ActiveState UnitFileState [next-command [NODE_ENV]]
unit() {
  local scope=$1
  printf '%s' "$2" >"$STATE/$scope.LoadState"
  printf '%s' "$3" >"$STATE/$scope.ActiveState"
  printf '%s' "$4" >"$STATE/$scope.UnitFileState"
  printf '%s' "$ROOT" >"$STATE/$scope.WorkingDirectory"
  printf '/opt/node/bin/node %s/node_modules/next/dist/bin/next %s --hostname 127.0.0.1 --port %s' \
    "$ROOT" "${5:-start}" "$PORT" >"$STATE/$scope.Exec"
  printf 'NODE_ENV=%s PATH=/opt/node/bin:/usr/bin:/bin' "${6:-production}" >"$STATE/$scope.Environment"
  if [[ $scope == system ]]; then id -un | tr -d '\n' >"$STATE/system.User"; fi
  printf '4242' >"$STATE/$scope.MainPID"
  if [[ $3 == active ]]; then printf '%s' "$scope" >"$STATE/port.$PORT"; fi
}
no_system_unit() {
  printf 'not-found' >"$STATE/system.LoadState"
  printf 'inactive' >"$STATE/system.ActiveState"
}
dev_bundle() {
  mkdir -p "$ROOT/.next/dev/cache/images"
  echo image >"$ROOT/.next/dev/cache/images/a.webp"
}
production_bundle() {
  mkdir -p "$ROOT/.next/cache/images"
  echo old-build >"$ROOT/.next/BUILD_ID"
  echo image >"$ROOT/.next/cache/images/a.webp"
}

run_deploy() {
  set +e
  env -i HOME="$HOME_DIR" USER="$(id -un)" LOGNAME="$(id -un)" LANG=C.UTF-8 \
    PATH="$BIN:/usr/bin:/bin" TMPDIR="$DIR/tmp" \
    DRY_STATE="$STATE" DRY_ROOT="$ROOT" DRY_SERVICE="$SERVICE" DRY_PORT="$PORT" \
    DEPLOY_SERVICE="$SERVICE" DEPLOY_PORT="$PORT" DEPLOY_CHECK_PORT="$CHECK_PORT" \
    "$@" bash "$ROOT/scripts/deploy-prod.sh" >"$OUT" 2>&1
  CODE=$?
  set -e
}

check() {
  local what=$1
  shift
  if "$@"; then
    printf '  ok    %s\n' "$what"
  else
    printf '  FAIL  %s\n' "$what"
    FAILED=1
    SCENARIO_FAILED=1
  fi
}
finish() {
  check "the stubs saw nothing the deploy must never do" test ! -s "$STATE/violations"
  if [[ $SCENARIO_FAILED -ne 0 ]]; then
    echo "  --- output (exit $CODE) ---"
    sed 's/^/  | /' "$OUT"
    echo "  --- calls ---"
    sed 's/^/  | /' "$STATE/calls.log"
    if [[ -s $STATE/violations ]]; then sed 's/^/  | /' "$STATE/violations"; fi
  fi
}
exit_is() { [[ $CODE == "$1" ]]; }
out_has() { grep -qF -- "$1" "$OUT"; }
out_lacks() { ! grep -qF -- "$1" "$OUT"; }
called() { grep -qE -- "$1" "$STATE/calls.log"; }
not_called() { ! grep -qE -- "$1" "$STATE/calls.log"; }
state_is() { [[ $(cat "$STATE/$1" 2>/dev/null) == "$2" ]]; }
# Start, stop, enable and disable calls that reached a unit, in order.
controls_are() {
  local actual
  actual=$(grep -E ': systemctl (start|stop|restart|enable|disable) ' "$STATE/calls.log" |
    sed "s/ $SERVICE\$//" | paste -sd ',' - || true)
  [[ $actual == "$1" ]] || {
    echo "    unit calls: ${actual:-none}"
    return 1
  }
}
# The sudo -n -l questions come before the build.
asked_sudo_before_build() {
  local list build
  list=$(grep -n "^sudo -n -l systemctl start $SERVICE\$" "$STATE/calls.log" | cut -d: -f1)
  build=$(grep -n '^pnpm build$' "$STATE/calls.log" | cut -d: -f1)
  [[ -n $list && -n $build && $list -lt $build ]] &&
    grep -q "^sudo -n -l systemctl stop $SERVICE\$" "$STATE/calls.log"
}
build_files_restored() { [[ $(cat "$ROOT/tsconfig.json") == '{ "compilerOptions": {} }' ]]; }
live_is_new_build() { [[ $(cat "$ROOT/.next/BUILD_ID" 2>/dev/null) == dry-run-build ]]; }

# --- Scenarios --------------------------------------------------------------
setup user-path "1. User unit path (auto: no /etc/systemd/system/$SERVICE), regular deploy"
production_bundle
unit user loaded active enabled
no_system_unit
run_deploy
check "exits 0" exit_is 0
check "picks the user unit" out_has "Unit: $SERVICE (user unit)"
check "never calls sudo" not_called '^sudo'
check "stops then starts the user unit" controls_are "user: systemctl stop,user: systemctl start"
check "new bundle in .next, old one in .next-prev" \
  eval '[[ $(cat "$ROOT/.next/BUILD_ID") == dry-run-build && $(cat "$ROOT/.next-prev/BUILD_ID") == old-build ]]'
check "keeps the optimised image cache" test -f "$ROOT/.next/cache/images/a.webp"
check "puts tsconfig.json back after the build" build_files_restored
check "user unit runs again" state_is user.ActiveState active
finish

setup system-first-switch "2. System unit, first switch from the next dev user unit"
dev_bundle
unit system loaded inactive disabled
unit user loaded active enabled dev development
run_deploy DEPLOY_UNIT_SCOPE=system
check "exits 0" exit_is 0
check "picks the system unit" out_has "Unit: $SERVICE (system unit)"
check "asks sudo -n -l for stop and start before building" asked_sudo_before_build
check "stops the system unit, retires the user unit, then starts the system unit" \
  controls_are "system (sudo): systemctl stop,user: systemctl stop,user: systemctl disable,system (sudo): systemctl start"
check "controls the system unit only through sudo -n" called "^sudo -n systemctl start $SERVICE\$"
check "saves the user unit file first" eval 'compgen -G "$DIR/root-backups/$SERVICE.user.*" >/dev/null'
check "leaves the user unit file in place" test -f "$HOME_DIR/.config/systemd/user/$SERVICE"
check "user unit ends stopped and disabled" eval 'state_is user.ActiveState inactive && state_is user.UnitFileState disabled'
check "system unit serves the port" eval 'state_is system.ActiveState active && state_is port.$PORT system'
check "new bundle live, dev .next kept in .next-prev" eval 'live_is_new_build && test -d "$ROOT/.next-prev/dev"'
check "moves the dev image cache to the new bundle" test -f "$ROOT/.next/cache/images/a.webp"
check "reminds to enable the system unit" out_has "sudo systemctl enable $SERVICE"
check "prints the OOM score adjustment" out_has "OOM score adjustment of PID 4242"
finish

setup system-first-switch-enabled "3. System unit already enabled before the first switch"
dev_bundle
unit system loaded inactive enabled
unit user loaded active enabled dev development
run_deploy DEPLOY_UNIT_SCOPE=system
check "exits 0" exit_is 0
check "user unit ends disabled, so only the system unit is enabled" \
  eval 'state_is user.UnitFileState disabled && state_is system.UnitFileState enabled'
check "no enable reminder" out_lacks "is not enabled"
finish

setup system-sudo-denied "4. System unit without the sudoers file"
dev_bundle
unit system loaded inactive disabled
unit user loaded active enabled dev development
: >"$STATE/sudo.list"
: >"$STATE/sudo.run"
run_deploy DEPLOY_UNIT_SCOPE=system
check "exits 1" exit_is 1
check "says sudo -n is refused" out_has "sudo -n may not run 'systemctl stop $SERVICE' without a password"
check "stops before the build" eval 'not_called "^pnpm build" && test ! -e "$ROOT/.next-staging"'
check "touches no unit" controls_are ""
check "dev server keeps running and enabled" eval 'state_is user.ActiveState active && state_is user.UnitFileState enabled'
check "does not report the site down" out_lacks "The site is DOWN"
finish

setup system-stop-refused "5. sudo -n -l says yes but the stop itself needs a password"
dev_bundle
unit system loaded inactive disabled
unit user loaded active enabled dev development
: >"$STATE/sudo.run"
run_deploy DEPLOY_UNIT_SCOPE=system
check "exits 1" exit_is 1
check "fails at the stop" out_has "'sudo -n systemctl stop $SERVICE' failed"
check "touches no unit" controls_are ""
check "dev server keeps running and enabled" eval 'state_is user.ActiveState active && state_is user.UnitFileState enabled'
check "live .next untouched" eval 'test -d "$ROOT/.next/dev" && test ! -e "$ROOT/.next-prev"'
check "does not report the site down" out_lacks "The site is DOWN"
finish

setup system-regular "6. System unit, regular deploy"
production_bundle
unit system loaded active enabled
unit user loaded inactive disabled dev development
run_deploy DEPLOY_UNIT_SCOPE=system
check "exits 0" exit_is 0
check "stops and starts the system unit through sudo, nothing else" \
  controls_are "system (sudo): systemctl stop,system (sudo): systemctl start"
check "saves no user unit file" test ! -e "$DIR/root-backups"
check "new bundle live, previous in .next-prev" \
  eval 'live_is_new_build && [[ $(cat "$ROOT/.next-prev/BUILD_ID") == old-build ]]'
check "no enable reminder" out_lacks "is not enabled"
finish

setup system-migration "6b. System unit, regular deploy with a pending migration"
production_bundle
unit system loaded active enabled
: >"$STATE/migrate.pending"
run_deploy DEPLOY_UNIT_SCOPE=system
check "exits 0" exit_is 0
check "lists the pending migration" out_has "20261102000000_dry_run"
check "backs up, then migrates, while the unit is stopped" eval '
  [[ $(grep -E "^system \(sudo\): systemctl (stop|start) |^python3 scripts/backup.py|^pnpm db:migrate" "$STATE/calls.log" |
    sed -E "s/ --db-only .*//; s/ $SERVICE\$//" | paste -sd "," -) == \
    "system (sudo): systemctl stop,python3 scripts/backup.py,pnpm db:migrate,system (sudo): systemctl start" ]]'
check "new bundle live" live_is_new_build
finish

setup system-new-server-fails "7. First switch, the new server fails after starting"
dev_bundle
unit system loaded inactive disabled
unit user loaded active enabled dev development
printf 'failed' >"$STATE/system.StartState"
run_deploy DEPLOY_UNIT_SCOPE=system
check "exits 1" exit_is 1
check "shows the journal" called "^journalctl -u $SERVICE -n 40 --no-pager\$"
check "prints the rollback to the user unit" out_has "systemctl --user enable --now $SERVICE"
check "no sudo disable for a unit that is not enabled" out_lacks "sudo systemctl disable"
check "reports the site down and the retired user unit" \
  eval 'out_has "The site is DOWN" && out_has "old user unit was stopped and disabled"'
finish

setup system-migration-fails "8. First switch with a migration that fails"
dev_bundle
unit system loaded inactive disabled
unit user loaded active enabled dev development
: >"$STATE/migrate.pending"
: >"$STATE/migrate.fails"
run_deploy DEPLOY_UNIT_SCOPE=system
check "exits 1" exit_is 1
check "backs up the database first" called "^python3 scripts/backup.py --db-only "
check "puts the user unit back" \
  controls_are "system (sudo): systemctl stop,user: systemctl stop,user: systemctl disable,user: systemctl enable,user: systemctl start"
check "dev server runs and is enabled again" eval 'state_is user.ActiveState active && state_is user.UnitFileState enabled'
check "system unit stays stopped" state_is system.ActiveState inactive
check "says so, without reporting the site down" \
  eval 'out_has "the old user unit is back as it was" && out_lacks "The site is DOWN"'
check "live .next untouched" eval 'test -d "$ROOT/.next/dev" && test ! -e "$ROOT/.next-prev"'
finish

setup user-path-system-enabled "9. User unit path while the system unit is enabled"
production_bundle
unit system loaded inactive enabled
unit user loaded active enabled
run_deploy DEPLOY_UNIT_SCOPE=user
check "exits 1" exit_is 1
check "refuses to deploy to the user unit" out_has "deploy to it (DEPLOY_UNIT_SCOPE=system)"
check "touches no unit and builds nothing" eval 'controls_are "" && not_called "^pnpm build"'
finish

setup system-other-checkout "10. System unit that runs next from another checkout"
production_bundle
unit system loaded active enabled
printf '/opt/node/bin/node /srv/other/node_modules/next/dist/bin/next start --port %s' "$PORT" >"$STATE/system.Exec"
run_deploy DEPLOY_UNIT_SCOPE=system
check "exits 1" exit_is 1
check "names the expected command" out_has "does not run '$ROOT/node_modules/next/dist/bin/next start'"
check "touches no unit and builds nothing" eval 'controls_are "" && not_called "^pnpm build"'
finish

setup system-no-user-manager "11. System unit, user manager unreachable, old user unit file present"
dev_bundle
unit system loaded inactive disabled
unit user loaded active enabled dev development
printf 'no' >"$STATE/user.Reachable"
run_deploy DEPLOY_UNIT_SCOPE=system
check "exits 1" exit_is 1
check "asks for a login session" out_has "cannot reach your systemd user manager"
check "touches no unit and builds nothing" eval 'controls_are "" && not_called "^pnpm build"'
finish

echo
if [[ $FAILED -ne 0 ]]; then
  echo "Dry run: FAILED"
  exit 1
fi
echo "Dry run: all scenarios passed"
