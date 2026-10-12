/** The song identity shown in the browser tab, shared by server metadata and the editor. */
export function songDocumentTitle(title: string, author: string): string {
  const name = title.trim() || "Canción sin título";
  const artist = author.trim();
  return artist ? `${name} - ${artist}` : name;
}
