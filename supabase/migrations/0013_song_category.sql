-- A song's category (e.g. "Folklore"). Admins set it directly in the database for now; there is no
-- UI to edit or filter by it yet. Unlike performers (0011), the category travels with a fork: the
-- fork is still the same kind of song.
--
-- Any owner can UPDATE their row (see the "Owners and admins can update songs" policy), so the
-- trigger below is what keeps the column admin-only: a non-admin's change is silently reverted, and
-- a non-admin's new song gets no category unless it is a fork, which inherits its source's.

alter table public.songs
  add column if not exists category text check (category is null or btrim(category) <> '');

-- Every song that exists today is folklore. Backfilled without touching updated_at, which orders the
-- library.
alter table public.songs disable trigger set_songs_updated_at;
update public.songs set category = 'Folklore' where category is null;
alter table public.songs enable trigger set_songs_updated_at;

-- Only app users (the anon/authenticated roles PostgREST switches to) are guarded: admins writing
-- through the SQL editor or the service role run as other roles and keep whatever they set. The
-- function runs as the caller, so a fork reads its source's category through the caller's own RLS,
-- the same way forkSong already had to read the source's content.
create or replace function public.guard_song_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.category = (
      select s.category from public.songs s where s.id = new.forked_from
    );
  elsif new.category is distinct from old.category then
    new.category = old.category;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_songs_category on public.songs;
create trigger guard_songs_category
  before insert or update on public.songs
  for each row execute function public.guard_song_category();
