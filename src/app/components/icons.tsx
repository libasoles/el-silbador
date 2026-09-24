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

export function VoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="7" cy="17" r="3" />
      <path strokeLinecap="round" d="M10 17V4l9 2v11" />
      <circle cx="19" cy="15" r="3" />
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
  vocalNotes: VoiceIcon,
};

export function TrackIcon({ trackId }: { trackId: string }) {
  const Icon = ICONS_BY_TRACK[trackId] ?? DotIcon;
  return <Icon />;
}
