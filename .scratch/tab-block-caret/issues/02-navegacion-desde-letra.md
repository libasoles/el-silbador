# 02: Navegar entre letra y laterales con las flechas

**What to build:** Recorrer el texto y las posiciones laterales de los tab blocks con el teclado, usando las inserciones del ticket 01. Ver [spec](../spec.md).

**Blocked by:** 01: Insertar contenido desde los laterales de una tablatura.

**Status:** resolved
**Agent:** codex

- [x] Derecha recorre texto → antes del bloque → después del bloque → siguiente contenido; izquierda invierte el recorrido.
- [x] Desde la letra, abajo hacia una tablatura llega al lateral anterior; arriba llega al posterior.
- [x] Desde el lateral anterior, arriba va al contenido previo y abajo al posterior.
- [x] Desde el lateral posterior, arriba va al anterior y abajo al contenido siguiente.
- [x] En los extremos del documento, el cursor permanece en su posición.
- [x] Entre bloques consecutivos se recorre una sola vez el punto compartido, dibujado antes del segundo.
- [x] Navegar no modifica contenido ni crea entradas de deshacer.
- [x] Enter, escritura y pegado funcionan desde las posiciones alcanzadas con flechas, conservando las reglas del ticket 01.
- [x] Pruebas del editor renderizado verifican posición del cursor e inserción posterior para bloques al principio, al final, aislados, entre renglones y consecutivos.
- [x] Se mantienen la selección con modificadores y la navegación de otros controles.
- [x] Se conserva el gating de edición en móvil y modo lectura.
- [x] Una comprobación en navegador confirma el cursor visible durante el recorrido con flechas.

## Validación

Implementado: pruebas con el editor renderizado y comprobación en Chrome de laterales, navegación, inserción y una tablatura con cinco filas visuales.
