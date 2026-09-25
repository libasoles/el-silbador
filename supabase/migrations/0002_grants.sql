-- Tables created via CLI migrations are not auto-exposed to PostgREST roles the way the
-- dashboard's Table Editor does it (that's exactly what "Automatically expose new tables"
-- controls, which this project deliberately disabled per the spec). Without these grants every
-- role - including service_role - gets "permission denied for table ..." from Postgres before
-- RLS ever gets a chance to filter rows. RLS policies (0001_init.sql) still decide which rows are
-- visible/writable; these grants only unlock the operations those policies are allowed to permit.

grant usage on schema public to authenticated, service_role;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.songs to authenticated;
grant select, insert, delete on public.favorites to authenticated;

grant all on public.profiles, public.songs, public.favorites to service_role;
