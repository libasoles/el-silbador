/** "Que los cumplas feliz", the Argentine birthday song: lyrics only, ready for its melody. */
export const BIRTHDAY_SHEET = `Que los cumplas feliz
que los cumplas feliz
que los cumplas tía Ana
que los cumplas feliz`;

/** Its melody in C, one note per syllable. "tía Ana" is sung as three notes: the "a" of "tía"
 *  and the "A" of "Ana" share one. */
export const BIRTHDAY_MELODY = [
  "sol sol la↑ sol↓ do↑ si↓",
  "sol↓ sol la↑ sol↓ re↑ do↓",
  "sol↓ sol sol↑ mi↓ do↓ si↓ + la↓",
  "fa↑ fa mi↓ do↓ re↑ do↓",
];

/** The same melody before any syllable is joined: "a" and "A" still have a note slot each. */
export const BIRTHDAY_MELODY_UNJOINED = [
  BIRTHDAY_MELODY[0]!,
  BIRTHDAY_MELODY[1]!,
  "sol↓ sol sol↑ mi↓ do↓ si↓ _ la↓",
  BIRTHDAY_MELODY[3]!,
];

/** The same melody with no arrows, so the reader can add them. */
export const BIRTHDAY_MELODY_FLAT = BIRTHDAY_MELODY.map((line) => line.replace(/[↑↓]/g, ""));

/** The same lyrics with their chords on top, so transposing moves chords and notes together. */
export const BIRTHDAY_CHORD_SHEET = `C                 G7
Que los cumplas feliz
G7                C
que los cumplas feliz
C7              F
que los cumplas tía Ana
C               G7 C
que los cumplas feliz`;
