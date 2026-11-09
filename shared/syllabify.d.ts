/**
 * Spanish syllabification (silabeo) based on standard RAE phonological and grammatical rules.
 *
 * Typesetting hyphenators (like TeX hyphenation patterns / Hypher) are designed for line-breaking,
 * enforcing minimum distances from word boundaries (leftmin/rightmin >= 2, inhibiting breaks before
 * "-no", etc.). That makes them unsuitable for musical and linguistic syllable division (e.g.
 * "ca-mi-no", "a-mor", "Y-pa-ca-ra-í").
 *
 * This implementation divides words into Spanish syllables according to RAE orthography:
 * 1. Identification of vocalic nuclei (handling diphthongs, triphthongs, and hiatuses).
 * 2. Proper handling of vocalic 'y' (e.g. "Ypacaraí", "hay", "buey").
 * 3. Proper handling of digraphs (ch, ll, rr) and silent 'u' in qu/gu.
 * 4. Consonant distribution between vocalic nuclei (inseparable clusters like bl, pr, etc.).
 * 5. Preservation of leading/trailing non-letter punctuation.
 */
/** Splits a single word into its Spanish syllables. Non-letter tokens are returned as-is. */
export declare function hyphenateWord(rawWord: string): string[];
/** Where each word of a raw lyric line starts, in the same order `splitIntoWords` returns them.
 *  `closesBlock` marks the line that ends a multi-line free-text block. */
export declare function wordStartColumns(line: string, closesBlock?: boolean): number[];
/** Whether a word is free text: written between `<--` and `-->` (or, on the line closing a
 *  multi-line block, ending in `-->` after spaces), so it is never syllabified and never carries
 *  chords or notes. */
export declare function isFreeTextToken(word: string): boolean;
/** Splits a line of lyrics into words, on whitespace, preserving nothing else about layout. Free
 *  text between `<--` and `-->` stays together as one word, and so does everything up to the `-->`
 *  on a line that `closesBlock`. */
export declare function splitIntoWords(line: string, closesBlock?: boolean): string[];
