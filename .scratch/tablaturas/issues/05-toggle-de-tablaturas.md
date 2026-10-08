# 05: Toggle "TAB" para mostrar las tablaturas en modo lectura

**What to build:**
- `TabsToggleButton`, igual a `UnderlineToggleButton` (`src/editor/App.tsx`): clase `track-toolbar__toggle`, `aria-pressed`, `IconButtonTooltip` "Tablaturas", ícono de texto "TAB" en `icons.tsx`. Es una excepción a lucide, como "do mi sol".
- Va **primero** en `track-toolbar` y en `mobile-sidebar-menu`.
- Aparece solo en modo lectura y solo si la canción tiene al menos un bloque. La regla es la misma en mobile y en desktop. En edición no aparece y los bloques se ven siempre.
- Off por default: en off los bloques no se renderizan (y no se carga ascii-tabs).
- Su estado es global por navegador en localStorage, en `src/editor/tabsToggleStorage.ts` (como `melodyToggleStorage.ts`), con la clave `"el-silbador:tabs-toggle-visible"`.

Ver [spec](../spec.md).

**Blocked by:** 02

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] En `/editar` el toggle no aparece.
- [ ] En lectura sin bloques no aparece.
- [ ] En lectura con bloques aparece primero, en off.
- [ ] On muestra los bloques readonly, y la preferencia sobrevive al recargar y al cambiar de canción.
- [ ] Mismo comportamiento con `mockMatchMedia(true)`.
- [ ] Tests DOM.
