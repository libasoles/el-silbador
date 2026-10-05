import type { LibrarySong } from "./librarySongs";

type SearchField = (song: LibrarySong) => readonly string[];

const byPerformers: SearchField = (song) => song.performers;

/** The searchable texts of a song, most relevant first: a song ranks by the first field where any
 *  query word appears. Adding a less relevant field means appending to the end. */
const SEARCH_FIELDS: readonly SearchField[] = [
  (song) => [song.title],
  (song) => (song.author ? [song.author] : []),
  byPerformers,
];

const PERFORMERS_FIELD = SEARCH_FIELDS.indexOf(byPerformers);

/** Lowercases and drops diacritics, so "Canción" and "cancion" compare equal. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function getTerms(query: string): string[] {
  return [...new Set(fold(query).trim().split(/\s+/).filter(Boolean))];
}

/** Index of the most relevant field matching the query, or `undefined` when some query word
 *  appears in no field at all. */
function rankSong(song: LibrarySong, terms: string[]): number | undefined {
  const fields = SEARCH_FIELDS.map((getTexts) => getTexts(song).map(fold));
  const found = (term: string, texts: string[]) => texts.some((text) => text.includes(term));
  if (!terms.every((term) => fields.some((texts) => found(term, texts)))) return undefined;
  return fields.findIndex((texts) => terms.some((term) => found(term, texts)));
}

/** Library rows that contain every word of the query, ignoring case and accents, ordered by
 *  relevance (title, then author, then performer matches); ties keep their original order. */
export function searchSongs(songs: LibrarySong[], query: string): LibrarySong[] {
  const terms = getTerms(query);
  if (terms.length === 0) return songs;

  return songs
    .map((song) => ({ song, rank: rankSong(song, terms) }))
    .filter((entry): entry is { song: LibrarySong; rank: number } => entry.rank !== undefined)
    .sort((first, second) => first.rank - second.rank)
    .map((entry) => entry.song);
}

/** The performers, in load order, containing a query word that no more relevant field (title,
 *  author) contains: the ones the song was found by. Empty when the title and author cover every
 *  word, or when the song doesn't match at all. */
export function getMatchingPerformers(song: LibrarySong, query: string): string[] {
  const terms = getTerms(query);
  if (terms.length === 0 || rankSong(song, terms) === undefined) return [];

  const moreRelevantTexts = SEARCH_FIELDS.slice(0, PERFORMERS_FIELD).flatMap((getTexts) =>
    getTexts(song).map(fold),
  );
  const performerTerms = terms.filter(
    (term) => !moreRelevantTexts.some((text) => text.includes(term)),
  );

  return song.performers.filter((performer) => {
    const folded = fold(performer);
    return performerTerms.some((term) => folded.includes(term));
  });
}

export interface HighlightPart {
  text: string;
  matches: boolean;
}

interface TextRange {
  start: number;
  end: number;
}

/** Folds `text` keeping, for every folded code unit, where its source character sits in `text`. */
function foldWithOrigins(text: string): { folded: string; origins: TextRange[] } {
  let folded = "";
  const origins: TextRange[] = [];
  let start = 0;
  for (const character of text) {
    const end = start + character.length;
    const piece = fold(character);
    folded += piece;
    for (let index = 0; index < piece.length; index += 1) origins.push({ start, end });
    start = end;
  }
  return { folded, origins };
}

/** Splits text into display-ready pieces, marking each word from the active search query. Matching
 *  ignores case and accents, but the pieces keep the original text. */
export function getHighlightParts(text: string, query: string): HighlightPart[] {
  const terms = getTerms(query).sort((first, second) => second.length - first.length);
  if (terms.length === 0) return [{ text, matches: false }];

  const { folded, origins } = foldWithOrigins(text);
  const ranges: TextRange[] = [];
  let index = 0;
  while (index < folded.length) {
    const term = terms.find((candidate) => folded.startsWith(candidate, index));
    if (!term) {
      index += 1;
      continue;
    }
    const start = origins[index].start;
    const end = origins[index + term.length - 1].end;
    const previous = ranges.at(-1);
    if (previous && previous.end >= start) previous.end = Math.max(previous.end, end);
    else ranges.push({ start, end });
    index += term.length;
  }

  const parts: HighlightPart[] = [];
  let lastIndex = 0;
  for (const range of ranges) {
    if (range.start > lastIndex) {
      parts.push({ text: text.slice(lastIndex, range.start), matches: false });
    }
    parts.push({ text: text.slice(range.start, range.end), matches: true });
    lastIndex = range.end;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), matches: false });
  return parts.length > 0 ? parts : [{ text, matches: false }];
}
