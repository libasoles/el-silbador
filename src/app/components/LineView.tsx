import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { getLineCellSlots, getLineUnits, mergeKey } from "../../core/model";
import type { CellsByTrack, Line, TrackDef, TrackId, Word } from "../../core/types";
import { createResyllabifyCoordinator } from "../../core/resyllabifyCoordinator";
import { TrackRow } from "./TrackRow";

interface LineViewProps {
  line: Line;
  merges: ReadonlySet<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  onToggleMerge: (lineId: string, aId: string, bId: string) => void;
  onResyllabify: (lineId: string, wordId: string, text: string) => void;
}

interface WordEditorProps {
  lineId: string;
  word: Word;
  merges: ReadonlySet<string>;
  mergedIds: ReadonlySet<string>;
  onToggleMerge: (lineId: string, aId: string, bId: string) => void;
  onResyllabify: (lineId: string, wordId: string, text: string) => void;
}

function WordEditor({ lineId, word, merges, mergedIds, onToggleMerge, onResyllabify }: WordEditorProps) {
  const [editing, setEditing] = useState(false);
  
  const originalText = word.syllables.map(s => s.text).join("");
  const [inputValue, setInputValue] = useState(originalText);

  useEffect(() => {
    setInputValue(originalText);
  }, [originalText]);

  const valueRef = useRef(inputValue);
  valueRef.current = inputValue;

  const coordinator = useMemo(() => {
    return createResyllabifyCoordinator(() => {
      const text = valueRef.current.trim();
      if (text) {
        onResyllabify(lineId, word.id, text);
      }
    });
  }, [lineId, word.id, onResyllabify]);

  useEffect(() => () => coordinator.dispose(), [coordinator]);

  function startEditing() {
    setEditing(true);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const wordKey = `${lineId}:${word.id}`;
      coordinator.notifyWordBoundary(wordKey);
      setEditing(false);
    } else if (event.key === "Escape") {
      setInputValue(originalText);
      setEditing(false);
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const val = event.target.value;
    if (val.endsWith(" ") || val.endsWith("\n")) {
      setInputValue(val.trim());
      const wordKey = `${lineId}:${word.id}`;
      coordinator.notifyWordBoundary(wordKey);
      setEditing(false);
    } else {
      setInputValue(val);
      const wordKey = `${lineId}:${word.id}`;
      coordinator.notifyKeystroke(wordKey);
    }
  }

  function handleBlur() {
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        className="track-cell--input"
        style={{ fontSize: "inherit", width: `${Math.max(2, inputValue.length)}ch`, padding: 0, margin: 0, border: "none", borderBottom: "3px solid var(--border-strong)", background: "transparent", color: "inherit", outline: "none", textAlign: "center" }}
        autoFocus
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    );
  }

  return (
    <span style={{ display: "contents", cursor: "text" }} onClick={startEditing}>
      {word.syllables.map((syllable, index) => {
        const prev = index > 0 ? word.syllables[index - 1] : null;
        const merged = prev ? merges.has(mergeKey(prev.id, syllable.id)) : false;

        return (
          <Fragment key={syllable.id}>
            {prev ? (
              <button
                type="button"
                className={
                  "syllable-gap" +
                  (merged ? " syllable-gap--merged" : "")
                }
                aria-pressed={merged}
                aria-label={
                  merged
                    ? `Separar sílabas "${prev.text}" y "${syllable.text}"`
                    : `Unir sílabas "${prev.text}" y "${syllable.text}"`
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMerge(lineId, prev.id, syllable.id);
                }}
              />
            ) : null}
            <span className={"syllable" + (mergedIds.has(syllable.id) ? " syllable--merged" : "")}>
              {syllable.text}
            </span>
          </Fragment>
        );
      })}
    </span>
  );
}

export function LineView({ line, merges, tracks, cells, onSetCellText, onToggleMerge, onResyllabify }: LineViewProps) {
  const slotIds = getLineCellSlots(line, merges);

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
        {line.words.map((word, wIndex) => {
          const firstSyllable = word.syllables[0];
          const prevWord = wIndex > 0 ? line.words[wIndex - 1] : null;
          const prevSyllable = prevWord ? prevWord.syllables[prevWord.syllables.length - 1] : null;

          return (
            <Fragment key={word.id}>
              {prevSyllable && firstSyllable ? (() => {
                const merged = merges.has(mergeKey(prevSyllable.id, firstSyllable.id));
                return (
                  <button
                    type="button"
                    className={
                      "syllable-gap" +
                      (merged ? " syllable-gap--merged" : " syllable-gap--word-boundary")
                    }
                    aria-pressed={merged}
                    aria-label={
                      merged
                        ? `Separar sílabas "${prevSyllable.text}" y "${firstSyllable.text}"`
                        : `Unir sílabas "${prevSyllable.text}" y "${firstSyllable.text}"`
                    }
                    onClick={() => onToggleMerge(line.id, prevSyllable.id, firstSyllable.id)}
                  />
                );
              })() : null}
              <WordEditor
                lineId={line.id}
                word={word}
                merges={merges}
                mergedIds={mergedIds}
                onToggleMerge={onToggleMerge}
                onResyllabify={onResyllabify}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
