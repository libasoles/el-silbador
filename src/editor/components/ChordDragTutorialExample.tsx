import { Fragment, useLayoutEffect, useRef } from "react";

interface ExampleUnit {
  syllable: string;
  wordBoundaryAfter?: boolean;
  /** Wide enough to hold a chord chip, so neighbouring chords never overlap. */
  wide?: boolean;
}

const UNITS: ExampleUnit[] = [
  { syllable: "Des" },
  { syllable: "de", wordBoundaryAfter: true },
  { syllable: "lo", wordBoundaryAfter: true },
  { syllable: "de", wordBoundaryAfter: true },
  { syllable: "Bal" },
  { syllable: "de" },
  { syllable: "rra", wide: true },
  { syllable: "ma", wide: true },
];

/** The slot right after the phrase, where the last chord ends up. */
const END_SLOT = UNITS.length;

/** Chords dragged one after another, as fractions of the loop: E7 from "Des" onto "lo", G7 from
 *  "ma" to the first slot after the phrase, then Am from "rra" onto the "ma" G7 just left. */
const DRAGS = [
  { id: "e7", chord: "E7", from: 0, to: 2, start: 0.05, end: 0.22 },
  { id: "g7", chord: "G7", from: 7, to: END_SLOT, start: 0.3, end: 0.44 },
  { id: "am", chord: "Am", from: 6, to: 7, start: 0.52, end: 0.66 },
] as const;

const LOOP_MS = 16000;
/** Everything fades out over this stretch at the end of the loop, then restarts from rest. */
const FADE_OUT_START = 0.9;
const FADE_OUT_END = 0.95;
/** How long a dropped-on target stays lit after the chord lands, and how fast highlights fade. */
const DROP_LINGER = 0.04;
const HIGHLIGHT_RAMP = 0.01;

/** A tiny editor-like line that loops the chord drag gesture. A destination lights up (text plus
 *  a thicker underline, like `.syllable--drop-target` and `.line-edge-drop--active` in App.css)
 *  exactly while the dragged chip is over it, which is computed from the measured positions. */
export function ChordDragTutorialExample() {
  const unitRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lyricRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const dropRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const chipRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  useLayoutEffect(() => {
    let animations: Animation[] = [];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const build = () => {
      for (const animation of animations) animation.cancel();
      animations = [];

      const highlightColor = getComputedStyle(unitRefs.current[0]!).getPropertyValue("--highlight");
      const windows = new Map<number, [number, number][]>();

      for (const drag of DRAGS) {
        const chip = chipRefs.current[drag.id];
        const from = unitRefs.current[drag.from];
        const to = unitRefs.current[drag.to];
        if (!chip || !from || !to) continue;
        const distance = to.offsetLeft - from.offsetLeft;

        if (reducedMotion) {
          // Without motion, show where the chord ends up.
          chip.style.transform = `translateX(${distance}px)`;
          continue;
        }

        const rest = { transform: "translateX(0)", opacity: 1 };
        const dropped = { transform: `translateX(${distance}px)`, opacity: 1 };
        animations.push(
          chip.animate(
            [
              { ...rest, offset: 0 },
              { ...rest, offset: drag.start },
              { ...dropped, offset: drag.end },
              { ...dropped, offset: FADE_OUT_START },
              { ...dropped, opacity: 0, offset: FADE_OUT_END },
              { ...rest, opacity: 0, offset: FADE_OUT_END + 0.0001 },
              { ...rest, offset: 1 },
            ],
            { duration: LOOP_MS, iterations: Infinity, easing: "linear" },
          ),
        );

        // The chord is "over" a destination while the chip's centre is inside its bounds. The
        // drag is linear, so that position maps straight to a moment in the loop.
        const centre = chip.offsetWidth / 2;
        for (let target = drag.from + 1; target <= drag.to; target++) {
          const unit = unitRefs.current[target]!;
          const left = unit.offsetLeft - from.offsetLeft;
          const lyric = lyricRefs.current[target];
          const width = lyric ? lyric.offsetWidth : unit.offsetWidth;
          const enter = Math.max(0, (left - centre) / distance);
          const leave = target === drag.to ? 1 : Math.min(1, (left + width - centre) / distance);
          const span = drag.end - drag.start;
          const enters = drag.start + enter * span;
          const leaves = drag.start + leave * span + (target === drag.to ? DROP_LINGER : 0);
          windows.set(target, [...(windows.get(target) ?? []), [enters, Math.max(leaves, enters + HIGHLIGHT_RAMP)]]);
        }
      }

      for (const [target, ranges] of windows) {
        const lyric = lyricRefs.current[target];
        const drop = dropRefs.current[target];
        const off = { color: lyric ? getComputedStyle(lyric).color : "", opacity: 0 };
        const on = { color: highlightColor, opacity: 1 };
        const keyframes = (property: "color" | "opacity") => {
          const list: Keyframe[] = [{ [property]: off[property], offset: 0 }];
          for (const [enter, leave] of ranges) {
            list.push(
              { [property]: off[property], offset: enter },
              { [property]: on[property], offset: enter + HIGHLIGHT_RAMP },
              { [property]: on[property], offset: leave },
              { [property]: off[property], offset: leave + HIGHLIGHT_RAMP },
            );
          }
          list.push({ [property]: off[property], offset: 1 });
          return list;
        };
        const timing = { duration: LOOP_MS, iterations: Infinity, easing: "linear" } as const;
        if (lyric) animations.push(lyric.animate(keyframes("color"), timing));
        if (drop) animations.push(drop.animate(keyframes("opacity"), timing));
      }
    };

    build();
    // Web fonts shift the syllable widths once they load, which `fonts.ready` can miss when the
    // font only starts loading after this first render; observing the units catches any reflow.
    const observer = new ResizeObserver(build);
    for (const unit of unitRefs.current) if (unit) observer.observe(unit);
    return () => {
      observer.disconnect();
      for (const animation of animations) animation.cancel();
    };
  }, []);

  return (
    <span
      className="chord-tutorial-example"
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
                  ref={(el) => {
                    chipRefs.current[drag.id] = el;
                  }}
                  className="chord-tutorial-example__chord"
                >
                  {drag.chord}
                </span>
              ))}
            </span>
            <span
              ref={(el) => {
                lyricRefs.current[unitIndex] = el;
              }}
              className="chord-tutorial-example__lyric"
            >
              {unit.syllable}
              <span
                ref={(el) => {
                  dropRefs.current[unitIndex] = el;
                }}
                className="chord-tutorial-example__drop"
              />
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
      >
        <span
          ref={(el) => {
            dropRefs.current[END_SLOT] = el;
          }}
          className="chord-tutorial-example__drop"
        />
      </span>
    </span>
  );
}
