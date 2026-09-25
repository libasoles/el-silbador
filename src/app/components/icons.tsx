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

/** "Do mi sol" stacked — three noteheads on one stem, like a triad written on a staff. */
export function NoteStackIcon() {
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
      <line x1="15.5" y1="5" x2="15.5" y2="18.5" />
      <ellipse cx="7.5" cy="19" rx="3.5" ry="2.3" fill="currentColor" stroke="none" transform="rotate(-18 7.5 19)" />
      <ellipse cx="9.5" cy="12" rx="3.5" ry="2.3" fill="currentColor" stroke="none" transform="rotate(-18 9.5 12)" />
      <ellipse cx="12" cy="5" rx="3.5" ry="2.3" fill="currentColor" stroke="none" transform="rotate(-18 12 5)" />
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
