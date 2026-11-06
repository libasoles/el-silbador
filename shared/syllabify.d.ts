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
/** Splits a line of lyrics into words, on whitespace, preserving nothing else about layout. */
export declare function splitIntoWords(line: string): string[];
