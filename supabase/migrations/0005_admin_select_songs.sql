-- The "Owners and admins can update songs" policy in 0001_init.sql lets an admin UPDATE any
-- song, but Postgres also requires the existing row to satisfy the table's SELECT policy before
-- an UPDATE/DELETE can even target it - and "Users can read own or public songs" never granted
-- admins that visibility. In practice this meant setSongPublic() from an admin silently affected
-- 0 rows (PGRST116) for any song that was both private and owned by someone else, since the
-- admin could never "see" it to update it in the first place.

drop policy if exists "Users can read own or public songs" on public.songs;
create policy "Users can read own or public songs"
  on public.songs for select to authenticated
  using (owner_id = auth.uid() or is_public = true or public.is_admin());
