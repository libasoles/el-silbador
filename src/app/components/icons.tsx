/** Minimal line icons for the lateral track toolbar, sized to inherit color/currentColor. */

/** The Silbador mark: a singer with the sound of their voice. */
export function SilbadorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M13.5 27C12.6 22.2 13.8 17.3 17.1 13.8C20.2 10.5 24.9 8.8 30.1 9.1C35.2 9.4 39.1 12.2 44.4 13.6C47.5 14.4 50.6 14.6 53.3 13.9C52.3 16.2 50.2 18.1 47.4 19.3C42.3 21.5 35.1 20.5 29.1 17.6C27.1 21.9 22.8 25.7 17.5 27.4" />
      <path d="M16.5 26.7C13.2 25.8 10.7 27.6 10.8 31C10.9 34.5 13.7 36.5 17.2 35.6" />
      <path d="M17.4 27.2C17.6 33.5 19.8 38.6 23.8 41.6C27.2 44.1 31.7 45.1 35.9 44.1C43.3 42.4 47.8 36.3 48.1 27.8L48.1 20" />
      <path d="M23.4 30.4C24.3 28.7 26.7 28.7 27.7 30.4" />
      <path d="M36.5 30.4C37.5 28.7 39.9 28.7 40.8 30.4" />
      <path
        strokeWidth="1.75"
        d="M38.8 35.3C40.1 34.7 41.2 35.2 41.2 36.1C41.2 36.8 40.6 37.2 39.9 37.3C40.7 37.4 41.3 37.9 41.3 38.6C41.3 39.5 40.1 40 38.9 39.5"
      />
      <g strokeWidth="1.75">
        <ellipse cx="53.2" cy="29.1" rx="1.45" ry="1.05" />
        <path d="M54.5 28.6V23.9L57.1 25.7" />
        <ellipse cx="52.7" cy="36.4" rx="1.35" ry="1" />
        <ellipse cx="57.1" cy="35.1" rx="1.35" ry="1" />
        <path d="M54 36V31.4L58.4 30.1V34.7" />
        <path d="M54 31.4L58.4 30.1" />
      </g>
    </svg>
  );
}

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

/** A pair of eighth notes — the sung melody, as opposed to the chord shape (ChordIcon) or the
 *  chord's constituent note names (NoteStackIcon). */
export function MelodyNoteIcon() {
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
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
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

export function DownloadIcon() {
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
      <path d="M12 15V3" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}

export function SaveIcon() {
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

/** A rotating arc, spun by the `.spinner-icon` CSS animation while a save is in flight. */
export function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className="spinner-icon"
    >
      <path d="M12 3a9 9 0 1 1-9 9" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.8-4.8" />
    </svg>
  );
}

export function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3.2 14.7 9l6.3.6-4.7 4.2 1.4 6.2L12 16.9 6.3 20l1.4-6.2-4.7-4.2L9.3 9z" />
    </svg>
  );
}

export function PlusIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function AlertCircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
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
  vocalNotes: MelodyNoteIcon,
};

export function TrackIcon({ trackId }: { trackId: string }) {
  const Icon = ICONS_BY_TRACK[trackId] ?? DotIcon;
  return <Icon />;
}
