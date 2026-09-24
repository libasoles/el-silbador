# 07: Drag & drop de anotaciones

**What to build:** El usuario puede tomar una anotación ya escrita en una celda de pista y arrastrarla
(drag & drop) a otra celda de la misma pista. Durante el arrastre hay una animación de tamaño/color en la
anotación y la celda destino se resalta; al soltar, la anotación vuelve a su apariencia normal en la nueva
posición. El subrayado "lava" de las uniones de sílabas reacciona de forma fluida durante la interacción.

**Blocked by:** 04, 05

**Status:** done

**Agent:** claude

- [x] Una celda con texto se puede arrastrar (mouse/touch) hacia otra celda de la misma pista.
- [x] Mientras se arrastra, la anotación muestra una animación visible de tamaño y color distinta a su
      estado en reposo.
- [x] La celda destino se resalta visualmente mientras la anotación arrastrada está sobre ella.
- [x] Al soltar sobre una celda destino, el texto se mueve ahí (la celda origen queda vacía) y la anotación
      vuelve a su apariencia normal.
- [x] Al soltar fuera de cualquier celda válida, la anotación vuelve a su celda de origen sin cambios.
- [x] El subrayado de uniones de sílabas activas usa un efecto animado fluido ("lava", tipo indicador de
      pestañas) al menos durante el arrastre sobre celdas fusionadas.
- [x] La operación de mover el contenido de una celda a otra existe como acción del núcleo en `src/core`
      (independiente del evento de drag del navegador), testeable sin simular drag real.
- [x] Test: mover el contenido de una celda a otra vía la acción del núcleo preserva el texto en el destino
      y vacía el origen.
