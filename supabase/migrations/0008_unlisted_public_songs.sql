-- A public song can be opened by anyone with its URL. Discovery is deliberately stricter: only
-- songs created by administrators appear in the library/sitemap and are eligible for indexing.
alter table public.songs
  add column if not exists is_listed boolean not null default false;

-- New songs are shareable by direct link unless their author explicitly marks them private.
alter table public.songs
  alter column is_public set default true;

-- 0001 blocked non-admin owners from changing visibility. Owners may now choose whether their
-- own songs are shareable; the trigger below independently controls discoverability.
drop trigger if exists guard_songs_publication on public.songs;
drop function if exists public.guard_song_publication();

create or replace function public.set_song_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.is_listed = new.is_public
    and exists (
      select 1
      from public.profiles
      where id = new.owner_id
        and role = 'admin'
    );
  return new;
end;
$$;

drop trigger if exists set_songs_listing on public.songs;
create trigger set_songs_listing
  before insert or update on public.songs
  for each row execute function public.set_song_listing();

-- If the initial administrator is promoted after having created songs, make their already-public
-- work discoverable too. Demoting an admin removes their work from the public listing.
create or replace function public.refresh_owner_song_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    update public.songs
    set is_listed = is_listed
    where owner_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists refresh_owner_song_listing on public.profiles;
create trigger refresh_owner_song_listing
  after update of role on public.profiles
  for each row execute function public.refresh_owner_song_listing();

-- Preserve the intended discovery state for rows that existed before this column was added.
update public.songs
set is_listed = is_public
  and exists (
    select 1
    from public.profiles
    where id = songs.owner_id
      and role = 'admin'
  );
