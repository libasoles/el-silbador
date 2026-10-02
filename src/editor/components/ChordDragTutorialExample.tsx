import { Fragment, useLayoutEffect, useRef, type CSSProperties } from "react";

interface ExampleUnit {
  syllables: string[];
  /** A chord that stays put, shown in the chord row above the unit. */
  chord?: string;
  wordBoundaryAfter?: boolean;
  /** The unit the animated chord starts on. */
  dragFrom?: boolean;
  /** The unit the animated chord is dragged onto, lighting up like a real drop target. */
  dragTo?: boolean;
}

const UNITS: ExampleUnit[] = [
  { syllables: ["Des"] },
  { syllables: ["de"], dragFrom: true, wordBoundaryAfter: true },
  { syllables: ["lo"], dragTo: true, wordBoundaryAfter: true },
  { syllables: ["de"], wordBoundaryAfter: true },
  { syllables: ["Bal"] },
  { syllables: ["de"] },
  { syllables: ["rra"], chord: "Am" },
  { syllables: ["ma"], chord: "G7" },
];

const DRAGGED_CHORD = "E7";

/** A tiny editor-like line that loops the chord drag gesture: E7 starts over "de" and is slowly
 *  dragged onto "lo", whose syllable lights up like a real drop target (see `.syllable--drop-target`
 *  in App.css). */
export function ChordDragTutorialExample() {
  const rootRef = useRef<HTMLSpanElement>(null);
  const fromRef = useRef<HTMLSpanElement>(null);
  const toRef = useRef<HTMLSpanElement>(null);

  // The distance between the two syllables depends on the font, so it's measured rather than
  // hard-coded; the keyframes read it through --chord-drag-distance.
  useLayoutEffect(() => {
    const measure = () => {
      const root = rootRef.current;
      const from = fromRef.current;
      const to = toRef.current;
      if (!root || !from || !to) return;
      root.style.setProperty("--chord-drag-distance", `${to.offsetLeft - from.offsetLeft}px`);
    };
    measure();
    // Web fonts shift the syllable widths once they load.
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <span
      ref={rootRef}
      className="chord-tutorial-example"
      style={{ "--chord-drag-distance": "3.5rem" } as CSSProperties}
      aria-label="Ejemplo de un acorde arrastrado sobre una sílaba"
    >
      {UNITS.map((unit, unitIndex) => (
        <Fragment key={`${unit.syllables[0]}-${unitIndex}`}>
          <span
            ref={unit.dragFrom ? fromRef : unit.dragTo ? toRef : undefined}
            className="chord-tutorial-example__unit"
          >
            <span className="chord-tutorial-example__chords">
              {unit.chord}
              {unit.dragFrom ? (
                <span className="chord-tutorial-example__chord chord-tutorial-example__chord--dragged">
                  {DRAGGED_CHORD}
                </span>
              ) : null}
            </span>
            <span
              className={
                "chord-tutorial-example__lyric" +
                (unit.dragTo ? " chord-tutorial-example__lyric--drop-target" : "")
              }
            >
              {unit.syllables.join("")}
            </span>
          </span>
          {unitIndex < UNITS.length - 1 ? (
            <span
              className={
                "chord-tutorial-example__gap" +
                (unit.wordBoundaryAfter ? " chord-tutorial-example__gap--word-boundary" : "")
              }
            />
          ) : null}
        </Fragment>
      ))}
    </span>
  );
}
