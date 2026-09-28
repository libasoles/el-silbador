export interface HighlightPart {
  text: string;
  matches: boolean;
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Splits text into display-ready pieces, marking each word from the active search query. */
export function getHighlightParts(text: string, query: string): HighlightPart[] {
  const terms = [...new Set(query.trim().split(/\s+/).filter(Boolean))].sort(
    (first, second) => second.length - first.length,
  );
  if (terms.length === 0) return [{ text, matches: false }];

  const expression = new RegExp(`(${terms.map(escapeRegularExpression).join("|")})`, "giu");
  const parts: HighlightPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(expression)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ text: text.slice(lastIndex, index), matches: false });
    parts.push({ text: match[0], matches: true });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), matches: false });
  return parts.length > 0 ? parts : [{ text, matches: false }];
}
