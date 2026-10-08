-- Fixture for the Lighthouse audit (scripts/lighthouse.sh). It is loaded only into the temporary
-- Supabase stack that script creates, never into the shared development stack: `seed.sql` is what
-- `supabase db reset` loads, so this file deliberately lives elsewhere.
--
-- One admin owns one public song, so the song is listed in the library and its page renders.

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-00000000a001',
  'authenticated',
  'authenticated',
  'lighthouse@example.com',
  now(),
  now()
);

-- The on_auth_user_created trigger created the profile; promote it so its songs are listed.
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000a001';

insert into public.songs (id, owner_id, slug, title, is_public, category, content)
values (
  '00000000-0000-0000-0000-00000000b001',
  '00000000-0000-0000-0000-00000000a001',
  'recuerdos-de-ypacarai-lhci0',
  'Recuerdos de Ypacaraí',
  true,
  'Folklore',
  '{"title": "Recuerdos de Ypacaraí", "author": "Demetrio Ortiz", "lyricsText": "Una noche tibia nos conocimos\nJunto al lago azul de Ypacaraí\nTú cantabas triste por el camino\nViejas melodías en guaraní", "song": [{"id": "line17", "words": [{"id": "word3", "syllables": [{"id": "syl1", "text": "U"}, {"id": "syl2", "text": "na"}]}, {"id": "word6", "syllables": [{"id": "syl4", "text": "no"}, {"id": "syl5", "text": "che"}]}, {"id": "word9", "syllables": [{"id": "syl7", "text": "ti"}, {"id": "syl8", "text": "bia"}]}, {"id": "word11", "syllables": [{"id": "syl10", "text": "nos"}]}, {"id": "word16", "syllables": [{"id": "syl12", "text": "co"}, {"id": "syl13", "text": "no"}, {"id": "syl14", "text": "ci"}, {"id": "syl15", "text": "mos"}]}]}, {"id": "line37", "words": [{"id": "word20", "syllables": [{"id": "syl18", "text": "Jun"}, {"id": "syl19", "text": "to"}]}, {"id": "word22", "syllables": [{"id": "syl21", "text": "al"}]}, {"id": "word25", "syllables": [{"id": "syl23", "text": "la"}, {"id": "syl24", "text": "go"}]}, {"id": "word28", "syllables": [{"id": "syl26", "text": "a"}, {"id": "syl27", "text": "zul"}]}, {"id": "word30", "syllables": [{"id": "syl29", "text": "de"}]}, {"id": "word36", "syllables": [{"id": "syl31", "text": "Y"}, {"id": "syl32", "text": "pa"}, {"id": "syl33", "text": "ca"}, {"id": "syl34", "text": "ra"}, {"id": "syl35", "text": "í"}]}]}, {"id": "line55", "words": [{"id": "word39", "syllables": [{"id": "syl38", "text": "Tú"}]}, {"id": "word43", "syllables": [{"id": "syl40", "text": "can"}, {"id": "syl41", "text": "ta"}, {"id": "syl42", "text": "bas"}]}, {"id": "word46", "syllables": [{"id": "syl44", "text": "tris"}, {"id": "syl45", "text": "te"}]}, {"id": "word48", "syllables": [{"id": "syl47", "text": "por"}]}, {"id": "word50", "syllables": [{"id": "syl49", "text": "el"}]}, {"id": "word54", "syllables": [{"id": "syl51", "text": "ca"}, {"id": "syl52", "text": "mi"}, {"id": "syl53", "text": "no"}]}]}, {"id": "line70", "words": [{"id": "word58", "syllables": [{"id": "syl56", "text": "Vie"}, {"id": "syl57", "text": "jas"}]}, {"id": "word63", "syllables": [{"id": "syl59", "text": "me"}, {"id": "syl60", "text": "lo"}, {"id": "syl61", "text": "dí"}, {"id": "syl62", "text": "as"}]}, {"id": "word65", "syllables": [{"id": "syl64", "text": "en"}]}, {"id": "word69", "syllables": [{"id": "syl66", "text": "gua"}, {"id": "syl67", "text": "ra"}, {"id": "syl68", "text": "ní"}]}]}], "bisGroups": [], "cells": {"chords": {"before:syl1": "C", "before:syl35": "G7", "before:syl44": "Dm", "before:syl56": "F", "before:syl61": "G7", "before:syl68": "C"}}, "chordVariants": {}, "pitchDirections": {}, "merges": []}'::jsonb
);
