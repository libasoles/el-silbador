#!/usr/bin/env bash
#
# Dumps schema + data of the Supabase database into backups/backup-<timestamp>.sql.
# Extra arguments (e.g. --local) are forwarded to both `supabase db dump` calls.

set -euo pipefail

mkdir -p backups
backup_file="backups/backup-$(date +%Y-%m-%d_%H-%M-%S).sql"

# songs.forked_from references songs.id, so pg_dump warns that a --data-only dump
# may not restore in order. The data section runs with session_replication_role =
# replica, which skips FK checks during restore, so that one warning is filtered
# out; any other stderr output still reaches the terminal.
filter_circular_fk_warning() {
  awk '
    /^pg_dump: warning: there are circular foreign-key constraints on this table:$/ { skip = 1; next }
    skip && /^pg_dump: (detail|hint): / { next }
    { skip = 0; print; fflush() }
  ' >&2
}

supabase db dump "$@" -f "$backup_file"

printf '\nSET session_replication_role = replica;\n' >> "$backup_file"
supabase db dump "$@" --data-only --use-copy 2>&1 >> "$backup_file" | filter_circular_fk_warning
printf '\nSET session_replication_role = origin;\n' >> "$backup_file"

echo "Backup written to $backup_file"
