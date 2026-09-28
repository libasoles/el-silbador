-- Previously a song's slug was assigned once on insert and frozen forever (see comment in
-- 0003_song_slugs.sql), so a song created before it had a title kept a generic "cancion-xxxxx"
-- slug even after being named. This regenerates the slug whenever the title changes.

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
  if tg_op = 'UPDATE' then
    if new.title is not distinct from old.title then
      return new;
    end if;
  elsif new.slug is not null then
    return new;
  end if;

  base := public.slugify(new.title);
  if base = '' then
    base := 'cancion';
  end if;

  loop
    candidate := base || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
    exit when not exists (
      select 1 from public.songs where slug = candidate and id is distinct from new.id
    );
    attempt := attempt + 1;
    if attempt > 20 then
      raise exception 'No se pudo generar un slug único para la canción';
    end if;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists set_songs_slug_update on public.songs;
create trigger set_songs_slug_update
  before update on public.songs
  for each row execute function public.set_song_slug();
