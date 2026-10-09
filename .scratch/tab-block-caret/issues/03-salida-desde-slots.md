# 03: Salir de los slots hacia los laterales

**What to build:** Abandonar la edición de slots mediante arriba o abajo al alcanzar los extremos visuales del tab block y continuar insertando contenido desde su lateral. Ver [spec](../spec.md).

**Blocked by:** 01: Insertar contenido desde los laterales de una tablatura.

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Arriba en el extremo visual superior enfoca el lateral anterior.
- [ ] Abajo en el extremo visual inferior enfoca el lateral posterior.
- [ ] Dentro del bloque se conserva la navegación entre cuerdas y filas visuales; llegar a la primera o última cuerda de una fila intermedia no provoca una salida prematura.
- [ ] La salida conserva los trastes escritos y no agrega contenido ni entradas de deshacer.
- [ ] Desde el lateral enfocado funcionan Enter, escritura y pegado según las reglas del ticket 01.
- [ ] Entre bloques consecutivos se usa el punto de inserción compartido, dibujado antes del segundo.
- [ ] Los eventos que siguen editando slots permanecen contenidos en la tablatura y no modifican la letra.
- [ ] Pruebas del editor renderizado cubren ambas salidas, inserción posterior y conservación de datos.
- [ ] Una comprobación en navegador cubre tablaturas con varias filas visuales y verifica que las flechas internas siguen funcionando.
- [ ] No se habilitan acciones de edición en móvil ni modo lectura.
