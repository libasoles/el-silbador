# 03: El bloque de tablatura convive con el editor de la letra

**What to build:** En `SongView.tsx`, renderizar las líneas `tab` con `<TabBlock>` dentro de un wrapper
`contentEditable={false}`, en la misma rama donde hoy se ramifica a `SubtitleLineView`. El teclado, el
`beforeinput` y el paste dentro de la grilla no se propagan al contenteditable de la letra. Al escribir
`TAB` en una línea, el bloque aparece en su lugar y la palabra deja de verse. En `handleBeforeInput`,
Backspace/Delete pegados al bloque no lo borran. Borrar una selección que lo incluye sí lo elimina, y se
puede deshacer. Mobile es read-only: no hay trigger ni edición (gate con `useIsMobile`/`canEdit`, no solo
con CSS). Ver [spec](../spec.md).

**Blocked by:** 01, 02

**Status:** done
**Agent:** claude

- [x] Escribir `TAB` + Enter (o salir de la línea) inserta el bloque completo en esa posición.
- [x] Escribir trastes en la grilla no modifica la letra, y escribir en la letra no modifica la grilla.
- [x] Backspace al inicio de la línea siguiente al bloque no lo borra. Borrar una selección que lo cruza sí, y undo lo restaura.
- [x] En mobile (`mockMatchMedia(true)`) el bloque es readonly incluso para el dueño.
