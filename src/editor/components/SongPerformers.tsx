import { Fragment } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listArtistNames } from "../../data";
import { artistQueryKeys } from "../../data/queryKeys";
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
 * "Interpretada por: …", and nothing at all when there are none. Each name there links to the index
 * searching for it, so the reader finds the rest of that performer's songs.
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
    return <PerformersEditor performers={performers} onChange={onChange} />;
  }

  if (performers.length === 0) return null;
  return (
    <p className="song-performers">
      Interpretada por:{" "}
      {performers.map((performer, index) => (
        <Fragment key={performer}>
          {index > 0 && ", "}
          <Link href={performerSearchPath(performer)}>{performer}</Link>
        </Fragment>
      ))}
    </p>
  );
}

/** The chips input, suggesting known performers. Only mounted for the owning admin on desktop, so
 *  readers never fetch the artists list. */
function PerformersEditor({
  performers,
  onChange,
}: Pick<SongPerformersProps, "performers" | "onChange">) {
  // Until the list arrives (or if it fails) the input still works, just without suggestions.
  const { data: artistNames = NO_ARTISTS } = useQuery({
    queryKey: artistQueryKeys.names(),
    queryFn: listArtistNames,
  });

  return (
    <div className="song-performers">
      <ChipsInput
        label="Intérpretes"
        placeholder={performers.length === 0 ? "Agregá intérpretes separados por coma" : undefined}
        values={performers}
        onChange={onChange}
        suggestions={artistNames}
        suggestionsLabel="Sugerencias de intérpretes"
      />
    </div>
  );
}

const NO_ARTISTS: string[] = [];

function performerSearchPath(performer: string): string {
  return `/?${new URLSearchParams({ q: performer })}`;
}
