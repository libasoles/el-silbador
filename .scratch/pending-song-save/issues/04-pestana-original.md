# 04: La pestaña original también termina en la canción guardada

**What to build:** Si el magic link se abre en otra pestaña del mismo navegador, la pestaña donde se
escribió la canción también recibe la sesión y termina mostrando la canción guardada en
`/cancion/<slug>`, sin crear un duplicado. Caso borde. Ver [[spec.md]].

**Blocked by:** 01

**Status:** done
**Agent:** claude

- [x] Cada pestaña que recibe la sesión con una canción pendiente la reanuda; el upsert idempotente
      evita duplicados.
- [x] Si otra pestaña ya guardó y borró la copia local, la pestaña original usa el id de creación que
      tiene en memoria para encontrar el slug y navegar.
- [x] Ninguna pestaña queda en `/nueva` con cambios "sin guardar" de una canción ya guardada.
- [x] Test del caso "la copia local ya fue borrada por otra pestaña".
