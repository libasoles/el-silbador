# 02: Componente `TabBlock` con ascii-tabs cargado bajo demanda

**What to build:** Agregar la dependencia `"ascii-tabs": "github:libasoles/ascii-tabs#semver:^0.1.0"`
(rango 0.1.x; se actualiza con `npm update ascii-tabs`). Crear `src/editor/components/TabBlock.tsx`, que
hace `import("ascii-tabs")` en el cliente solo al montarse (un chunk aparte que no pesa en el bundle
inicial), muestra un placeholder de altura fija mientras carga y monta `<ascii-tabs lang="es" theme="light">`.
- En edición usa la composición hint + `<ascii-tabs-spacing>` + sheet (copy, delete) + add.
- En lectura usa `readonly`.
- Es controlado: `value` y `spacing` salen del estado, y `change` o un cambio de spacing llaman a `setTabBlock`.
- No usa `<ascii-tabs-storage>`.

Los colores (`--ascii-tabs-*`) y la tipografía se mapean a los tokens de la app.

Borrado: si hay varios Tabs, el ícono borra ese Tab. Si es el último, elimina el bloque entero (también vacío),
sin confirmación. Usar el mecanismo de override de delete de ascii-tabs v0.1.4 si está publicado
(https://github.com/libasoles/ascii-tabs/issues/30). Si no:
- Un listener de click en captura sobre `.ascii-tabs-delete`, cuando queda un solo Tab, llama a `removeTabBlock`.
- Después de cada render se vuelve a habilitar el botón.
- Comentarlo con el link al issue.

Ver [spec](../spec.md).

**Blocked by:** 01

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Una canción sin tablaturas no descarga el chunk de ascii-tabs. `npm run build` lo muestra separado.
- [ ] Editar trastes y spacing actualiza el estado y el autosave lo guarda en Supabase. Recargar la página lo conserva.
- [ ] Borrar el último Tab elimina el bloque. Con varios Tabs, borra solo ese.
- [ ] En lectura no se ven hint, slider, add ni delete, y copiar funciona.
- [ ] Tests DOM (`*.test.tsx`), mockeando `import("ascii-tabs")` donde jsdom no alcance.
