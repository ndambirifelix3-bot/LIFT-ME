#!/usr/bin/env bash
# Runs the database tests on a throwaway local Postgres + PostGIS.
# Usage: npm run test:db   (needs Postgres 16 + PostGIS installed locally)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DATA="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
RUNAS=""
if [ "$(id -u)" = "0" ]; then chown -R postgres "$DATA"; RUNAS="sudo -u postgres"; fi
cleanup() { $RUNAS "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT
$RUNAS "$PGBIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null
$RUNAS "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/log" start >/dev/null
PSQL=(psql -h /tmp -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$HERE/local_shim.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "migrate: $(basename "$f")"
  "${PSQL[@]}" -f "$f" >/dev/null
done
"${PSQL[@]}" -f "$HERE/rls_and_rides.test.sql" >/dev/null
"${PSQL[@]}" -f "$HERE/markets.test.sql" >/dev/null
"${PSQL[@]}" -f "$HERE/push.test.sql" >/dev/null
bash "$HERE/concurrent_accept.test.sh" "$PORT"
echo "ALL DATABASE TESTS PASSED"
