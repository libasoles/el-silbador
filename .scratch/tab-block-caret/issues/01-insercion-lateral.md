# 01: Insertar contenido desde los laterales de una tablatura

**What to build:** Posicionar un cursor visible mediante clic antes o después de un tab block e insertar contenido desde allí. Esta entrega resuelve el problema original usando el mouse. Ver [spec](../spec.md).

**Blocked by:** None (can start immediately).

**Status:** resolved
**Agent:** codex

- [x] Clic en el lateral izquierdo enfoca antes; clic en el derecho, después. Los slots y controles conservan sus interacciones.
- [x] Las posiciones son virtuales: enfocarlas no modifica la canción ni crea entradas de deshacer.
- [x] Enter antes agrega un renglón arriba y conserva el cursor junto al bloque desplazado.
- [x] Enter después agrega un renglón abajo y mueve el cursor allí.
- [x] Escritura y pegado insertan contenido en el lado seleccionado mediante las reglas existentes del editor.
- [x] Entre tablaturas consecutivas existe un único punto de inserción, dibujado antes de la segunda.
- [x] Se conservan identidad, trastes y espaciado del bloque; deshacer/rehacer funciona.
- [x] Backspace/Delete desde una posición virtual no eliminan ni fusionan el bloque. Se conserva la eliminación explícita mediante selección.
- [x] Solo disponible en escritorio con permiso de edición, con gating de render/prop mediante `useIsMobile` y `canEdit`.
- [x] Pruebas con el editor renderizado verifican inserciones y posición del cursor para bloques al principio, al final, aislados, entre renglones y consecutivos.
- [x] Pruebas de comportamiento cubren escritura, pegado, deshacer/rehacer, Backspace/Delete, móvil y lectura.
- [x] Una comprobación visual en navegador verifica el cursor visible y las áreas de clic sin interferencias con slots ni controles.

## Validación

Implementado: pruebas con el editor renderizado y comprobación en Chrome de laterales, navegación, inserción y una tablatura con cinco filas visuales.
