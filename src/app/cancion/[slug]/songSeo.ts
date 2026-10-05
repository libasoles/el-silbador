import type { SongDetail } from "../../../data/types";

type SongSeoInput = Pick<SongDetail, "author" | "performers"> & { title: string };

/** "A", "A y B", "A, B y C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

/** The song page's meta description, shared by OpenGraph and Twitter. `title` is the title as
 *  shown on the page (already falling back to "Canción sin título"). */
export function songDescription({ title, author, performers }: SongSeoInput): string {
  const artist = author.trim();
  const byAuthor = artist ? `, de ${artist}` : "";
  const performedBy = performers.length > 0 ? ` Interpretada por ${joinNames(performers)}.` : "";
  return `Letra y acordes para guitarra de ${title}${byAuthor}.${performedBy} Consultá la canción en El Silbador.`;
}

/**
 * schema.org structured data for the song page: the song as a `MusicComposition` by its author,
 * with one `MusicRecording` per performer — each performer recorded their own version, so a single
 * recording listing them all would claim they played it together. Performers are `MusicGroup`s
 * because schema.org defines it to also cover solo musicians and we don't know which each one is.
 */
export function songJsonLd({ title, author, performers }: SongSeoInput): Record<string, unknown> {
  const artist = author.trim();
  return {
    "@context": "https://schema.org",
    "@type": "MusicComposition",
    name: title,
    ...(artist ? { composer: { "@type": "Person", name: artist } } : {}),
    ...(performers.length > 0
      ? {
          recordedAs: performers.map((name) => ({
            "@type": "MusicRecording",
            name: title,
            byArtist: { "@type": "MusicGroup", name },
          })),
        }
      : {}),
  };
}
