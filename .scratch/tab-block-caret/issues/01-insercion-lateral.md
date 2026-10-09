# 01: Insertar contenido desde los laterales de una tablatura

**What to build:** Posicionar un cursor visible mediante clic antes o después de un tab block e insertar contenido desde allí. Esta entrega resuelve el problema original usando el mouse. Ver [spec](../spec.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Clic en el lateral izquierdo enfoca antes; clic en el derecho, después. Los slots y controles conservan sus interacciones.
- [ ] Las posiciones son virtuales: enfocarlas no modifica la canción ni crea entradas de deshacer.
- [ ] Enter antes agrega un renglón arriba y conserva el cursor junto al bloque desplazado.
- [ ] Enter después agrega un renglón abajo y mueve el cursor allí.
- [ ] Escritura y pegado insertan contenido en el lado seleccionado mediante las reglas existentes del editor.
- [ ] Entre tablaturas consecutivas existe un único punto de inserción, dibujado antes de la segunda.
- [ ] Se conservan identidad, trastes y espaciado del bloque; deshacer/rehacer funciona.
- [ ] Backspace/Delete desde una posición virtual no eliminan ni fusionan el bloque. Se conserva la eliminación explícita mediante selección.
- [ ] Solo disponible en escritorio con permiso de edición, con gating de render/prop mediante `useIsMobile` y `canEdit`.
- [ ] Pruebas con el editor renderizado verifican inserciones y posición del cursor para bloques al principio, al final, aislados, entre renglones y consecutivos.
- [ ] Pruebas de comportamiento cubren escritura, pegado, deshacer/rehacer, Backspace/Delete, móvil y lectura.
- [ ] Una comprobación visual en navegador verifica el cursor visible y las áreas de clic sin interferencias con slots ni controles.
