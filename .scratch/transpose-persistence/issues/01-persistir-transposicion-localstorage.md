# 01: Persistir transposición en localStorage para el visor de solo lectura

**What to build:** Al transponer una canción ajena (modo lectura, `!isOwnSong`), el offset de
transposición (`{semitones, useFlats}` — no el texto ya transpuesto) se guarda en localStorage por id de
canción, siguiendo el mismo patrón que `justForkedStorage.ts`/`draftStorage.ts`. Al volver a cargar esa
misma canción en el mismo navegador, la transposición se reaplica automáticamente sobre el contenido
*actual* de `chords` y `vocalNotes` (no un snapshot), de modo que si el dueño agregó o cambió acordes o
notas entre visitas, lo nuevo también aparece ya transpuesto — porque lo persistido es "cuántos
semitonos", no "qué notas".

**Blocked by:** None (puede arrancar inmediatamente)

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Nuevo módulo de storage (mismo patrón que `src/editor/justForkedStorage.ts`: `STORAGE_KEY`,
      try/catch, `console.error` en fallo) que guarda `{semitones, useFlats}` por id de canción.
- [ ] Al mover el offset (`shift`) en modo solo lectura (`!isOwnSong`), cada cambio de offset se persiste
      en ese storage para el id de la canción actual.
- [ ] Al cargar una canción en modo solo lectura con una entrada guardada para su id, se reaplica el
      offset guardado sobre las celdas vivas de `chords` y `vocalNotes` en ese momento (vía
      `transposeChord`/`transposeNote`), no sobre un snapshot de texto guardado.
- [ ] El widget (`TransposeWidget`) arranca reflejando el offset restaurado (ej. "+2") sin que el usuario
      tenga que volver a tocar los botones +/-.
- [ ] Nada de esto se dispara para el dueño editando su propia canción (ese camino sigue yendo a la base
      de datos vía autosave, como hoy) ni en mobile.
- [ ] Test: agregar un acorde o nota nueva al "original" (simulando una edición posterior del dueño) y
      confirmar que, al reaplicar el offset guardado, ese contenido nuevo también queda transpuesto.
- [ ] Test: `useFlats` persistido se mantiene estable entre cargas, aunque `decideUseFlats` sobre el
      contenido actual diera otro resultado.
- [ ] Test: una canción sin entrada guardada (primera visita, o canción distinta) no dispara ningún
      replay y el widget arranca en offset 0 como hoy.
