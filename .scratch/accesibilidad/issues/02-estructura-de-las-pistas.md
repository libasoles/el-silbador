# 02: Las pistas de acordes y notas tienen una estructura que un lector de pantalla entiende

**What to build:** Cada pista que se dibuja sobre un renglón (Acordes, Notas del acorde, Notas de
la melodía) se anuncia como un grupo con nombre. Hoy las filas tienen el rol de fila de tabla
(`role="row"`) pero no están dentro de una tabla, y además contienen botones, que una fila no puede
tener. Los lectores de pantalla las anuncian mal y Lighthouse marca `aria-required-children` y
`aria-required-parent`.

La opción recomendada es `role="group"` con el nombre de la pista. Armar una tabla completa
(`grid` → `row` → `gridcell`) también serviría, pero exige navegación de grilla y no es lo que
ofrece el editor. Ver [spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Ningún elemento del editor usa `role="row"` fuera de una tabla.
- [ ] Cada pista se expone como un grupo con su nombre ("Acordes", "Notas del acorde", "Notas de la melodía").
- [ ] Las flechas izquierda/derecha entre celdas siguen funcionando igual.
- [ ] Test de componente que busca las pistas por rol y nombre.
- [ ] En las páginas con editor, Lighthouse ya no marca `aria-required-children` ni `aria-required-parent`, y los pisos de accesibilidad de `lighthouserc.json` suben al puntaje nuevo.
