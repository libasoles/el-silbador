# 05: Segunda pista + toggles de visibilidad

**What to build:** Una segunda pista fija, "Notas de canto", con el mismo comportamiento de celdas
editables que "Acordes" (navegación por sílaba, edición libre). Además, un botón de mostrar/ocultar
independiente por cada una de las dos pistas, con color solo en el estado activo del botón.

**Blocked by:** 03

**Status:** done

**Agent:** codex

- [x] Existe una segunda pista "Notas de canto" con celdas ancladas a las mismas posiciones (pre/entre/post
      sílaba) que "Acordes", editable con el mismo mecanismo de navegación por flechas + edición libre.
- [x] Hay un botón para mostrar/ocultar la pista "Acordes" (equivalente al botón existente en el cancionero
      actual) y otro botón independiente para "Notas de canto".
- [x] Ocultar una pista no borra su contenido; solo deja de renderizarse hasta que se vuelve a mostrar.
- [x] El botón de una pista visible se distingue visualmente con color (único uso de color permitido acá,
      junto con el texto de las anotaciones); el resto de la UI se mantiene blanco y negro.
- [x] El estado de "qué pistas existen" y "cuáles están visibles" vive en `src/core`, de forma genérica (no
      hardcodeada a nombres de pista específicos en la lógica de estado, aunque la app solo instancie estas
      dos).
- [x] Test: togglear visibilidad de cada pista de forma independiente no afecta el contenido ni la
      visibilidad de la otra.
