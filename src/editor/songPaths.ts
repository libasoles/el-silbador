/** A song's public page: read-only for everyone, including its owner. */
export function songPath(slug: string): string {
  return `/cancion/${slug}`;
}

/** The same song opened in the editor. Only its owner (on desktop) can actually edit there. */
export function songEditPath(slug: string): string {
  return `/cancion/${slug}/editar`;
}

/** The index with its search box prefilled, e.g. with a performer's name. */
export function librarySearchPath(query: string): string {
  return `/?${new URLSearchParams({ q: query })}`;
}
