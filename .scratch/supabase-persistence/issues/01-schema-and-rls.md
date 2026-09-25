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
