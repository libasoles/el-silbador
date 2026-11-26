-- A song's key, fixed by an admin when the reharmonization popup's inferred key is wrong. Stored as
-- "<tonic pitch class 0-11>:<major|minor>" (e.g. "0:major" is Do mayor); null means "infer it".
-- Like the category (0013), the key travels with a fork, and only admins may set it: any owner can
-- UPDATE their row, so the trigger below silently reverts a non-admin's change, and a non-admin's
-- new song gets no key unless it is a fork, which inherits its source's.

alter table public.songs
  add column if not exists song_key text
    check (song_key is null or song_key ~ '^([0-9]|1[01]):(major|minor)$');

-- Only app users (anon/authenticated) are guarded; the SQL editor and service role keep whatever
-- they set. Runs as the caller, so a fork reads its source's key through the caller's own RLS.
create or replace function public.guard_song_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.song_key = (
      select s.song_key from public.songs s where s.id = new.forked_from
    );
  elsif new.song_key is distinct from old.song_key then
    new.song_key = old.song_key;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_songs_song_key on public.songs;
create trigger guard_songs_song_key
  before insert or update on public.songs
  for each row execute function public.guard_song_key();
