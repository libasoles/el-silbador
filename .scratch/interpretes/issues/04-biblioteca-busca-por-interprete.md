# 04: La biblioteca encuentra canciones por intérprete

**What to build:** Buscar "tamara" en la biblioteca encuentra la "Zamba de amor en vuelo" (autor
Jorge Milikota, intérprete Tamara Castro). Las listas de la biblioteca traen los intérpretes de cada
canción. Los matches por intérprete se ordenan después de los matches por título y por autor. Cuando
una canción aparece por un intérprete, su fila suma un renglón "Interpretada por:" con solo los
intérpretes que coinciden y el término resaltado. Ver [spec](../spec.md).

**Blocked by:** 01 (búsqueda sin acentos y por relevancia), 02 (El admin carga intérpretes)

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Las listas de canciones públicas, propias y favoritas incluyen los intérpretes sin una consulta
      extra por canción.
- [ ] Buscar por un intérprete (con o sin acentos) encuentra sus canciones.
- [ ] Orden: título > autor > intérprete.
- [ ] El renglón "Interpretada por:" aparece solo cuando el match fue por intérprete y lista solo los
      que coinciden, resaltados.
- [ ] Tests de componente de la biblioteca buscando por intérprete.
