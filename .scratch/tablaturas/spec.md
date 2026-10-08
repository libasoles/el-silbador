# Tablaturas en El Silbador (ascii-tabs)

Tickets: [issues/](issues/). Issue de la librería: https://github.com/libasoles/ascii-tabs/issues/30

## Context
Queremos que los autores puedan insertar tablaturas de guitarra dentro de una canción con la librería propia
`ascii-tabs` (github.com/libasoles/ascii-tabs). La referencia es la página `/crear-tablaturas-de-guitarra`
de guitar-chords (`guitar-chords/src/site/tab-editor.html`). Las decisiones salen del grilling:

| Tema | Decisión |
|---|---|
| Dependencia | `"ascii-tabs": "github:libasoles/ascii-tabs#semver:^0.1.0"` (rango 0.1.x; el lockfile fija el commit, se actualiza con `npm update ascii-tabs`). Carga con `import()` dinámico en cliente, solo si la canción tiene bloques (en lectura, solo si además el toggle está en on). Chunk aparte de ~12 KB gzip; el bundle principal no crece. |
| Trigger | Una línea cuyo texto completo es `TAB` (mayúsculas exactas), igual que las etiquetas de sección. Reemplaza esa línea por un **bloque de tablatura** completo y la palabra desaparece. |
| Bloque | Composición default + spacing: hint, slider de spacing, sheet (copy + delete), add. Un bloque puede tener varios Tabs. `lang="es"`, `theme="light"`, colores mapeados a la paleta de la app. |
| Borrar | Si hay varios Tabs, borra ese Tab. Si es el último, elimina el bloque entero, también vacío. Inmediato, sin confirmación. |
| Edición de texto | El bloque solo se elimina si una selección borrada lo incluye. Backspace/Delete pegado al bloque no lo toca. Todo pasa por undo/redo. |
| Persistencia | En `songs.content` (Supabase) vía autosave. No se usa `<ascii-tabs-storage>`. |
| Lectura | `readonly` (solo copiar). Toggle "TAB" primero en la toolbar (desktop y menú mobile), visible solo en lectura y solo si la canción tiene ≥1 bloque. Default off: en off no se renderizan los bloques. Preferencia global en localStorage, como la del subrayado. Misma regla en mobile y desktop. En edición siempre se ven y no hay toggle. |
| Mobile | Read-only, como el resto: no hay trigger ni edición. |
| PDF | Imprime lo que se ve: con el toggle on salen las tablaturas sin hint, slider ni botones. |
| Pegar | Los textos ASCII de tablatura (`e|---`, `1 ---`) que se pegan pasan a bloques, uno por tramo contiguo de staves (con `parse` de la librería). El resto sigue por `parseChordSheet`. |
| Ícono | Texto "TAB". Es una excepción a lucide-react, igual que el ícono "do mi sol" de notas de acordes. |

## Trabajo
Worktree `.agents/worktrees/tablaturas`, rama `tablaturas`. Merge local a `main` al terminar y luego borrar rama y worktree. Versión `0.16.11 → 0.17.0` (feature) en `package.json` y `package-lock.json`.

### 1. Modelo (`src/core/`)
- `types.ts`: agregar `Line.tab?: true` (análogo a `subtitle`). En `EditorState`: `tabs: Record<lineId, TabBlock>` con `TabBlock = { tabs: (number|null)[][][]; spacing?: number }`.
- `model.ts`: junto a la detección de etiquetas de sección (`model.ts:5-43`), detectar la línea `TAB` exacta → `{id, words: [], tab: true}`. En `lyricsText` el bloque queda como una línea marcador estable (la misma palabra `TAB`, que el render nunca muestra como texto). Así `reconcileLine` (`state.ts:~405`) conserva id y posición sin lógica nueva. Una línea `TAB` nueva crea `tabs[id] = { tabs: [[]] }`.
- `state.ts`: acciones `setTabBlock(lineId, block)` y `removeTabBlock(lineId)` (esta quita la línea marcador del `lyricsText`), ambas con historial. Al reconciliar, se purga `tabs[id]` de las líneas que ya no existen. Así la selección borrada que incluye el bloque lo elimina, y el undo lo restaura con su contenido.
- Asegurar que `tab` lines no generan slots/celdas (como `subtitle`/`BIS`, `model.ts:62-132`).

### 2. Persistencia (`src/data/songs.ts`)
- `StoredSongContent.tabs?: Record<string, TabBlock>`. `serializeContent` lo copia. `deserializeContent` hace `?? {}`, y la línea marcador `TAB` de una canción vieja sin entrada se crea vacía. El autosave toma `tabs` desde el `useMemo` de `content` (`App.tsx:584`).
- No se necesita migración: `content` es jsonb.

### 3. Componente `src/editor/components/TabBlock.tsx`
- Monta `<ascii-tabs>` en cliente. En el primer render hace `await import("ascii-tabs")` (los custom elements se registran por side effect) y muestra un placeholder de altura fija mientras carga.
- En edición la composición es hint + `<ascii-tabs-spacing>` + sheet(copy, delete) + add. En lectura agrega `readonly` (la librería oculta hint, delete y add).
- Controlado: escribe `value` y `spacing` desde el estado. En `change` llama `setTabBlock`. Para spacing, escuchar `input`/`change` del slider y leer `el.spacing`.
- **Borrado del último Tab**: el usuario dice que ascii-tabs v0.1.4 permite sobrescribir el botón delete (al 2026-10-08 ese tag no estaba publicado; ver issue #30). Usar ese mecanismo si la 0.1.4 está disponible. Si no, workaround:
  - Listener `click` en captura sobre el root. Si el botón es `.ascii-tabs-delete` y queda 1 Tab: `preventDefault` + `stopPropagation` + `removeTabBlock`.
  - Tras cada render (MutationObserver o después de `change`/set value), volver a habilitar `.ascii-tabs-delete`.
  - Comentarlo apuntando al issue.
- Wrapper `contentEditable={false}`. Se detiene la propagación de `keydown`/`beforeinput`/`paste` hacia el contenteditable de `SongView`, para que la grilla capture el teclado.
- CSS: mapear `--ascii-tabs-accent/ink/paper/sheet/line/focus/font` a tokens de `App.css`. En `@media print` ocultar `.ascii-tabs-hint`, `.ascii-tabs-button`, el slider y el add.

### 4. Editor (`src/editor/components/SongView.tsx`)
- En el render de líneas (donde se ramifica a `SubtitleLineView`, ~973-982) agregar la rama para `line.tab` → `<TabBlock>`.
- En `handleBeforeInput` (759-796): Backspace/Delete adyacentes a un bloque no lo borran. Un rango que lo contiene sí, vía la reconciliación normal.
- En el paste (697-707) partir el texto en tramos: los runs contiguos de staves (6 líneas con label `1-6`/`e B G D A E`) van a `parse()` (import dinámico), se insertan como línea `TAB` y luego se hace `setTabBlock` con el resultado. El resto sigue por `parseChordSheet`. El detector de staves es una función pura en `src/core/asciiTabPaste.ts`, que es testeable sin la librería.

### 5. Toggle de lectura (`src/editor/App.tsx`)
- `src/editor/tabsToggleStorage.ts`, igual a `melodyToggleStorage.ts`, con la clave `"el-silbador:tabs-toggle-visible"` y default `false`.
- `TabsToggleButton`, igual a `UnderlineToggleButton` (`App.tsx:263-290`): clase `track-toolbar__toggle`, `aria-pressed`, `IconButtonTooltip` "Tablaturas", ícono de texto "TAB" en `icons.tsx` (como el de do mi sol).
- Se renderiza **primero** en `track-toolbar` (1147-1186) y en `mobile-sidebar-menu` (1080-1145), si `!isAuthoringEditable && hasTabBlocks`. En edición los bloques se muestran siempre. En lectura, solo si el toggle está en on.
- (Hecho) AGENTS.md: documentar la excepción de íconos de texto (TAB, do mi sol) en "UI components". En las reglas mobile, "Editar tablaturas" no está permitido y "Toggle de tablaturas" sí.

### 6. Dominio y tickets
- (Hecho, en inglés como el resto: "Tab block", "Tabs toggle") `CONTEXT.md`:
  - **Bloque de tablatura**: bloque entre líneas de una canción, insertado con `TAB`, que contiene uno o más Tabs de ascii-tabs. _Evitar_: tab (en UI), punteo.
  - **Toggle de tablaturas**.
- (Hecho) `.scratch/tablaturas/spec.md` con este resumen.
- Issue en GitHub: https://github.com/libasoles/ascii-tabs/issues/30 "Allow hosts to override delete" (creado).

## Verificación
- Unit (`*.test.ts`):
  - El modelo detecta `TAB` exacto (no `tab`, ni `TAB` dentro de un verso), da id estable al reconciliar y purga al borrar con selección.
  - `serialize`/`deserialize` hace round-trip de `tabs` y es compatible con contenido viejo.
  - Detector de staves pegados (mixto letra/acordes/tabs → posiciones correctas).
- DOM (`*.test.tsx`):
  - Toggle ausente en edición y ausente en lectura sin bloques.
  - Primero y off por default en lectura con bloques. On → bloque `readonly` visible y persistido en localStorage.
  - Con `mockMatchMedia(true)`, la misma regla en mobile y sin edición.
  - Borrar el último Tab elimina el bloque.
  - Mockear `import("ascii-tabs")` donde jsdom no alcance.
- `npm test`, `npm run lint`, `npm run build` (confirmar que el chunk de ascii-tabs queda separado y fuera del bundle inicial).
- Manual con `npm run dev`:
  - Escribir `TAB` → aparece el bloque, la palabra desaparece, cargar trastes y spacing.
  - Recargar → persistido (Supabase).
  - Undo/redo y borrar.
  - Pegar una tablatura ASCII.
  - Ver `/cancion/<slug>` con toggle off/on.
  - Imprimir PDF.
  - Viewport mobile.
