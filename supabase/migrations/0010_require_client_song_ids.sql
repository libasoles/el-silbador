-- Song creation must be idempotent across the tab that opened login and the tab that follows the
-- magic link. Clients reserve a UUID before authentication; rejecting omitted ids makes an old
-- client fail safely instead of silently inserting a second song.
alter table public.songs
  alter column id drop default;
