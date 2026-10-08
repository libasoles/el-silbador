#!/usr/bin/env bash

# Builds El Silbador against a temporary Supabase stack loaded with one public song, serves the
# production build and audits it with Lighthouse CI. Thresholds live in lighthouserc.json; the run
# fails when any page drops below them. Reports are written to .lighthouseci/.

set -euo pipefail

export SUPABASE_TELEMETRY_DISABLED=1

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker debe estar instalado y en ejecución para la auditoría de Lighthouse." >&2
  exit 1
fi

repo_root="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
stack_root="$(mktemp -d "${TMPDIR:-/tmp}/el-silbador-lighthouse.XXXXXX")"
stack_project_id="el_silbador_lighthouse_${RANDOM}_${RANDOM}"
# The shared development stack uses 54320–54329. Give each run its own project and port range, so
# seeding the fixture can never touch the songs someone is editing locally.
stack_api_port=$((40000 + RANDOM % 20000))

cleanup() {
  # `--project-id` can only match the random project created above, never the shared stack.
  npx supabase stop --project-id "$stack_project_id" --no-backup || true
  rm -rf "$stack_root"
}
trap cleanup EXIT

cp -R "$repo_root/supabase" "$stack_root/supabase"
# The copy's seed is the Lighthouse fixture, so `db reset` below loads it into this stack only.
cp "$repo_root/supabase/lighthouse/seed.sql" "$stack_root/supabase/seed.sql"
perl -0pi -e "
  s/project_id = \"[^\"]+\"/project_id = \"$stack_project_id\"/;
  s/port = 54320/port = $((stack_api_port - 1))/;
  s/port = 54321/port = $stack_api_port/;
  s/port = 54322/port = $((stack_api_port + 1))/;
  s/port = 54323/port = $((stack_api_port + 2))/;
  s/port = 54324/port = $((stack_api_port + 3))/;
  s/port = 54327/port = $((stack_api_port + 6))/;
  s/port = 54329/port = $((stack_api_port + 8))/;
" "$stack_root/supabase/config.toml"

# The pages only read songs through PostgREST (behind Kong) and check the session through GoTrue.
npx supabase start --workdir "$stack_root" \
  -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
npx supabase db reset --workdir "$stack_root" --local

status_env="$(npx supabase status --workdir "$stack_root" -o env)"
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

if [[ -z "$api_url" || -z "$anon_key" ]]; then
  echo "No se pudieron obtener las credenciales de Supabase local." >&2
  exit 1
fi

# Explicit values win over any .env.local, so the build reads the temporary stack. Analytics stays
# off: the audit measures El Silbador, not the third-party tag.
export NEXT_PUBLIC_SUPABASE_URL="$api_url"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$anon_key"
export NEXT_PUBLIC_GA_MEASUREMENT_ID=""

cd "$repo_root"
npm run build
npx lhci autorun
