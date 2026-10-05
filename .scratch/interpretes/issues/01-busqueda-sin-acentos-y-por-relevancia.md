# 01: La búsqueda de la biblioteca ignora acentos y ordena por relevancia

**What to build:** Prefactor de la búsqueda de la biblioteca antes de sumarle intérpretes. Buscar
"cancion" encuentra "Canción" (y al revés), y los resultados que coinciden por título aparecen antes
que los que coinciden solo por autor. El resaltado de los términos también ignora acentos. El
criterio de orden tiene que poder extenderse después con un tercer nivel (intérprete) sin
reescribirlo. Ver [spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Buscar sin acentos encuentra títulos y autores con acentos, y viceversa.
- [ ] Las canciones con match en el título se listan antes que las que solo tienen match en el autor.
- [ ] El resaltado marca el texto original (con acentos) aunque la búsqueda no los tenga.
- [ ] Tests de la lógica de match y orden, y de lo que la biblioteca muestra al buscar.
