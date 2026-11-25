-- Caps on what a user can store, so a song stays a song. The editor only ever produces a few
-- hundred KB of jsonb for a long song, but anyone with an account can call the API directly and
-- write whatever they like to `songs.content`; these constraints are what actually stop that.
--
-- NOT VALID keeps any existing oversized row from blocking the migration. The constraints still
-- apply to every insert and update from now on.

alter table public.songs
  add constraint songs_content_size_limit
    check (octet_length(content::text) <= 1000000) not valid,
  add constraint songs_title_length_limit
    check (title is null or char_length(title) <= 120) not valid,
  add constraint songs_author_length_limit
    check (char_length(coalesce(content ->> 'author', '')) <= 120) not valid;
