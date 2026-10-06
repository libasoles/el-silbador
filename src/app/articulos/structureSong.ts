import type { BisGroup } from "../../core/types";

/** The section labels the editor shows as subtitles, as a reader would write them. */
export const STRUCTURE_KEYWORDS = [
  "Introducción",
  "Intro",
  "Estrofa",
  "Estribillo",
  "Interludio",
  "Primera",
  "Segunda",
  "Remate",
  "Cogollo",
  "Coda",
] as const;

/** The start of "Tonada de un viejo amor", each chord above its syllable. Kept apart from the
 *  copy in ArticleChordEditor: values exported by a client module can't be read on the server. */
export const TONADA_SHEET = `    A           A7     D
Ya nunca te he de olvidar
       E7           A
en la arena me escribias
             A7    D
El viento lo fue borrando
    B7      E7              A
y estoy mas solo mirando el mar`;

export const LABELED_EXCERPT = `Estrofa
${TONADA_SHEET}`;

/** An empty first line for the reader to write a section label on. */
export const UNLABELED_EXCERPT = `
Ya nunca te he de olvidar
en la arena me escribias`;

export const BIS_EXCERPT = `${TONADA_SHEET} BIS`;

/** The last two lines of `BIS_EXCERPT`, repeated together. */
export const MULTI_BIS_GROUPS: BisGroup[] = [
  { startLineIndex: 2, endLineIndex: 3 },
];
