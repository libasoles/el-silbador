# 03: Cada celda de acorde o nota dice qué es y sobre qué sílaba está

**What to build:** Un lector de pantalla anuncia cada celda de las pistas con un nombre útil, en vez
de "botón" sin más. Por ejemplo:

- Con acorde: "Acorde C sobre «U»".
- Vacía, editando: "Agregar acorde sobre «na»".
- Con nota: "Nota mi sobre «no»".
- Para las posiciones entre sílabas y al principio del renglón, un nombre equivalente como
  "Acorde entre «na» y «no»" o "Acorde al principio del renglón".

En modo lectura, una celda que al tocarla no hace nada no debería ser un botón. Hoy pasa con las
vacías y con las notas: en solo lectura tocarlas no abre nada. Solo los acordes conocidos, que
abren el diagrama, siguen siendo botones. El texto sigue igual para quien lo ve. Ver
[spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** done
**Agent:** unassigned

- [ ] Toda celda que sea botón tiene un nombre que dice la pista, el contenido (o la acción si está vacía) y la sílaba.
- [ ] En modo lectura, las celdas vacías y las notas no son elementos interactivos ni se pueden enfocar con Tab. Los acordes con diagrama siguen abriéndolo al tocarlos.
- [ ] Editando, nada cambia: clic, doble clic, arrastrar y navegar con flechas funcionan igual.
- [ ] Tests de componente que buscan las celdas por rol y nombre, en edición y en lectura.
- [ ] En las páginas con editor, Lighthouse ya no marca `button-name`, y los pisos de accesibilidad de `lighthouserc.json` suben al puntaje nuevo.
