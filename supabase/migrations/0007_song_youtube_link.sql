-- Lets admins attach a YouTube link to a song, rendered below its lyrics on the song page.
-- Mirrors 0001_init.sql's guard_song_publication: any owner/admin can UPDATE the row (see the
-- "Owners and admins can update songs" policy), but only an admin's write to youtube_url sticks —
-- a non-admin owner's attempted change is silently reverted by this trigger instead.

alter table public.songs
  add column if not exists youtube_url text;

create or replace function public.guard_song_youtube_url()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.youtube_url is distinct from old.youtube_url
     and not public.is_admin() then
    new.youtube_url = old.youtube_url;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_songs_youtube_url on public.songs;
create trigger guard_songs_youtube_url
  before update on public.songs
  for each row execute function public.guard_song_youtube_url();
