import { Fragment, useLayoutEffect, useRef } from "react";

export interface ChordDragExampleUnit {
  syllable: string;
  wordBoundaryAfter?: boolean;
  /** Wide enough to hold a chord chip, so neighbouring chords never overlap. */
  wide?: boolean;
}

/** Where a chord sits: a unit's index, or the slot just before / after the whole phrase. */
export type ChordDragExampleSlot = number | "start" | "end";

export interface ChordDragExampleDrag {
  id: string;
  chord: string;
  from: ChordDragExampleSlot;
  to: ChordDragExampleSlot;
  /** When the drag starts and ends, as fractions of the loop. */
  start: number;
  end: number;
}

const DEFAULT_UNITS: ChordDragExampleUnit[] = [
  { syllable: "Des" },
  { syllable: "de", wordBoundaryAfter: true },
  { syllable: "lo", wordBoundaryAfter: true },
  { syllable: "de", wordBoundaryAfter: true },
  { syllable: "Bal" },
  { syllable: "de" },
  { syllable: "rra", wide: true },
  { syllable: "ma", wide: true },
];

/** E7 from "Des" onto "lo", G7 from "ma" to the first slot after the phrase, then Am from "rra"
 *  onto the "ma" G7 just left. */
const DEFAULT_DRAGS: ChordDragExampleDrag[] = [
  { id: "e7", chord: "E7", from: 0, to: 2, start: 0.05, end: 0.22 },
  { id: "g7", chord: "G7", from: 7, to: "end", start: 0.3, end: 0.44 },
  { id: "am", chord: "Am", from: 6, to: 7, start: 0.52, end: 0.66 },
];

const LOOP_MS = 9000;
/** The drag starts fast and slows down as the chord is about to be dropped. */
const DRAG_EASING = [0.1, 0.6, 0.3, 1] as const;

/** Fraction of a drag's duration at which the chip has covered `progress` of its distance: the
 *  inverse of the easing curve, so highlights can be timed to where the chip actually is. */
function timeAtProgress(progress: number): number {
  const [x1, y1, x2, y2] = DRAG_EASING;
  const bezier = (u: number, a: number, b: number) =>
    3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u ** 2 * b + u ** 3;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (bezier(mid, y1, y2) < progress) low = mid;
    else high = mid;
  }
  return bezier((low + high) / 2, x1, x2);
}
/** Everything fades out over this stretch at the end of the loop, then restarts from rest. */
const FADE_OUT_START = 0.9;
const FADE_OUT_END = 0.95;
/** How long a dropped-on target stays lit after the chord lands, and how fast highlights fade. */
const DROP_LINGER = 0.04;
const HIGHLIGHT_RAMP = 0.01;

/** Unit indices as-is, -1 for the slot before the phrase and `unitCount` for the one after it. */
function slotIndex(slot: ChordDragExampleSlot, unitCount: number): number {
  return slot === "start" ? -1 : slot === "end" ? unitCount : slot;
}

/** Ref callback body for the per-slot element maps. */
function keepRef(map: Map<number, HTMLSpanElement>, index: number, el: HTMLSpanElement | null) {
  if (el) map.set(index, el);
  else map.delete(index);
}

interface ChordDragTutorialExampleProps {
  units?: ChordDragExampleUnit[];
  /** Played one after another. Each one may move left or right, onto a syllable or an edge slot. */
  drags?: ChordDragExampleDrag[];
  label?: string;
}

/** A tiny editor-like line that loops the chord drag gesture. A destination lights up (text plus
 *  a thicker underline, like `.syllable--drop-target` and `.line-edge-drop--active` in App.css)
 *  exactly while the dragged chip is over it, which is computed from the measured positions. */
export function ChordDragTutorialExample({
  units = DEFAULT_UNITS,
  drags = DEFAULT_DRAGS,
  label = "Ejemplo de acordes arrastrados sobre la frase",
}: ChordDragTutorialExampleProps) {
  const hasSlot = (slot: "start" | "end") => drags.some((drag) => drag.from === slot || drag.to === slot);

  const unitRefs = useRef(new Map<number, HTMLSpanElement>());
  const lyricRefs = useRef(new Map<number, HTMLSpanElement>());
  const dropRefs = useRef(new Map<number, HTMLSpanElement>());
  const chipRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  useLayoutEffect(() => {
    let animations: Animation[] = [];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const build = () => {
      for (const animation of animations) animation.cancel();
      animations = [];

      const firstUnit = unitRefs.current.get(0);
      if (!firstUnit) return;
      const highlightColor = getComputedStyle(firstUnit).getPropertyValue("--highlight");
      const windows = new Map<number, [number, number][]>();

      for (const drag of drags) {
        const fromIndex = slotIndex(drag.from, units.length);
        const toIndex = slotIndex(drag.to, units.length);
        const chip = chipRefs.current[drag.id];
        const from = unitRefs.current.get(fromIndex);
        const to = unitRefs.current.get(toIndex);
        if (!chip || !from || !to || fromIndex === toIndex) continue;
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
              {
                ...rest,
                offset: drag.start,
                easing: `cubic-bezier(${DRAG_EASING.join(", ")})`,
              },
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
        // easing curve maps that position to a moment in the loop. Works for either direction:
        // the bounds are crossed in reverse order when the chip travels left.
        const centre = chip.offsetWidth / 2;
        const step = toIndex > fromIndex ? 1 : -1;
        for (let target = fromIndex + step; target !== toIndex + step; target += step) {
          const unit = unitRefs.current.get(target);
          if (!unit) continue;
          const left = unit.offsetLeft - from.offsetLeft;
          const lyric = lyricRefs.current.get(target);
          const width = lyric ? lyric.offsetWidth : unit.offsetWidth;
          const atLeftEdge = (left - centre) / distance;
          const atRightEdge = (left + width - centre) / distance;
          const enter = Math.max(0, Math.min(atLeftEdge, atRightEdge));
          const leave = target === toIndex ? 1 : Math.min(1, Math.max(atLeftEdge, atRightEdge));
          const span = drag.end - drag.start;
          const enters = drag.start + timeAtProgress(enter) * span;
          const leaves = drag.start + timeAtProgress(leave) * span + (target === toIndex ? DROP_LINGER : 0);
          windows.set(target, [...(windows.get(target) ?? []), [enters, Math.max(leaves, enters + HIGHLIGHT_RAMP)]]);
        }
      }

      for (const [target, ranges] of windows) {
        const lyric = lyricRefs.current.get(target);
        const drop = dropRefs.current.get(target);
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
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(build);
    for (const unit of unitRefs.current.values()) observer?.observe(unit);
    return () => {
      observer?.disconnect();
      for (const animation of animations) animation.cancel();
    };
  }, [units, drags]);

  // Every place a chord can sit, left to right: the optional edge slots wrap the phrase's units.
  const slots: { index: number; unit?: ChordDragExampleUnit; wordBoundaryAfter?: boolean; gapAfter: boolean }[] = [
    ...(hasSlot("start") ? [{ index: slotIndex("start", units.length), wordBoundaryAfter: true, gapAfter: true }] : []),
    ...units.map((unit, index) => ({ index, unit, wordBoundaryAfter: unit.wordBoundaryAfter, gapAfter: true })),
    ...(hasSlot("end") ? [{ index: slotIndex("end", units.length), gapAfter: false }] : []),
  ];

  return (
    <span className="chord-tutorial-example" aria-label={label}>
      {slots.map(({ index, unit, wordBoundaryAfter, gapAfter }) => (
        <Fragment key={index}>
          <span
            ref={(el) => keepRef(unitRefs.current, index, el)}
            className={
              "chord-tutorial-example__unit" +
              (!unit || unit.wide ? " chord-tutorial-example__unit--wide" : "") +
              (unit ? "" : " chord-tutorial-example__edge")
            }
          >
            <span className="chord-tutorial-example__chords">
              {drags
                .filter((drag) => slotIndex(drag.from, units.length) === index)
                .map((drag) => (
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
            {unit ? (
              <span ref={(el) => keepRef(lyricRefs.current, index, el)} className="chord-tutorial-example__lyric">
                {unit.syllable}
                <span ref={(el) => keepRef(dropRefs.current, index, el)} className="chord-tutorial-example__drop" />
              </span>
            ) : (
              <span ref={(el) => keepRef(dropRefs.current, index, el)} className="chord-tutorial-example__drop" />
            )}
          </span>
          {gapAfter ? (
            <span
              className={
                "chord-tutorial-example__gap" +
                (wordBoundaryAfter ? " chord-tutorial-example__gap--word-boundary" : "")
              }
            />
          ) : null}
        </Fragment>
      ))}
    </span>
  );
}
