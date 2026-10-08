# 04: Pegar tablaturas en ASCII las convierte en bloques

**What to build:** Al pegar texto en el editor, cada tramo contiguo de staves ASCII (seis líneas con label
`1`–`6` o `e B G D A E`, como acepta `parse` de ascii-tabs) se convierte en un bloque de tablatura con un
Tab, en su posición. El resto del texto (letra, acordes) sigue por `parseChordSheet`. La partición del
texto es una función pura en `src/core/asciiTabPaste.ts`, testeable sin la librería. Para convertir cada
tramo se usa `parse` con import dinámico. Ver [spec](../spec.md).

**Blocked by:** 01, 03

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Pegar solo una tablatura crea un bloque con su contenido.
- [ ] Pegar letra + acordes + dos tablaturas separadas crea dos bloques en sus posiciones, con letra y acordes como hoy.
- [ ] Varias staves seguidas se unen en un solo Tab, como hace `parse`.
- [ ] Tests unitarios del detector de tramos.
