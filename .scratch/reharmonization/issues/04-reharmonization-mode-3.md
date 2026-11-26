# 04: Modo 3, extensión armónica por acordes

**What to build:** Se habilita el radio 3. Sugiere acordes de 7, 9, 11 y 13 del campo armónico que contienen la nota en cualquier posición, anotados completos (ej. Cmaj7). Un acorde por grado: la extensión más alta que contiene la nota. Solo se ofrecen acordes que existen en el catálogo `guitar-chords`; los que faltan (m7♭5 fuera de B, m13, maj13) simplemente no aparecen hasta actualizar esa dependencia (ver `guitar-chords-prompt.md`).

**Blocked by:** 02, 01.

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] El radio 3 queda habilitado y activable
- [ ] En Do mayor, "re" ofrece Cmaj9 y no Cmaj7 junto con Cmaj9
- [ ] Bm7b5 aparece cuando la nota y la tonalidad lo piden
- [ ] Un acorde fuera del catálogo nunca se sugiere
- [ ] Tests de teoría y de popup
- [ ] Versión minor incrementada
