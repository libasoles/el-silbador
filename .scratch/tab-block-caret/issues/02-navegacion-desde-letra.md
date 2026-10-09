# 02: Navegar entre letra y laterales con las flechas

**What to build:** Recorrer el texto y las posiciones laterales de los tab blocks con el teclado, usando las inserciones del ticket 01. Ver [spec](../spec.md).

**Blocked by:** 01: Insertar contenido desde los laterales de una tablatura.

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Derecha recorre texto → antes del bloque → después del bloque → siguiente contenido; izquierda invierte el recorrido.
- [ ] Desde la letra, abajo hacia una tablatura llega al lateral anterior; arriba llega al posterior.
- [ ] Desde el lateral anterior, arriba va al contenido previo y abajo al posterior.
- [ ] Desde el lateral posterior, arriba va al anterior y abajo al contenido siguiente.
- [ ] En los extremos del documento, el cursor permanece en su posición.
- [ ] Entre bloques consecutivos se recorre una sola vez el punto compartido, dibujado antes del segundo.
- [ ] Navegar no modifica contenido ni crea entradas de deshacer.
- [ ] Enter, escritura y pegado funcionan desde las posiciones alcanzadas con flechas, conservando las reglas del ticket 01.
- [ ] Pruebas del editor renderizado verifican posición del cursor e inserción posterior para bloques al principio, al final, aislados, entre renglones y consecutivos.
- [ ] Se mantienen la selección con modificadores y la navegación de otros controles.
- [ ] Se conserva el gating de edición en móvil y modo lectura.
- [ ] Una comprobación en navegador confirma el cursor visible durante el recorrido con flechas.
