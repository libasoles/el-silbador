#!/usr/bin/env bash

set -euo pipefail

export SUPABASE_TELEMETRY_DISABLED=1

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker debe estar instalado y en ejecución para los tests de integración de Supabase." >&2
  exit 1
fi

npx supabase start
npx supabase db reset --local --no-seed

# `supabase status -o env` is emitted by our local CLI, after the stack is running. Restrict what
# is imported to the three values this command needs instead of loading any developer .env file.
status_env="$(npx supabase status -o env)"
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
