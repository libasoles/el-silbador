import { getLineCellSlots } from "../../core/model";
import { chordLineTokens } from "../../core/chordSheet";
import { findChordShape } from "../../core/findChordShape";
import { getChordPositions } from "../../core/chordPositions";
import type { CellsByTrack, Song } from "../../core/types";
import { useReaderChordPositions } from "../ReaderChordPositionsContext";
import { ChordDiagram } from "./ChordDiagram";

/** One diagram per known chord, including instrumental chord lines. */
export function SongChordDiagrams({ song, cells, merges }: { song: Song; cells: CellsByTrack; merges: ReadonlySet<string> }) {
  const remembered = useReaderChordPositions();
  const names = song.flatMap((line) => line.chordLine !== undefined
    ? chordLineTokens(line.chordLine).map(({ chord }) => chord)
    : getLineCellSlots(line, merges, cells).map((slot) => cells.chords?.[slot] ?? ""));
  const seen = new Set<string>();
  const chords = names.flatMap((name) => {
    const shape = findChordShape(name);
    if (!shape || seen.has(shape.name)) return [];
    seen.add(shape.name);
    const positions = getChordPositions(shape);
    return [{ name: name.trim(), shape: positions[remembered?.get(shape.name) ?? 0] ?? shape }];
  });
  if (!chords.length) return null;
  return (
    <section className="song-chord-diagrams" aria-label="Diagramas de los acordes">
      {chords.map(({ name, shape }) => (
        <figure className="song-chord-diagrams__chord" key={shape.name}>
          <figcaption>{name}</figcaption>
          <ChordDiagram shape={shape} />
        </figure>
      ))}
    </section>
  );
}
