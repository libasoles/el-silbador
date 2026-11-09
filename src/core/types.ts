export interface Syllable {
  id: string;
  text: string;
}

export interface Word {
  id: string;
  syllables: Syllable[];
}

export interface Line {
  id: string;
  words: Word[];
  /** A section label kept as whole text rather than split into syllables. */
  subtitle?: string;
  /** A line inside a multi-line free-text block (`<--` … `-->`): its raw text, kept whole. */
  freeText?: string;
  /** A chord line: its raw text, chords spaced by column, with no syllables of its own. */
  chordLine?: string;
  /** A line that is only a link to Partitura: its raw text, shown as a banner. */
  partituraLink?: string;
  /** A tab block. Its line holds the `TAB` marker in `lyricsText`, which is never shown as text;
   *  the block's content lives in `EditorState.tabs[line.id]`. */
  tab?: true;
}

export type Song = Line[];

/** Consecutive lyric lines that repeat together. The `BIS` word remains part of the lyric text;
 * this range only records which preceding lines share its left-hand rule. */
export interface BisGroup {
  startLineIndex: number;
  endLineIndex: number;
}

/** Opaque track identifier. The reducer/model treat tracks generically; only the app layer
 * instantiates specific ids ("chords", "chordNotes", "vocalNotes") as data, in createInitialState. */
export type TrackId = string;

export interface TrackDef {
  id: TrackId;
  label: string;
  visible: boolean;
}

/** A group of one or more adjacent syllables that share a single annotation slot (a melisma). */
export interface SyllableUnit {
  /** The annotation slot anchored immediately before this unit. */
  slotId: string;
  syllableIds: string[];
}

/** `cells[trackId][slotId]` holds the free text typed into that track's cell. Missing = empty. */
export type CellsByTrack = Partial<Record<TrackId, Record<string, string>>>;

/** Whether a vocal note is higher ("up") or lower ("down") than the previous one. */
export type PitchDirection = "up" | "down";

/** One cell per string, 1 to 6: a fret (0–24) or `null` for an empty string. */
export type TabColumn = (number | null)[];

/** The content of a tab block: one or more Tabs of ascii-tabs (each a list of columns), plus the
 *  dashes drawn between columns. Missing `spacing` = the library's default. */
export interface TabBlock {
  tabs: TabColumn[][];
  spacing?: number;
}

export interface EditorState {
  title: string;
  author: string;
  lyricsText: string;
  song: Song;
  bisGroups: BisGroup[];
  /** Adjacent syllable-id pairs, packed as `${aId}|${bId}`, that are merged into one melisma. */
  merges: Set<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  /** `chordVariants[slotId]` is the index into `getChordPositions(shape)` chosen for that chords-
   *  track slot (see ChordDiagram's variant arrows). Missing = the chord's default position (0). */
  chordVariants: Record<string, number>;
  /** `pitchDirections[slotId]` is the pitch direction indicator shown under that vocal-notes
   *  slot's note. Missing = no indicator. Only ever set on a slot whose note is non-empty. */
  pitchDirections: Record<string, PitchDirection>;
  showUnderline: boolean;
  /** `tabs[lineId]` is the content of the tab block on that `tab` line. */
  tabs: Record<string, TabBlock>;
}
