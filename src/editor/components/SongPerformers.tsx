import { useIsMobile } from "../useIsMobile";
import { ChipsInput } from "./ChipsInput";

interface SongPerformersProps {
  /** In load order, which is also the order they are shown in. */
  performers: string[];
  viewerIsAdmin: boolean;
  viewerOwnsSong: boolean;
  onChange: (performers: string[]) => void;
}

/**
 * The song's footer line about who performs it, below the video. Only an admin editing their own
 * song on desktop gets the chips input (songs by non-admins are never listed or indexed, so their
 * performers would serve no one); everyone else, including that admin on mobile, reads
 * "Interpretada por: …", and nothing at all when there are none.
 *
 * The mobile gate is a render-level `useIsMobile` check rather than CSS, per AGENTS.md: hiding the
 * input would still leave it focusable and its handlers live.
 */
export function SongPerformers({
  performers,
  viewerIsAdmin,
  viewerOwnsSong,
  onChange,
}: SongPerformersProps) {
  const isMobile = useIsMobile();

  if (viewerIsAdmin && viewerOwnsSong && !isMobile) {
    return (
      <div className="song-performers">
        <ChipsInput
          label="Intérpretes"
          visibleLabel="Interpretada por:"
          placeholder={performers.length === 0 ? "Agregá intérpretes separados por coma" : undefined}
          values={performers}
          onChange={onChange}
        />
      </div>
    );
  }

  if (performers.length === 0) return null;
  return <p className="song-performers">Interpretada por: {performers.join(", ")}</p>;
}
