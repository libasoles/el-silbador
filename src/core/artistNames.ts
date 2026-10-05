/**
 * Comparison key for a performer's name, mirroring `public.normalize_artist_name` in
 * supabase/migrations/0011_artists_and_performers.sql: "Los Chalchaleros" and " los chalchaléros"
 * are the same artist.
 */
export function artistNameKey(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Same artists, in the same order, by `artistNameKey`. */
export function sameArtistNames(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((name, index) => artistNameKey(name) === artistNameKey(b[index]));
}

/** How many suggestions the performers input shows at once. */
export const MAX_ARTIST_SUGGESTIONS = 8;

/**
 * The names in `artists` that contain `text` anywhere, ignoring case and accents ("chalcha" finds
 * "Los Chalchaleros"), leaving out the ones already in `exclude`. Names that start with the text
 * come first; otherwise the order of `artists` is kept. At most `MAX_ARTIST_SUGGESTIONS`.
 */
export function suggestArtistNames(
  artists: readonly string[],
  text: string,
  exclude: readonly string[],
): string[] {
  const query = artistNameKey(text);
  if (query === "") return [];
  const excluded = new Set(exclude.map(artistNameKey));
  const starting: string[] = [];
  const containing: string[] = [];
  for (const name of artists) {
    const key = artistNameKey(name);
    if (excluded.has(key)) continue;
    const index = key.indexOf(query);
    if (index === 0) starting.push(name);
    else if (index > 0) containing.push(name);
  }
  return [...starting, ...containing].slice(0, MAX_ARTIST_SUGGESTIONS);
}
