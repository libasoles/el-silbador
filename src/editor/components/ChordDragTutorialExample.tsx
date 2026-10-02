import { Fragment, useLayoutEffect, useRef, type CSSProperties } from "react";

interface ExampleUnit {
  syllable: string;
  wordBoundaryAfter?: boolean;
  /** Wide enough to hold a chord chip, so neighbouring chords never overlap. */
  wide?: boolean;
  /** Lights up like a real drop target while a chord hovers over it. */
  dropTarget?: "de" | "lo" | "ma";
}

const UNITS: ExampleUnit[] = [
  { syllable: "Des" },
  { syllable: "de", wordBoundaryAfter: true, dropTarget: "de" },
  { syllable: "lo", wordBoundaryAfter: true, dropTarget: "lo" },
  { syllable: "de", wordBoundaryAfter: true },
  { syllable: "Bal" },
  { syllable: "de" },
  { syllable: "rra", wide: true },
  { syllable: "ma", wide: true, dropTarget: "ma" },
];

/** The slot right after the phrase, where the last chord ends up. */
const END_SLOT = UNITS.length;

/** Chords dragged one after another: E7 from "Des" onto "lo", G7 from "ma" to the first slot
 *  after the phrase, then Am from "rra" onto the "ma" that G7 just left. */
const DRAGS = [
  { id: "e7", chord: "E7", from: 0, to: 2 },
  { id: "g7", chord: "G7", from: 7, to: END_SLOT },
  { id: "am", chord: "Am", from: 6, to: 7 },
] as const;

/** A tiny editor-like line that loops the chord drag gesture. Drop targets light up the way
 *  `.syllable--drop-target` and `.line-edge-drop--active` do in App.css. */
export function ChordDragTutorialExample() {
  const rootRef = useRef<HTMLSpanElement>(null);
  const unitRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // The distances depend on the font, so they're measured rather than hard-coded; the keyframes
  // read them through --chord-drag-<id>.
  useLayoutEffect(() => {
    const measure = () => {
      const root = rootRef.current;
      if (!root) return;
      for (const drag of DRAGS) {
        const from = unitRefs.current[drag.from];
        const to = unitRefs.current[drag.to];
        if (from && to) {
          root.style.setProperty(`--chord-drag-${drag.id}`, `${to.offsetLeft - from.offsetLeft}px`);
        }
      }
    };
    measure();
    // Web fonts shift the syllable widths once they load, which `fonts.ready` can miss when the
    // font only starts loading after this first render; observing the units catches any reflow.
    const observer = new ResizeObserver(measure);
    for (const unit of unitRefs.current) if (unit) observer.observe(unit);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={rootRef}
      className="chord-tutorial-example"
      style={
        {
          "--chord-drag-e7": "3.5rem",
          "--chord-drag-g7": "2.5rem",
          "--chord-drag-am": "1.5rem",
        } as CSSProperties
      }
      aria-label="Ejemplo de acordes arrastrados sobre la frase"
    >
      {UNITS.map((unit, unitIndex) => (
        <Fragment key={`${unit.syllable}-${unitIndex}`}>
          <span
            ref={(el) => {
              unitRefs.current[unitIndex] = el;
            }}
            className={
              "chord-tutorial-example__unit" +
              (unit.wide ? " chord-tutorial-example__unit--wide" : "")
            }
          >
            <span className="chord-tutorial-example__chords">
              {DRAGS.filter((drag) => drag.from === unitIndex).map((drag) => (
                <span
                  key={drag.id}
                  className={`chord-tutorial-example__chord chord-tutorial-example__chord--${drag.id}`}
                >
                  {drag.chord}
                </span>
              ))}
            </span>
            <span
              className={
                "chord-tutorial-example__lyric" +
                (unit.dropTarget
                  ? ` chord-tutorial-example__lyric--drop-target-${unit.dropTarget}`
                  : "")
              }
            >
              {unit.syllable}
            </span>
          </span>
          <span
            className={
              "chord-tutorial-example__gap" +
              (unit.wordBoundaryAfter ? " chord-tutorial-example__gap--word-boundary" : "")
            }
          />
        </Fragment>
      ))}
      <span
        ref={(el) => {
          unitRefs.current[END_SLOT] = el;
        }}
        className="chord-tutorial-example__unit chord-tutorial-example__unit--wide chord-tutorial-example__end"
      />
    </span>
  );
}
