-- Adds a human-readable, URL-stable slug to songs (title + a 5-character random suffix to
-- disambiguate same-titled songs), used to route to a song as /cancion/:slug instead of by its
-- uuid id. The id column is untouched and keeps backing foreign keys (forked_from, favorites).

alter table public.songs add column if not exists slug text;

create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from
    regexp_replace(
      translate(
        lower(coalesce(value, '')),
        'áéíóúüñàèìòùäëïöü',
        'aeiouunaeiouaeiou'
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- Slugs are assigned once, on insert, and never regenerated on update so a song's URL stays
-- stable even after its title changes.
create or replace function public.set_song_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base text;
  candidate text;
  attempt int := 0;
begin
  if new.slug is not null then
    return new;
  end if;

  base := public.slugify(new.title);
  if base = '' then
    base := 'cancion';
  end if;

  loop
    candidate := base || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
    exit when not exists (select 1 from public.songs where slug = candidate);
    attempt := attempt + 1;
    if attempt > 20 then
      raise exception 'No se pudo generar un slug único para la canción';
    end if;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists set_songs_slug on public.songs;
create trigger set_songs_slug
  before insert on public.songs
  for each row execute function public.set_song_slug();

-- Backfill any pre-existing rows (safe to re-run: it only touches rows still missing a slug).
do $$
declare
  r record;
  base text;
  candidate text;
  attempt int;
begin
  for r in select id, title from public.songs where slug is null loop
    base := public.slugify(r.title);
    if base = '' then
      base := 'cancion';
    end if;
    attempt := 0;
    loop
      candidate := base || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
      exit when not exists (select 1 from public.songs where slug = candidate);
      attempt := attempt + 1;
      if attempt > 20 then
        raise exception 'No se pudo generar un slug único para la canción %', r.id;
      end if;
    end loop;
    update public.songs set slug = candidate where id = r.id;
  end loop;
end;
$$;

alter table public.songs alter column slug set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'songs_slug_key') then
    alter table public.songs add constraint songs_slug_key unique (slug);
  end if;
end;
$$;
