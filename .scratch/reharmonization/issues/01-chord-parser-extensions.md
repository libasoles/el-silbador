# 01: El parser de acordes entiende extensiones y alteraciones del catálogo

**What to build:** Prefactor sin cambio visible. Las notas de un acorde se calculan también para acordes con 9ª, 11ª y 13ª, y los nombres con `♯`/`♭` del catálogo `guitar-chords` se leen igual que `#`/`b`. Hace falta para leer acordes ya escritos (modos 3 y 4 de la rearmonización).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Cmaj9, C9, Cm11, C13 y similares devuelven sus notas en solfeo
- [ ] `B♭`, `F♯m7` dan las mismas notas que `Bb`, `F#m7`
- [ ] El comportamiento actual de acordes triada y de séptima no cambia (tests existentes siguen verdes)
- [ ] Versión patch incrementada
