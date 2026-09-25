/** Minimal line icons for the lateral track toolbar, sized to inherit color/currentColor. */

export function ChordIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="7" cy="17" r="3" />
      <circle cx="17" cy="15" r="3" />
      <path strokeLinecap="round" d="M10 17V5.5L20 4v11" />
    </svg>
  );
}

export function DotIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const ICONS_BY_TRACK: Record<string, typeof ChordIcon> = {
  chords: ChordIcon,
};

export function TrackIcon({ trackId }: { trackId: string }) {
  const Icon = ICONS_BY_TRACK[trackId] ?? DotIcon;
  return <Icon />;
}

/** Text-letter glyph for a track toggle button, in the style of a chord name (root + superscript
 * extension) — e.g. "G⁷" for the chords track. */
const GLYPHS_BY_TRACK: Record<string, { root: string; sup: string }> = {
  chords: { root: "G", sup: "7" },
};

export function TrackGlyph({ trackId }: { trackId: string }) {
  const glyph = GLYPHS_BY_TRACK[trackId];
  if (!glyph) return <DotIcon />;
  return (
    <span aria-hidden="true" className="track-toolbar__glyph">
      {glyph.root}
      <span>{glyph.sup}</span>
    </span>
  );
}
