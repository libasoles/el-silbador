# 02: Módulo de acceso a datos (TypeScript, supabase-js)

**What to build:** `src/data/songs.ts` (o similar) tipado sobre `supabase-js`, sin exponer detalles de
Postgrest ni nombres de tabla al resto de la app. Serializa/deserializa `merges` (Set&lt;string&gt; en memoria
↔ array en jsonb).

**Blocked by:** 01 (necesita el schema final para tipar filas)

**Status:** done
**Agent:** claude

- [x] Cliente Supabase inicializado desde `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- [x] `listMySongs`, `listPublicSongs`, `listFavorites`
- [x] `saveSong` (upsert de `content`/`title`, autosave)
- [x] `deleteSong`
- [x] `forkSong` (copia `content`, setea `forked_from`, `owner_id = auth.uid()`, `is_public = false`)
- [x] `toggleFavorite`
- [x] `setSongPublic` (falla/rechazada por RLS si no-admin)
- [x] `setUsername`
- [x] Serialización `merges` Set↔array en el borde del módulo (no en `src/core`)
- [x] Tests unitarios contra el proyecto Supabase real (ver spec, sección Testing Decisions), gateados por
      env vars de test para poder correr `npm run build`/typecheck sin credenciales reales

## Comments

- Implementado en `src/data/{supabaseClient,types,songs,profiles,index}.ts`. Superficie pública: `listMySongs`,
  `listPublicSongs`, `listFavorites`, `saveSong`, `deleteSong`, `forkSong`, `toggleFavorite`, `setSongPublic`,
  `setUsername`, más `getSong(songId)` agregada (no está en el mínimo de la spec, pero hace falta para poder
  reabrir una canción existente en el editor — user story 6).
- El trigger real en `supabase/migrations/0001_init.sql` (`guard_song_publication`) **revierte** silenciosamente
  `is_public` en vez de lanzar un error cuando quien llama no es admin (el UPDATE "tiene éxito" pero no cambia
  nada). `setSongPublic` detecta ese no-op comparando el valor devuelto contra el pedido y lanza un error en ese
  caso, para que el contrato de este módulo (falla/rechazo visible) no dependa de cuál de las dos estrategias
  ("revierte" vs. "rechaza", ambas mencionadas en la spec) haya elegido el trigger.
- Tests de integración en `src/data/__tests__/songs.test.ts`, gateados con `describe.skipIf` sobre
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `SUPABASE_TEST_SERVICE_ROLE_KEY`. Con la service-role key el
  propio test provisiona y promueve a admin dos usuarios efímeros por corrida (vía `auth.admin.createUser` +
  `UPDATE profiles.role`) y los borra en `afterAll`, en vez de requerir credenciales de usuarios de prueba
  pre-creados a mano — evita mantener cuentas fijas y dejar el signup real (magic link) fuera del loop de tests.
  Instrucciones de setup en `src/data/__tests__/README.md`.
- Se agregó `src/vite-env.d.ts` para tipar `import.meta.env.VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; no se
  tocó nada más de `src/core`.
