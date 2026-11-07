import type { ChordShape, Finger } from "../../core/chordShapes";

const STRING_COUNT = 6;
const FRET_COUNT = 5;
// Leave room for two-digit fret numbers inside the SVG's clipping boundary.
const WIDTH = 128;
const MARGIN_X = 24;
const TOP = 26;
const FRET_HEIGHT = 26;
const DOT_RADIUS = 8;
const STRING_LABEL_HEIGHT = 16;

/** Standard tuning, low to high — string 6 (low E) through string 1 (high E). */
const STRING_NAMES: Record<number, string> = { 6: "E", 5: "A", 4: "D", 3: "G", 2: "B", 1: "E" };

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Semitone index (C = 0) of each open string, derived from `STRING_NAMES`. */
const OPEN_STRING_SEMITONE: Record<number, number> = { 6: 4, 5: 9, 4: 2, 3: 7, 2: 11, 1: 4 };

function noteAtFret(string: number, fret: number): string {
  return NOTE_NAMES[(OPEN_STRING_SEMITONE[string] + fret) % 12];
}

/** The sounding note name for each string, or "" for a muted string — based on the actual
 *  fretted/barred/open position per string, not the fixed open-string tuning name. */
function fingeredStringNames(shape: ChordShape): Record<number, string> {
  const fretByString: Record<number, Finger[1]> = {};
  for (const barre of shape.barres ?? []) {
    const from = Math.min(barre.fromString, barre.toString);
    const to = Math.max(barre.fromString, barre.toString);
    for (let string = from; string <= to; string += 1) {
      fretByString[string] = barre.fret;
    }
  }
  for (const [string, fret] of shape.fingers) {
    fretByString[string] = fret;
  }

  const names: Record<number, string> = {};
  for (let string = 1; string <= STRING_COUNT; string += 1) {
    const fret = fretByString[string];
    if (fret === "x") {
      names[string] = "";
    } else if (fret === "o" || fret === undefined) {
      names[string] = STRING_NAMES[string];
    } else {
      names[string] = noteAtFret(string, fret);
    }
  }
  return names;
}

function stringX(stringNumber: number): number {
  const step = (WIDTH - 2 * MARGIN_X) / (STRING_COUNT - 1);
  return MARGIN_X + (STRING_COUNT - stringNumber) * step;
}

function fretY(fretRow: number): number {
  return TOP + fretRow * FRET_HEIGHT;
}

/** svguitar-style windowing: shapes played higher up the neck (`position` > 1) store their raw,
 *  absolute fret numbers, so they need shifting down into the fixed-size grid this diagram draws.
 *  Ported from the sibling cancionero project's chord-modal.js. */
function toWindowedShape(shape: ChordShape): { fingers: Finger[]; barres: NonNullable<ChordShape["barres"]> } {
  const offset = (shape.position ?? 1) - 1;
  const fingers: Finger[] = shape.fingers.map(([string, fret, label]) =>
    typeof fret === "number" ? [string, fret - offset, label] : [string, fret, label],
  );
  const barres = (shape.barres ?? []).map((barre) => ({ ...barre, fret: barre.fret - offset }));
  return { fingers, barres };
}

interface ChordDiagramProps {
  shape: ChordShape;
}

/** A small guitar fretboard diagram: strings 6 (low E) to 1 (high E) left to right, frets
 *  counting down from the nut (or from `position`, for shapes played higher up the neck). */
export function ChordDiagram({ shape }: ChordDiagramProps) {
  const { fingers, barres } = toWindowedShape(shape);
  const position = shape.position ?? 1;
  const height = fretY(FRET_COUNT) + 6 + STRING_LABEL_HEIGHT;
  const stringNames = fingeredStringNames(shape);

  return (
    <svg
      className="chord-diagram"
      viewBox={`0 0 ${WIDTH} ${height}`}
      width={WIDTH}
      height={height}
      role="img"
      aria-label={`Diagrama del acorde ${shape.name}`}
    >
      {Array.from({ length: STRING_COUNT }, (_, index) => {
        const string = index + 1;
        const x = stringX(string);
        return (
          <line
            key={`string-${string}`}
            className="chord-diagram__string"
            x1={x}
            y1={fretY(0)}
            x2={x}
            y2={fretY(FRET_COUNT)}
          />
        );
      })}

      {Array.from({ length: FRET_COUNT + 1 }, (_, fretRow) => (
        <line
          key={`fret-${fretRow}`}
          className={fretRow === 0 && position === 1 ? "chord-diagram__fret chord-diagram__fret--nut" : "chord-diagram__fret"}
          x1={stringX(STRING_COUNT)}
          y1={fretY(fretRow)}
          x2={stringX(1)}
          y2={fretY(fretRow)}
        />
      ))}

      {position > 1 ? (
        <text
          className="chord-diagram__position"
          x={stringX(STRING_COUNT) - 8}
          y={fretY(0.5)}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {position}
        </text>
      ) : null}

      {barres.map((barre, index) => (
        <rect
          key={`barre-${index}`}
          className="chord-diagram__barre"
          x={stringX(Math.max(barre.fromString, barre.toString)) - DOT_RADIUS}
          y={fretY(barre.fret - 0.5) - DOT_RADIUS}
          width={stringX(Math.min(barre.fromString, barre.toString)) - stringX(Math.max(barre.fromString, barre.toString)) + DOT_RADIUS * 2}
          height={DOT_RADIUS * 2}
          rx={DOT_RADIUS}
        />
      ))}

      {fingers.map(([string, fret, label], index) => {
        const x = stringX(string);
        if (fret === "x") {
          return (
            <text key={index} className="chord-diagram__mute" x={x} y={fretY(0) - 10} textAnchor="middle" dominantBaseline="middle">
              ×
            </text>
          );
        }
        if (fret === "o") {
          return <circle key={index} className="chord-diagram__open" cx={x} cy={fretY(0) - 10} r={5} />;
        }
        return (
          <g key={index}>
            <circle className="chord-diagram__finger" cx={x} cy={fretY(fret - 0.5)} r={DOT_RADIUS} />
            {label ? (
              <text className="chord-diagram__finger-label" x={x} y={fretY(fret - 0.5)} textAnchor="middle" dominantBaseline="central">
                {label}
              </text>
            ) : null}
          </g>
        );
      })}

      {Array.from({ length: STRING_COUNT }, (_, index) => {
        const string = index + 1;
        return (
          <text
            key={`string-name-${string}`}
            className="chord-diagram__string-name"
            x={stringX(string)}
            y={fretY(FRET_COUNT) + STRING_LABEL_HEIGHT}
            textAnchor="middle"
          >
            {stringNames[string]}
          </text>
        );
      })}
    </svg>
  );
}
