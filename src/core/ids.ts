let counter = 0;

/** A short, unique-enough id. Not cryptographically random — this is UI state, not a security token. */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}${counter}`;
}
