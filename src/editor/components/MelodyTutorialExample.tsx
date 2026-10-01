import { Fragment } from "react";

interface MelodyTutorialExampleProps {
  joined?: boolean;
  animateNotes?: boolean;
}

interface ExampleSyllable {
  text: string;
  mergedAfter?: boolean;
  wordBoundaryAfter?: boolean;
}

interface ExampleUnit {
  syllables: ExampleSyllable[];
  note: string;
  wordBoundaryAfter?: boolean;
  blinkNote?: boolean;
}

/** A tiny editor-like line: notes occupy their own row and begin at the unit's first syllable. */
export function MelodyTutorialExample({
  joined = false,
  animateNotes = false,
}: MelodyTutorialExampleProps) {
  const units: ExampleUnit[] = joined
    ? [
        { syllables: [{ text: "y" }], note: "sol", wordBoundaryAfter: true },
        { syllables: [{ text: "a" }], note: "mi" },
        {
          syllables: [{ text: "yu", mergedAfter: true }, { text: "da" }],
          note: "mi",
        },
        {
          syllables: [
            { text: "me", mergedAfter: true, wordBoundaryAfter: true },
            { text: "a", mergedAfter: true, wordBoundaryAfter: true },
            { text: "en" },
          ],
          note: "mi",
          blinkNote: true,
        },
        { syllables: [{ text: "con" }], note: "re" },
        { syllables: [{ text: "trar" }], note: "mi" },
      ]
    : [
        { syllables: [{ text: "Tú" }], note: "si", wordBoundaryAfter: true },
        { syllables: [{ text: "can" }], note: "re" },
        { syllables: [{ text: "ta" }], note: "fa" },
        { syllables: [{ text: "bas" }], note: "re", wordBoundaryAfter: true },
        { syllables: [{ text: "tris" }], note: "la" },
        { syllables: [{ text: "te" }], note: "la", wordBoundaryAfter: true },
      ];

  return (
    <span
      className={
        "melody-tutorial-example" +
        (animateNotes ? " melody-tutorial-example--typing" : "")
      }
      aria-label={
        joined ? "Ejemplo de sílabas unidas" : "Ejemplo de notas de la melodía"
      }
    >
      {units.map((unit, unitIndex) => (
        <Fragment key={`${unit.syllables[0]!.text}-${unitIndex}`}>
          <span className="melody-tutorial-example__unit">
            <span className="melody-tutorial-example__lyrics">
              {unit.syllables.map((syllable, syllableIndex) => (
                <Fragment key={`${syllable.text}-${syllableIndex}`}>
                  <span
                    className={
                      "melody-tutorial-example__lyric" +
                      (syllable.text.length === 1
                        ? " melody-tutorial-example__lyric--single-letter"
                        : "")
                    }
                  >
                    {syllable.text}
                  </span>
                  {syllable.mergedAfter ? (
                    <span
                      className={
                        "melody-tutorial-example__gap melody-tutorial-example__gap--merged" +
                        (syllable.wordBoundaryAfter
                          ? " melody-tutorial-example__gap--word-boundary"
                          : "")
                      }
                    />
                  ) : null}
                </Fragment>
              ))}
            </span>
            <span
              className={
                "melody-tutorial-example__note" +
                (animateNotes ? " melody-tutorial-example__note--typing" : "") +
                (unit.blinkNote ? " melody-tutorial-example__note--blink" : "")
              }
              style={
                animateNotes
                  ? { animationDelay: `${unitIndex * 360}ms` }
                  : undefined
              }
            >
              {unit.note}
            </span>
          </span>
          {unitIndex < units.length - 1 ? (
            <span
              className={
                "melody-tutorial-example__gap" +
                (unit.wordBoundaryAfter
                  ? " melody-tutorial-example__gap--word-boundary"
                  : "")
              }
            />
          ) : null}
        </Fragment>
      ))}
    </span>
  );
}
