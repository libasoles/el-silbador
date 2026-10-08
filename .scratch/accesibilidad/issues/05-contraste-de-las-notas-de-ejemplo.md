# 05: Las notas de los ejemplos del artículo de notas se leen con buen contraste

**What to build:** En "Notas de la canción", las notas de los ejemplos animados se leen con contraste
suficiente (al menos 4.5:1 sobre el fondo) durante toda la animación, incluidos los momentos de
parpadeo y la nota que baja.

Hoy Lighthouse mide 3.74:1 en la nota que parpadea (#b17065 sobre #fbfaf7) y 2.39:1 en la nota que
baja (#c79990 sobre #fbfaf7). La animación puede seguir señalando lo mismo, por ejemplo cambiando
de tono o de fondo en vez de aclarar el texto. Ver [spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** done
**Agent:** unassigned

- [ ] Ningún texto de los ejemplos baja de 4.5:1 en ningún momento de la animación.
- [ ] El ejemplo sigue mostrando claramente qué nota parpadea y cuál baja.
- [ ] Lighthouse ya no marca `color-contrast` en el artículo, y el piso de accesibilidad de `lighthouserc.json` sube al puntaje nuevo.
