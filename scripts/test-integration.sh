#!/usr/bin/env bash

set -euo pipefail

export SUPABASE_TELEMETRY_DISABLED=1

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker debe estar instalado y en ejecución para los tests de integración de Supabase." >&2
  exit 1
fi

repo_root="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/el-silbador-integration.XXXXXX")"
test_project_id="el_silbador_integration_${RANDOM}_${RANDOM}"
# The shared development stack uses 54320–54329. Give each test run its own project and port
# range, so resetting migrations cannot affect the songs someone is editing locally.
test_api_port=$((40000 + RANDOM % 20000))

cleanup() {
  # `--project-id` makes this target independent of the caller's checkout. It can only match the
  # random project created above, never the shared `silabeo` development stack.
  npx supabase stop --project-id "$test_project_id" --no-backup || true
  rm -rf "$test_root"
}
trap cleanup EXIT

cp -R "$repo_root/supabase" "$test_root/supabase"
perl -0pi -e "
  s/project_id = \"[^\"]+\"/project_id = \"$test_project_id\"/;
  s/port = 54320/port = $((test_api_port - 1))/;
  s/port = 54321/port = $test_api_port/;
  s/port = 54322/port = $((test_api_port + 1))/;
  s/port = 54323/port = $((test_api_port + 2))/;
  s/port = 54324/port = $((test_api_port + 3))/;
  s/port = 54327/port = $((test_api_port + 6))/;
  s/port = 54329/port = $((test_api_port + 8))/;
" "$test_root/supabase/config.toml"

npx supabase start --workdir "$test_root"
npx supabase db reset --workdir "$test_root" --local --no-seed

# `supabase status -o env` is emitted by the isolated test stack. Restrict what is imported to the
# three values this command needs instead of loading any developer .env file.
status_env="$(npx supabase status --workdir "$test_root" -o env)"
read_status_value() {
  printf '%s\n' "$status_env" | awk -F= -v key="$1" '
    $1 == key {
      value = substr($0, index($0, "=") + 1)
      gsub(/^"|"$/, "", value)
      print value
      exit
    }
  '
}

api_url="$(read_status_value API_URL)"
anon_key="$(read_status_value ANON_KEY)"
service_role_key="$(read_status_value SERVICE_ROLE_KEY)"

if [[ -z "$api_url" || -z "$anon_key" || -z "$service_role_key" ]]; then
  echo "No se pudieron obtener las credenciales de Supabase local." >&2
  exit 1
fi

NEXT_PUBLIC_SUPABASE_URL="$api_url" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon_key" \
SUPABASE_TEST_SERVICE_ROLE_KEY="$service_role_key" \
npm run test:integration:run
