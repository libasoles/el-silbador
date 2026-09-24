# 03: Pista "Acordes" editable

**What to build:** Encima de la letra silabeada, una fila de celdas de texto libre ancladas a posiciones
(pre-palabra, entre sílabas dentro de una palabra, post-palabra/post-línea). El usuario navega entre celdas
con las flechas del teclado (una celda por posición de sílaba) y edita texto libre normal dentro de la
celda activa. Esta es la pista "Acordes".

**Blocked by:** 02

**Status:** done
**Agent:** claude

- [x] Cada línea de letra silabeada tiene, encima, una fila de celdas de la pista "Acordes" — una celda por
      posición: antes de la primera sílaba de la línea, entre cada par de sílabas, y después de la última.
- [x] Click/tap en una celda la pone en modo edición y permite escribir texto libre multi-carácter (ej.
      "G7", "Dm7", cualquier string).
- [x] Las flechas ← → mueven el foco a la celda anterior/siguiente (una celda = una posición de sílaba), no
      carácter por carácter dentro del texto de la letra.
- [x] El texto escrito en una celda persiste visualmente al mover el foco a otra celda o al hacer blur.
- [x] El estado de las celdas de la pista vive en `src/core`, direccionable por posición, testeable sin
      renderizar componentes React.
- [x] Test: escribir texto en una celda pre/entre/post y leerlo de vuelta desde el estado del núcleo
      devuelve el valor correcto en la posición correcta.
