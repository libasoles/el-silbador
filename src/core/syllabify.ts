import Hypher from "hypher";
import spanishPatterns from "hyphenation.es";

const hypher = new Hypher(spanishPatterns);

/** Splits a single word into its Spanish syllables. Non-letter tokens are returned as-is. */
export function hyphenateWord(word: string): string[] {
  if (word.length === 0) return [];
  return hypher.hyphenate(word);
}

/** Splits a line of lyrics into words, on whitespace, preserving nothing else about layout. */
export function splitIntoWords(line: string): string[] {
  return line.split(/\s+/).filter((token) => token.length > 0);
}
