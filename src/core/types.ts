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
}

export type Song = Line[];

/** Opaque track identifier. The reducer/model treat tracks generically; only the app layer
 * instantiates specific ids ("chords", "vocalNotes") as data, in createInitialState. */
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

export interface EditorState {
  title: string;
  author: string;
  lyricsText: string;
  song: Song;
  /** Adjacent syllable-id pairs, packed as `${aId}|${bId}`, that are merged into one melisma. */
  merges: Set<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  showUnderline: boolean;
}
