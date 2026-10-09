# 03: Salir de los slots hacia los laterales

**What to build:** Abandonar la edición de slots mediante arriba o abajo al alcanzar los extremos visuales del tab block y continuar insertando contenido desde su lateral. Ver [spec](../spec.md).

**Blocked by:** 01: Insertar contenido desde los laterales de una tablatura.

**Status:** resolved
**Agent:** codex

- [x] Arriba en el extremo visual superior enfoca el lateral anterior.
- [x] Abajo en el extremo visual inferior enfoca el lateral posterior.
- [x] Dentro del bloque se conserva la navegación entre cuerdas y filas visuales; llegar a la primera o última cuerda de una fila intermedia no provoca una salida prematura.
- [x] La salida conserva los trastes escritos y no agrega contenido ni entradas de deshacer.
- [x] Desde el lateral enfocado funcionan Enter, escritura y pegado según las reglas del ticket 01.
- [x] Entre bloques consecutivos se usa el punto de inserción compartido, dibujado antes del segundo.
- [x] Los eventos que siguen editando slots permanecen contenidos en la tablatura y no modifican la letra.
- [x] Pruebas del editor renderizado cubren ambas salidas, inserción posterior y conservación de datos.
- [x] Una comprobación en navegador cubre tablaturas con varias filas visuales y verifica que las flechas internas siguen funcionando.
- [x] No se habilitan acciones de edición en móvil ni modo lectura.

## Validación

Implementado: pruebas con el editor renderizado y comprobación en Chrome de laterales, navegación, inserción y una tablatura con cinco filas visuales.
