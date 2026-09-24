# 06: Resilabeo reactivo + reconciliación

**What to build:** El usuario puede reeditar el texto de la letra en cualquier momento. El resilabeo de una
palabra se dispara al completarla (espacio o salto de línea) y, además, por debounce de 1 segundo de
inactividad si el usuario deja de escribir a mitad de palabra. Las anotaciones y uniones existentes se
conservan lo mejor posible vía una heurística de coincidencia de prefijo/sufijo entre la lista vieja y
nueva de sílabas de la palabra editada.

**Blocked by:** 04, 05

**Status:** done
**Agent:** antigravity

- [x] El texto de la letra ya silabeada se puede volver a editar (no es de solo lectura tras el silabeo
      inicial).
- [x] Al escribir espacio o Enter después de modificar una palabra, esa palabra se resilabea de inmediato.
- [x] Si el usuario deja de escribir a mitad de una palabra modificada (sin llegar a espacio/Enter) durante
      1 segundo, esa palabra se resilabea igual, por el mecanismo de debounce.
- [x] Los dos mecanismos no compiten: si el trigger de espacio/Enter llega primero, cancela cualquier
      debounce pendiente de esa misma palabra.
- [x] Si el número de sílabas de una palabra editada no cambia, las anotaciones y uniones de esa palabra en
      ambas pistas se conservan intactas.
- [x] Si cambia el número de sílabas, las anotaciones y uniones se reconcilian por coincidencia de
      prefijo/sufijo: sílabas que siguen existiendo conservan su anotación; sílabas nuevas quedan vacías;
      sílabas eliminadas pierden su anotación sin aviso al usuario.
- [x] Test: editar una palabra sin cambiar su cantidad de sílabas conserva anotaciones y uniones tal cual.
- [x] Test: editar una palabra que gana o pierde sílabas (ej. "amor" → "amores") aplica la heurística de
      prefijo/sufijo de forma verificable.
- [x] Test: el debounce de 1s y el trigger de word-boundary no producen un doble resilabeo de la misma
      edición.
