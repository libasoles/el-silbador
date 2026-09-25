# 01: Schema de Postgres y políticas RLS

**What to build:** Migraciones SQL versionadas en `supabase/migrations/` que crean `profiles`, `songs`,
`favorites`, el trigger de alta de `profiles` en signup, el trigger que bloquea `is_public` para no-admins,
y las policies RLS descriptas en la spec.

**Blocked by:** None

**Status:** done
**Agent:** codex

- [x] `profiles(id, username unique nullable, role default 'user' check in ('user','admin'), timestamps)`
- [x] `songs(id, owner_id -> profiles.id, title nullable, content jsonb, is_public default false, forked_from -> songs.id on delete set null, timestamps)`
- [x] `favorites(user_id, song_id, created_at, pk(user_id, song_id))`
- [x] Trigger en `auth.users` que crea la fila de `profiles` al signup (`username = null`)
- [x] Trigger `BEFORE UPDATE` en `songs` que rechaza/revierte cambios a `is_public` si quien ejecuta no es admin
- [x] RLS `profiles`: SELECT abierto a autenticados, UPDATE solo propia fila
- [x] RLS `songs`: SELECT si dueño o público; INSERT solo propio; UPDATE/DELETE solo dueño
- [x] RLS `favorites`: todas las operaciones solo `user_id = auth.uid()`; INSERT exige `songs.is_public = true`
- [x] RLS habilitado en las tres tablas

## Comments

- Se agregó un trigger adicional no pedido explícitamente por la spec, `protect_profile_role` en
  `profiles`: la policy de UPDATE de `profiles` (línea 108-109 de la spec) solo restringe la fila
  (`id = auth.uid()`), sin carve-out de columna, lo que dejaría a cualquier usuario auto-promoverse a
  `role = 'admin'` editando su propia fila. El trigger revierte cambios a `role` cuando quien ejecuta no
  es ya admin, cerrando ese hueco de escalación de privilegios sin tocar el mecanismo de asignación manual
  del primer admin (ver `supabase/README.md`). Se documenta acá como la misma clase de decisión que
  `guard_song_publication` (ticket 02, sección Comments): revierte en vez de rechazar.
