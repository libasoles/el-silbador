-- Performers ("intérpretes") of a song, loaded by admins and readable by everyone (see
-- .scratch/interpretes/spec.md). People search for songs by who sings them, not by who wrote them,
-- so each song can list the artists that perform it. `songs.content.author` stays as it is.
--
-- An artist's name is unique regardless of case and accents: "Los Chalchaleros" and
-- "los chalchaléros" are the same row. Later migrations may seed known artists with a plain
-- `insert ... on conflict do nothing`, which this unique index makes safe.

-- Supabase installs extensions in the `extensions` schema; the schema exists there already and is
-- only created here so the migration also runs on a bare Postgres.
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
-- Supabase grants this already. Writing an artist evaluates the index expression below as the
-- caller, so it is restated here rather than assumed.
grant usage on schema extensions to anon, authenticated, service_role;

-- unaccent() is only STABLE (it looks its dictionary up through search_path), so it cannot back a
-- unique index. Naming the dictionary explicitly removes that dependency, which is what makes it
-- safe to declare this wrapper IMMUTABLE.
create or replace function public.normalize_artist_name(name text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, btrim(name)));
$$;

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now()
);

create unique index if not exists artists_normalized_name_key
  on public.artists (public.normalize_artist_name(name));

create table if not exists public.song_performers (
  song_id uuid not null references public.songs(id) on delete cascade,
  artist_id uuid not null references public.artists(id),
  -- Load order, starting at 0: the song shows its performers in the order they were entered.
  position integer not null check (position >= 0),
  primary key (song_id, artist_id)
);

create index if not exists song_performers_artist_id_idx
  on public.song_performers (artist_id);

-- Same reasoning as 0002_grants.sql / 0004_anon_public_songs.sql: grants only unlock operations,
-- and the RLS policies below decide who may actually perform them.
grant select on public.artists, public.song_performers to anon, authenticated;
grant insert, update, delete on public.artists, public.song_performers to authenticated;
grant all on public.artists, public.song_performers to service_role;

alter table public.artists enable row level security;
alter table public.song_performers enable row level security;

drop policy if exists "Everyone can read artists" on public.artists;
create policy "Everyone can read artists"
  on public.artists for select to anon, authenticated
  using (true);

drop policy if exists "Admins can create artists" on public.artists;
create policy "Admins can create artists"
  on public.artists for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update artists" on public.artists;
create policy "Admins can update artists"
  on public.artists for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete artists" on public.artists;
create policy "Admins can delete artists"
  on public.artists for delete to authenticated
  using (public.is_admin());

-- Performers of a song nobody else can see are still only readable through that song: the client
-- always reaches them from a `songs` row that RLS already let through.
drop policy if exists "Everyone can read song performers" on public.song_performers;
create policy "Everyone can read song performers"
  on public.song_performers for select to anon, authenticated
  using (true);

drop policy if exists "Admins can add song performers" on public.song_performers;
create policy "Admins can add song performers"
  on public.song_performers for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update song performers" on public.song_performers;
create policy "Admins can update song performers"
  on public.song_performers for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can remove song performers" on public.song_performers;
create policy "Admins can remove song performers"
  on public.song_performers for delete to authenticated
  using (public.is_admin());

-- Replaces a song's performers with `names`, in that order. Blank names are ignored and names that
-- only differ in case or accents count once (the first one wins). Missing artists are created;
-- existing ones are reused with their stored spelling. Calling it twice with the same list leaves
-- the same rows. A function body runs in one transaction, so a failure leaves the old list intact.
--
-- SECURITY INVOKER: the caller's own RLS applies to every write below, on top of the explicit
-- admin check that gives non-admins a clear error instead of a policy violation halfway through.
create or replace function public.set_song_performers(song_id uuid, names text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cleaned text[];
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede cargar intérpretes.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.songs s where s.id = set_song_performers.song_id) then
    raise exception 'No existe la canción %.', set_song_performers.song_id
      using errcode = 'P0002';
  end if;

  select coalesce(array_agg(d.name order by d.ord), '{}')
    into cleaned
    from (
      select distinct on (public.normalize_artist_name(t.raw)) btrim(t.raw) as name, t.ord
        from unnest(coalesce(set_song_performers.names, '{}')) with ordinality as t(raw, ord)
       where t.raw is not null and btrim(t.raw) <> ''
       order by public.normalize_artist_name(t.raw), t.ord
    ) d;

  insert into public.artists (name)
  select c.name
    from unnest(cleaned) as c(name)
  on conflict do nothing;

  delete from public.song_performers sp
   where sp.song_id = set_song_performers.song_id;

  insert into public.song_performers (song_id, artist_id, position)
  select set_song_performers.song_id, a.id, (c.ord - 1)::integer
    from unnest(cleaned) with ordinality as c(name, ord)
    join public.artists a
      on public.normalize_artist_name(a.name) = public.normalize_artist_name(c.name);
end;
$$;

revoke all on function public.set_song_performers(uuid, text[]) from public, anon;
grant execute on function public.set_song_performers(uuid, text[]) to authenticated, service_role;
