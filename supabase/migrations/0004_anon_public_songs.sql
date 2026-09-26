-- The "authenticated"-only select policy in 0001_init.sql (and the matching grants in
-- 0002_grants.sql) never covered the "anon" role, so a signed-out visitor got zero rows back for
-- ANY song - including public ones - not just private songs as intended. That made
-- /cancion/:slug unreachable for anyone without a session, defeating the point of a public,
-- shareable song link.

grant usage on schema public to anon;
grant select on public.songs to anon;

drop policy if exists "Anonymous users can read public songs" on public.songs;
create policy "Anonymous users can read public songs"
  on public.songs for select to anon
  using (is_public = true);
