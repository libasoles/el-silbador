/**
 * Guitar chord fingering shapes used to draw the on-hover/on-tap diagram for a chord chip.
 * The catalog itself lives in the guitar-chords project (the `guitar-chords` dependency, the single
 * source of truth); fix or add fingerings there. Same notation: strings run
 * 6 (low E) to 1 (high E), frets count from the nut, "x" mutes a string and "o" plays it open.
 * 'position' (default 1) is the lowest fret shown, for shapes played higher up the neck.
 * `families` groups a chord for filter UI; `notes` lists the pitches it sounds, low to high.
 */

import { CHORDS } from "guitar-chords";

export type FingerValue = number | "x" | "o";

/** [string, fret|"x"|"o", finger label?] */
export type Finger = [number, FingerValue, string?];

export interface Barre {
  fromString: number;
  toString: number;
  fret: number;
}

export interface ChordShape {
  name: string;
  families?: string[];
  aliases?: string[];
  notes?: string;
  position?: number;
  barres?: Barre[];
  fingers: Finger[];
  /** Other hand-picked fingerings of the same chord, offered after the default (and the computed
   *  barre position) by the diagram's prev/next arrows. Each inherits the chord's name, families
   *  and aliases; only the fingering fields are given. */
  alternatePositions?: Pick<ChordShape, "fingers" | "barres" | "position" | "notes">[];
}

export const CHORD_SHAPES: ChordShape[] = CHORDS;
