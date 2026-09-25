Status: ready-for-agent
Agent: unassigned

# Persistencia y autenticación de canciones (Supabase)

## Problem Statement

Hoy el estado de una canción (letra, sílabas, uniones/melismas, anotaciones de las pistas "Acordes" y
"Notas de la melodía") vive solo en memoria de React y se pierde al refrescar la página o cerrar la
pestaña. Quien usa el editor no tiene forma de guardar su trabajo, retomarlo desde otro dispositivo, ni
mostrárselo a otra persona sin reconstruirlo desde cero. Tampoco existe ningún concepto de usuario: no
hay forma de distinguir "mis canciones" de las de otra persona, ni de reutilizar el trabajo de otro.

## Solution

Agregar autenticación (login sin contraseña, vía magic link) y persistencia real de canciones en una base
Postgres administrada (Supabase), de modo que cada usuario tenga su propio índice de canciones que
sobrevive entre sesiones y dispositivos. Cada canción se guarda sola, sin acción explícita del usuario
(autosave), reusando el mismo patrón de reactividad por debounce que ya existe para el resilabeo. Un
usuario administrador puede marcar canciones como públicas; cualquier usuario puede marcar una canción
pública como favorita (referencia de solo lectura, aparece en una sección "Favoritas" de su índice) o
forkearla (crea una copia propia, privada y editable, que conserva una referencia a la canción original).

Esta spec cubre exclusivamente la capa de datos: schema de Postgres, políticas de acceso (RLS) y un
módulo de acceso a datos en TypeScript tipado sobre `supabase-js`, con tests unitarios sobre ese módulo.
No cubre ningún componente de UI (formulario de login, índice visual de canciones, botones de
favorito/fork/publicar, onboarding de username): esa parte se construye por separado, contra el
contrato que expone este módulo.

## User Stories

1. Como usuario, quiero loguearme con un magic link a mi email, para no tener que crear ni recordar una
   contraseña.
2. Como usuario, quiero que mi sesión dure varios meses sin tener que volver a loguearme, para no
   interrumpir mi flujo de trabajo cada pocos días.
3. Como usuario nuevo, quiero elegir un username único la primera vez que uso la app (después de loguearme
   con éxito), para tener una identidad pública estable dentro de la herramienta.
4. Como usuario, quiero que mi trabajo en una canción se guarde solo, sin tener que apretar un botón de
   "guardar", para no perder cambios por olvido.
5. Como usuario, quiero que el guardado automático dispare con el mismo patrón de reactividad que ya usa
   el resilabeo (al completar una edición relevante y por debounce de inactividad), para que el
   comportamiento de la herramienta sea consistente.
6. Como usuario, quiero tener un índice con todas las canciones que creé, para poder retomar cualquiera de
   ellas en cualquier momento.
7. Como usuario, quiero que una canción sin título ni contenido todavía aparezca en mi índice (por ejemplo
   apenas la creo, antes de escribir nada), para poder borrarla si la abrí por error.
8. Como usuario, quiero poder borrar una canción de mi índice, para deshacerme de borradores que no quiero
   conservar.
9. Como usuario, quiero que mis canciones sean privadas por defecto (solo yo puedo verlas y editarlas),
   para no exponer accidentalmente un trabajo en progreso.
10. Como administrador, quiero poder marcar cualquier canción como pública, para curar qué contenido se
    comparte con el resto de los usuarios.
11. Como usuario no-administrador, quiero que se me impida marcar una canción propia como pública
    directamente, para que la curación de contenido público quede centralizada en el administrador.
12. Como usuario, quiero ver un listado de las canciones públicas, incluyendo quién las escribió (su
    username), para descubrir contenido creado por otros.
13. Como usuario, quiero poder agregar una canción pública a mis favoritas, para encontrarla rápido después
    sin tener que buscarla de nuevo.
14. Como usuario, quiero ver mis canciones favoritas en una sección separada de mi índice ("Favoritas"),
    distinguidas de las canciones que yo mismo creé.
15. Como usuario, quiero que favoritear una canción sea una referencia de solo lectura (no me permite
    editar la canción de otro), para que la autoría y el contenido original queden protegidos.
16. Como usuario, quiero poder quitar una canción de mis favoritas, para curar esa lista con el tiempo.
17. Como usuario, quiero poder forkear cualquier canción pública, para obtener una copia propia y privada
    que sí puedo editar libremente.
18. Como usuario, quiero que mi copia forkeada mantenga una referencia a la canción original de la que
    salió, para preservar la trazabilidad de dónde vino ese contenido.
19. Como usuario, quiero que un fork sobreviva aunque la canción original se borre después, para no perder
    mi copia por una acción de otra persona.
20. Como usuario, solo puedo favoritear o forkear canciones que estén marcadas como públicas, para que el
    contenido privado de otros permanezca inaccesible.
21. Como desarrollador que construye la UI en un agente separado, quiero un módulo de acceso a datos
    tipado (listar mis canciones, listar públicas, listar favoritas, guardar, borrar, forkear, marcar/
    desmarcar favorita, publicar/despublicar, fijar mi username) con tests unitarios, para no tener que
    inferir contratos ni reimplementar llamadas a Supabase.
22. Como desarrollador, quiero que las políticas de acceso (RLS) sean la única fuente de verdad de quién
    puede ver/editar qué fila, para que ninguna vista de UI futura pueda saltearse las reglas de
    privacidad aunque tenga un bug.

## Implementation Decisions

- **Proveedor**: Supabase (Postgres administrado + Auth + API REST autogenerada). Se descarta Jazz (ver
  `.scratch/jazz-persistence/research.md`) porque no hay requisito de offline ni de branching de
  canciones en este alcance.
- **Auth**: magic link como único método. Sesión sin time-box ni inactivity-timeout configurados
  (comportamiento default de Supabase Auth: la sesión persiste indefinidamente mientras el cliente
  refresca el token).
- **Username**: se pide en un paso de onboarding posterior al primer login exitoso (fuera de esta spec —
  la UI la construye el otro agente); el schema debe soportarlo como columna nullable con constraint de
  unicidad, sin bloquear el signup.
- **Rol de administrador**: columna `role` en `profiles` (valores `'user'` | `'admin'`, default `'user'`).
  Un solo usuario tiene `role = 'admin'` hoy (asignado a mano tras crear la cuenta); el mecanismo soporta
  múltiples admins a futuro sin cambio de schema.
- **Schema** (Postgres, aplicado vía Supabase CLI en modo remoto — `supabase link` + `supabase db push` —
  sin stack local/Docker; migraciones versionadas como archivos SQL en el repo):
  - `profiles`: `id` (= `auth.users.id`), `username` (text, nullable, unique), `role` (text, default
    `'user'`, check `in ('user', 'admin')`), timestamps. Se crea automáticamente vía trigger al hacer
    signup en `auth.users` (fila inicial con `username = null`).
  - `songs`: `id`, `owner_id` (→ `profiles.id`), `title` (text, nullable), `content` (`jsonb` — el estado
    completo serializable del reducer del núcleo: `title`, `author`, `lyricsText`, `song`, `merges`,
    `cells`; ver nota de serialización abajo), `is_public` (boolean, default `false`), `forked_from` (→
    `songs.id`, nullable, `ON DELETE SET NULL`), timestamps.
  - `favorites`: `user_id`, `song_id`, `created_at`, primary key compuesta (`user_id`, `song_id`).
  - Nota de serialización: `EditorState.merges` es un `Set<string>` en memoria; al persistir en `jsonb` se
    serializa como array de strings y se reconstruye a `Set` al leer. El módulo de acceso a datos es el
    lugar donde ocurre esa conversión, no el reducer del núcleo.
- **RLS — `profiles`**: `SELECT` abierto a cualquier usuario autenticado (el username es la identidad
  pública elegida por el usuario, no es dato sensible). `UPDATE` restringido a la propia fila
  (`id = auth.uid()`).
- **RLS — `songs`**: `SELECT` si `owner_id = auth.uid()` OR `is_public = true`. `INSERT` solo con
  `owner_id = auth.uid()`. `UPDATE`/`DELETE` solo el dueño. Cambiar `is_public` está bloqueado para el
  dueño (un trigger revierte/rechaza el cambio si quien ejecuta la actualización no tiene `role = 'admin'`
  en `profiles`); un administrador puede marcar pública cualquier canción, sea o no su dueño.
- **RLS — `favorites`**: cada usuario gestiona únicamente sus propias filas (`user_id = auth.uid()`) para
  `SELECT`/`INSERT`/`DELETE`. `INSERT` exige además que la canción referenciada tenga `is_public = true`.
- **Fork**: operación de aplicación (no una tabla nueva): crea una fila nueva en `songs` con
  `owner_id = auth.uid()`, `content` copiado de la canción origen, `forked_from` apuntando a esa canción,
  `is_public = false`. Cubierta por las policies de `INSERT` ya descritas, sin policy adicional.
- **Módulo de acceso a datos** (TypeScript, sobre `supabase-js`; es el entregable de esta spec junto al
  schema — no incluye componentes de UI): expone como mínimo `listMySongs`, `listPublicSongs`,
  `listFavorites`, `saveSong` (autosave — upsert de `content`/`title`), `deleteSong`, `forkSong`,
  `toggleFavorite`, `setSongPublic` (falla o es rechazado por RLS si quien lo invoca no es admin),
  `setUsername`. Cada función tipada contra el shape de `EditorState`/`Song` del núcleo, sin exponer
  detalles de `supabase-js` (cliente Postgrest, nombres de tabla) al resto de la app.
- **Credenciales cliente**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en variables de entorno
  (`.env`, gitignored); la `anon key` es segura de exponer en cliente por diseño de Supabase, la seguridad
  real la dan las RLS policies. Nunca se usa la `service_role key` desde el cliente.
- **Config del proyecto Supabase** (dashboard, sección Security al crear el proyecto): `Enable Data API`
  activado, `Automatically expose new tables` desactivado (se expone cada tabla a propósito vía policies
  explícitas), `Enable automatic RLS` activado (red de seguridad: toda tabla nueva nace con RLS activo).

## Testing Decisions

- El seam de testing es el módulo de acceso a datos (uno solo, consistente con "el menor número de seams
  posible"): cada función pública se testea por su comportamiento observable (qué fila queda en la base,
  qué devuelve, qué rechaza), nunca por cómo arma la query internamente.
- Prior art: el mismo enfoque que ya usa `src/core/__tests__` para el reducer — se testea la API pública
  (acción/llamada → resultado), no detalles internos — aplicado ahora a este módulo en lugar de al
  reducer.
- Casos a cubrir: guardar y volver a leer una canción (incluida la serialización de `merges` como
  Set↔array); listar solo las canciones propias vs. incluir públicas de otros cuando corresponde; que un
  no-dueño no pueda `UPDATE`/`DELETE` una canción ajena; que un no-admin no pueda marcar `is_public = true`
  vía `setSongPublic` (debe ser rechazado); que un admin sí pueda; que solo se pueda favoritear/forkear una
  canción con `is_public = true`; que forkear copie el contenido y setee `forked_from`; que borrar la
  canción original deje `forked_from = null` en el fork, sin borrar el fork; alta de `profiles.username`
  con constraint de unicidad (falla en duplicado).
- Estas pruebas corren contra el proyecto Supabase real (no hay stack local), usando el/los usuarios de
  prueba y limpiando las filas que crean.

## Out of Scope

- Cualquier componente de UI: login, onboarding de username, índice visual de canciones, botones de
  favorito/fork/publicar, indicador de guardado. Se construye en otro agente contra el módulo de acceso a
  datos de esta spec.
- Soporte offline y sincronización entre dispositivos con cola de escrituras (evaluado y descartado para
  este alcance en `.scratch/jazz-persistence/research.md`).
- Edición colaborativa en tiempo real o resolución de conflictos concurrentes sobre la misma canción.
- Suscripciones pagas o cualquier lógica de monetización asociada a publicar canciones (la publicación es,
  por ahora, una acción manual y exclusiva del administrador).
- Compartir una canción privada por link de solo lectura sin hacerla pública.
- Branching/versionado de canciones (ramas explícitas, merges estructurados).
- Supabase CLI / stack local con Docker para desarrollo.
- Un MCP de Supabase (no está configurado en el entorno de desarrollo actual; se usa el CLI directo).

## Further Notes

- `.scratch/jazz-persistence/research.md` documenta por qué se descartó Jazz para esta necesidad
  específica (recomienda explícitamente Postgres/Supabase para persistencia simple por usuario) y por qué
  podría reconsiderarse si branching de canciones se vuelve una necesidad real de producto.
- `.scratch/silabeo-editor/spec.md` es la spec del editor base; marca la persistencia como explícitamente
  fuera de alcance de esa iteración — esta spec la abre como iteración separada, sin modificar el núcleo
  (`src/core`) más allá de lo necesario para serializar/deserializar `EditorState`.
- La decisión de bloquear el cambio de `is_public` para no-admins se puede implementar como trigger
  `BEFORE UPDATE` que compara el valor nuevo contra el rol de quien ejecuta la operación; se deja como
  detalle de implementación del ticket, no como decisión de producto abierta.
