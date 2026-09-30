-- Restore private-by-default songs. Owners can still make a song public with the privacy control;
-- 0008 then keeps a non-admin owner's public song unlisted and out of search engines.
alter table public.songs
  alter column is_public set default false;

-- Row-level security already limits updates to a song's owner or an administrator. Remove the
-- additional trigger from 0007 so either permitted editor can attach a YouTube link.
drop trigger if exists guard_songs_youtube_url on public.songs;
drop function if exists public.guard_song_youtube_url();
