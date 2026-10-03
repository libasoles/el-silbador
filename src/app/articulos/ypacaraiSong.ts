/** The first verse of "Recuerdos de Ypacaraí" (Demetrio Ortiz): lyrics only, ready for its
 *  melody. */
export const YPACARAI_SHEET = `Una noche tibia nos conocimos
Junto al lago azul de Ypacaraí
Tú cantabas triste por el camino
Viejas melodías en guaraní`;

/** Its melody in C, one note per syllable. In the second line three pairs of syllables are sung
 *  as one note: "to al", "go a" and "de Y". */
export const YPACARAI_MELODY = [
  "do mi↑ sol mi↓ la↑ la sol↓ mi do la↑ la",
  "do↓ mi + sol mi↓ + la↑ la + sol↓ mi↓ fa↑ sol",
  "si↓ re fa re↓ la↑ la sol↓ fa re la↑ la",
  "re↓ mi fa la do do do si↓ sol mi↓",
];

/** The same melody with "Junto al" not joined yet: "to" and "al" still have a note slot each. */
export const YPACARAI_MELODY_UNJOINED = [
  YPACARAI_MELODY[0]!,
  "do↓ mi _ sol mi↓ + la↑ la + sol↓ mi↓ fa↑ sol",
  YPACARAI_MELODY[2]!,
  YPACARAI_MELODY[3]!,
];

/** The same melody with no arrows, so the reader can add them. */
export const YPACARAI_MELODY_FLAT = YPACARAI_MELODY.map((line) => line.replace(/[↑↓]/g, ""));

/** The same lyrics with their chords on top, so transposing moves chords and notes together. */
export const YPACARAI_CHORD_SHEET = `C
Una noche tibia nos conocimos
                             G7
Junto al lago azul de Ypacaraí
            Dm
Tú cantabas triste por el camino
F          G7           C
Viejas melodías en guaraní`;
