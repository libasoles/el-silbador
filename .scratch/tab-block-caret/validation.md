# Validación del cursor lateral de tablaturas

Los tres tickets están implementados. Las pruebas se hicieron en el seam aprobado: `SongView` renderizado con `useEditor` y estado real.

- 43 pruebas del editor de tablaturas aprobadas, incluidos los casos existentes.
- Typecheck (`npx tsc --noEmit --incremental false`), lint y `git diff --check` aprobados.
- Chrome: áreas laterales de 12 px, cursor visible, Enter antes, recorrido entre bloques consecutivos, escritura, navegación interna y salida desde los extremos de una tablatura con cinco filas visuales.
- Chrome: composición IME real con `Input.imeSetComposition` y confirmación de texto, antes y después de una tablatura, sin duplicación.
- Revisión `code-review`: estándares y especificación sin hallazgos pendientes. Se corrigieron la composición IME y el anclaje de la selección después de Enter; se extrajo un componente común para los laterales.

La suite completa conserva un fallo previo en `src/app/articulos/usar-tablaturas/page.test.ts`: exige el encabezado `En el celular`, que el artículo ya no contiene. Se reprodujo también en `main`, sin los cambios de esta tarea.

Los cambios concurrentes de `main` se incorporaron antes de integrar la tarea, preservando los indicadores de carga de tablaturas y los cambios del índice móvil.
