# Running `songs.test.ts` for real

This suite hits a real Supabase project (no local/Docker stack — see the spec). To run it:

1. Provision a Supabase project with the schema + RLS from `.scratch/supabase-persistence/spec.md` (issue 01).
2. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_TEST_SERVICE_ROLE_KEY` (the project's
   service-role key, used only in this test file to provision/promote/delete throwaway test users and to
   read ground truth — never shipped to the client) in your shell environment.
3. Run `npm run test`. The suite creates its own ephemeral users (via the admin API) and songs per run and
   deletes them in `afterAll`; no pre-existing accounts are required.

Without those three env vars, this suite is skipped (not failed) so `npm run test`/`npm run build` stay green.

## Data hygiene

This suite runs against the same Supabase project as the app (there's no separate `.env.test`
project today), and it deliberately triggers RLS/constraint rejections (duplicate username,
favoriting a private song, editing someone else's song) as part of asserting they work — expect
to see the corresponding Postgres error codes (23505, 42501) in that project's logs after a test
run. `afterAll` deletes every user/song/favorite it created, so no rows are left behind, but if a
run is killed mid-way, or if you're writing a query against auth/analytics data (active users,
signup counts, etc.), filter out test accounts by email: every user created by this suite has an
email starting with `songs-test-` (e.g. `email LIKE 'songs-test-%'`).
