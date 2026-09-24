import { Fragment } from "react";
import { flattenSyllables, getLineCellSlots, getLineUnits, mergeKey } from "../../core/model";
import type { CellsByTrack, Line, TrackDef, TrackId } from "../../core/types";
import { TrackRow } from "./TrackRow";

interface LineViewProps {
  line: Line;
  merges: ReadonlySet<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  onToggleMerge: (lineId: string, aId: string, bId: string) => void;
}

export function LineView({ line, merges, tracks, cells, onSetCellText, onToggleMerge }: LineViewProps) {
  const slotIds = getLineCellSlots(line, merges);
  const flat = flattenSyllables(line);

  const wordOfSyllable = new Map<string, string>();
  for (const word of line.words) {
    for (const syllable of word.syllables) {
      wordOfSyllable.set(syllable.id, word.id);
    }
  }

  const mergedIds = new Set<string>();
  for (const unit of getLineUnits(line, merges)) {
    if (unit.syllableIds.length > 1) {
      for (const id of unit.syllableIds) mergedIds.add(id);
    }
  }

  return (
    <div className="line">
      {tracks
        .filter((track) => track.visible)
        .map((track) => (
          <TrackRow
            key={track.id}
            trackId={track.id}
            label={track.label}
            slotIds={slotIds}
            cells={cells}
            onSetCellText={onSetCellText}
          />
        ))}
      <div className="syllable-row" role="row">
        {flat.map((syllable, index) => {
          const prev = index > 0 ? flat[index - 1] : null;
          const merged = prev ? merges.has(mergeKey(prev.id, syllable.id)) : false;
          const crossesWord = prev ? wordOfSyllable.get(prev.id) !== wordOfSyllable.get(syllable.id) : false;

          return (
            <Fragment key={syllable.id}>
              {prev ? (
                <button
                  type="button"
                  className={
                    "syllable-gap" +
                    (merged ? " syllable-gap--merged" : "") +
                    (!merged && crossesWord ? " syllable-gap--word-boundary" : "")
                  }
                  aria-pressed={merged}
                  aria-label={
                    merged
                      ? `Separar sílabas "${prev.text}" y "${syllable.text}"`
                      : `Unir sílabas "${prev.text}" y "${syllable.text}"`
                  }
                  onClick={() => onToggleMerge(line.id, prev.id, syllable.id)}
                />
              ) : null}
              <span className={"syllable" + (mergedIds.has(syllable.id) ? " syllable--merged" : "")}>
                {syllable.text}
              </span>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
