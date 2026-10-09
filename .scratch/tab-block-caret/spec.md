# Cursor lateral para tablaturas

**Status:** ready-for-agent
**Agent:** unassigned

## Problem Statement

Cuando una canción comienza con una tablatura, el autor no puede posicionar el cursor antes del bloque para agregar un renglón arriba. También falta una forma natural de insertar texto entre tablaturas consecutivas.

Actualmente, el cursor de la letra salta los tab blocks y las flechas dentro de sus slots permanecen en el bloque al alcanzar sus extremos.

## Solution

Representar cada tab block como un bloque con dos posiciones virtuales de cursor: antes, en su lateral izquierdo, y después, en su lateral derecho.

El autor puede llegar a esas posiciones mediante flechas o clics y usarlas para insertar renglones o texto. Navegar no modifica la canción. La tablatura conserva sus datos al insertar contenido alrededor.

## User Stories

1. Como autor, quiero posicionar el cursor antes de la primera tablatura para agregar contenido al comienzo de la canción.
2. Como autor, quiero posicionar el cursor después de la última tablatura para continuar la canción.
3. Como autor, quiero insertar un renglón entre tablaturas consecutivas para separar sus contenidos.
4. Como autor, quiero ver el cursor en el lateral seleccionado para reconocer dónde se insertará el contenido.
5. Como autor, quiero hacer clic en el lateral izquierdo para insertar contenido antes del bloque.
6. Como autor, quiero hacer clic en el lateral derecho para insertar contenido después del bloque.
7. Como autor, quiero seguir haciendo clic en los slots para editar los trastes.
8. Como autor, quiero recorrer las posiciones laterales con izquierda y derecha para navegar en orden por la canción.
9. Como autor, quiero llegar desde la letra a un lateral usando arriba o abajo para continuar navegando con el teclado.
10. Como autor, quiero salir del extremo superior de la tablatura con arriba para acceder al contenido anterior.
11. Como autor, quiero salir del extremo inferior con abajo para acceder al contenido posterior.
12. Como autor, quiero mantener la navegación entre filas visuales de una tablatura larga para recorrer todos sus slots.
13. Como autor, quiero que Enter antes del bloque agregue un renglón arriba y mantenga el cursor junto a la tablatura desplazada para conservar el movimiento natural de Enter.
14. Como autor, quiero que Enter después del bloque agregue un renglón inferior y lleve el cursor allí para continuar escribiendo.
15. Como autor, quiero escribir desde un lateral para crear texto en ese lado sin alterar la tablatura.
16. Como autor, quiero pegar contenido desde un lateral para incorporarlo mediante las reglas existentes del editor.
17. Como autor, quiero navegar sin guardar renglones vacíos involuntarios para conservar el contenido de mi canción.
18. Como autor, quiero deshacer y rehacer las inserciones para corregir cambios sin perder la tablatura.
19. Como autor, quiero que Backspace y Delete junto al bloque no lo eliminen accidentalmente.
20. Como lector o usuario móvil, quiero conservar el modo de lectura sin acciones nuevas de edición.

## Implementation Decisions

- `SongView` coordina las posiciones virtuales, su representación visual y las inserciones. `TabBlock` comunica la salida desde sus extremos mediante un callback interno.
- La posición virtual identifica el bloque y su lado. Es estado transitorio: no agrega texto ficticio al documento ni modifica el modelo persistido.
- El recorrido horizontal es texto → antes del bloque → después del bloque → siguiente contenido; izquierda invierte ese recorrido.
- Desde la letra, abajo hacia un bloque enfoca su lateral anterior; arriba enfoca el posterior.
- Desde los slots, arriba sale al lateral anterior únicamente en el extremo visual superior; abajo sale al posterior únicamente en el extremo visual inferior. Se conserva la navegación interna entre filas.
- Desde el lateral anterior, arriba va al contenido previo y abajo al lateral posterior. Desde el posterior, arriba va al anterior y abajo al contenido siguiente. En los extremos del documento, el cursor permanece allí.
- Entre bloques consecutivos, después del primero y antes del segundo representan una única posición, dibujada en el lateral anterior del segundo.
- Enter antes inserta un renglón vacío arriba y conserva el cursor virtual antes del bloque desplazado. Enter después inserta un renglón debajo y coloca el cursor en ese nuevo renglón.
- Escribir o pegar materializa contenido en el lado seleccionado mediante el flujo existente de edición, conservando la identidad y los datos de la tablatura.
- Backspace/Delete con cursor virtual no eliminan ni fusionan el bloque. Se mantienen las operaciones existentes de selección y eliminación explícita.
- Los clics laterales se distinguen de los clics en slots y controles del bloque.
- Las posiciones virtuales de edición solo están disponibles en escritorio con permiso de edición; aplicar el gating de `useIsMobile` y `canEdit` a nivel de render/prop.
- No se requieren migraciones ni cambios en el formato persistido de las canciones.

## Testing Decisions

- Usar como seam principal el editor renderizado con estado real, siguiendo las pruebas existentes de `SongView` con tab blocks.
- Verificar comportamiento observable: foco, cursor visible, contenido resultante y conservación de trastes y espaciado. Evitar pruebas que inspeccionen código fuente o estado privado.
- Cubrir una tablatura al comienzo, al final, como único contenido y entre renglones; incluir bloques consecutivos.
- Probar clics laterales, navegación horizontal y vertical, salida desde slots e inserciones mediante Enter, escritura y pegado.
- Comprobar la ubicación del cursor después de Enter antes y después del bloque.
- Comprobar que navegar no modifica el documento y que deshacer/rehacer conserva las tablaturas.
- Probar tablaturas con varias filas visuales para evitar salidas prematuras.
- Verificar que Backspace/Delete laterales preservan el bloque.
- Verificar móvil mediante `mockMatchMedia(true)` y cubrir también el modo lectura.
- Complementar con una comprobación en navegador del cursor visible, las áreas de clic y la navegación en tablaturas que se ajustan al ancho disponible.

## Out of Scope

- Botones nuevos para insertar renglones.
- Atajos adicionales.
- Cambios en la edición de trastes, exportación PDF o Tabs toggle.
- Edición en móvil.
- Rediseñar la selección de rangos o la eliminación explícita de tab blocks.

## Further Notes

- El usuario aprobó tres entregas: inserción mediante clic en laterales, navegación desde la letra y salida desde slots. Las dos últimas dependen únicamente de la primera.
- Cada ticket incluye sus pruebas de comportamiento; no hay un ticket separado de infraestructura ni de pruebas.
- Al implementar, seguir el flujo del repositorio: worktree y rama propios, incremento patch por commit, validación, merge local a `main` y limpieza, sin push.
