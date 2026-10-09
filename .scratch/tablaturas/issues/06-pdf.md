# 06: El PDF imprime las tablaturas visibles

**What to build:** El PDF es `window.print()` del DOM. Agregar reglas `@media print`:
- Las tablaturas salen si están visibles (toggle en on, o siempre en edición).
- Se ocultan hint, slider, add y los botones copy/delete.
- Los bloques no se cortan entre páginas si se puede evitar (`break-inside: avoid` por Sheet).

Ver [spec](../spec.md).

**Blocked by:** 02, 05

**Status:** done
**Agent:** claude

- [x] Con el toggle en on, el PDF muestra las tablaturas sin controles. Con el toggle en off, no las muestra.
- [x] Test de las reglas de print, en la línea de los que hay en `src/editor/App.test.ts`.
