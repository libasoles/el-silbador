# 04: La letra se anuncia como texto editable al editar y como texto al leer

**What to build:** Al editar, la letra se anuncia como un campo de texto con nombre ("Letra de la
canción") y cada renglón se puede identificar ("Renglón 2 de la letra"). Al leer, la letra es texto
común: ningún renglón se presenta como campo editable.

Hoy cada renglón tiene `role="textbox"` sin nombre, también en modo lectura. Además, el contenedor
de `/nueva` tiene un `aria-label` sobre un `div` sin rol, que los lectores ignoran. Lighthouse marca
`aria-input-field-name` y `aria-prohibited-attr`. Ver [spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** done
**Agent:** unassigned

- [ ] Editando, el área de la letra es un campo de texto multilínea con el nombre "Letra de la canción".
- [ ] Ningún elemento con rol de campo queda sin nombre.
- [ ] En modo lectura (visitantes, mobile), los renglones no tienen rol de campo de texto.
- [ ] No hay `aria-label` sobre elementos sin un rol que lo admita.
- [ ] Escribir, pegar, el cursor y el BIS con Tab funcionan igual que antes.
- [ ] Tests de componente que cubren edición y lectura.
- [ ] Lighthouse ya no marca `aria-input-field-name` ni `aria-prohibited-attr`, y los pisos de accesibilidad de `lighthouserc.json` suben al puntaje nuevo.
