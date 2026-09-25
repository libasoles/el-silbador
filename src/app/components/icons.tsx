/** Minimal line icons for the lateral track toolbar, sized to inherit color/currentColor. */

export function ChordIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m11.9 12.1 4.514-4.514" />
      <path d="M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z" />
      <path d="m6 16 2 2" />
      <path d="M8.23 9.85A3 3 0 0 1 11 8a5 5 0 0 1 5 5 3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4 6 6 0 0 1-6-6 4 4 0 0 1 4-4 2 2 0 0 0 1.85-1.23z" />
    </svg>
  );
}

/** The words "sol", "mi", "do" stacked top to bottom — the same order the notes track itself
 *  shows a chord's notes in. */
export function NoteStackIcon() {
  return (
    <svg viewBox="0 0 24 36" width="24" height="36" aria-hidden="true" focusable="false">
      <text
        x="12"
        y="5"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontWeight="700"
        letterSpacing="-0.5"
        fill="currentColor"
      >
        sol
      </text>
      <text
        x="12"
        y="18"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontWeight="700"
        fill="currentColor"
      >
        mi
      </text>
      <text
        x="12"
        y="31"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontWeight="700"
        fill="currentColor"
      >
        do
      </text>
    </svg>
  );
}

export function UnderlineIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 3v7a6 6 0 0 0 12 0V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
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
  chordNotes: NoteStackIcon,
};

export function TrackIcon({ trackId }: { trackId: string }) {
  const Icon = ICONS_BY_TRACK[trackId] ?? DotIcon;
  return <Icon />;
}
