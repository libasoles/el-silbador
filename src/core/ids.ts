let counter = 0;

/** A short, unique-enough id. Not cryptographically random — this is UI state, not a security token. */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}${counter}`;
}

/** Advances the counter past every `<prefix><number>` id in `ids`, so ids minted later can't collide
 * with ones that came from outside this page load (a saved song or draft keeps the ids it was
 * created with, while the counter restarts at 0 on every reload). */
export function reserveIds(ids: Iterable<string>): void {
  for (const id of ids) {
    const n = Number(/\d+$/.exec(id)?.[0]);
    if (n > counter) counter = n;
  }
}
