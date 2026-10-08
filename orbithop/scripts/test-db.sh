#!/usr/bin/env bash
# Applies every migration to a throwaway PostgreSQL and runs supabase/tests/*.test.sql.
# Needs PostgreSQL 15+ binaries (e.g. `brew install postgresql@17`).
set -euo pipefail
cd "$(dirname "$0")/.."

PG_BIN="${PG_BIN:-$( (brew --prefix postgresql@17 2>/dev/null || echo /usr) )/bin}"
DIR="$(mktemp -d)"
PORT="${PORT:-54329}"

cleanup() {
  "$PG_BIN/pg_ctl" -D "$DIR/data" stop -m fast >/dev/null 2>&1 || true
  rm -rf "$DIR"
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$DIR/data" -U postgres -A trust --no-locale -E UTF8 >/dev/null
"$PG_BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null

psql() { "$PG_BIN/psql" -h "$DIR" -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1 "$@"; }

psql -d postgres -c 'create database test' >/dev/null
psql -d test -f supabase/tests/supabase_shim.sql >/dev/null
for f in supabase/migrations/*.sql; do
  echo "migrate  $(basename "$f")"
  psql -d test -f "$f" >/dev/null
done
for f in supabase/tests/*.test.sql; do
  echo "test     $(basename "$f")"
  psql -d test -f "$f" >/dev/null
done
echo "Database tests passed."
