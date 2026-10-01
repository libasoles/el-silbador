import { Fragment } from "react";

interface MelodyTutorialExampleProps {
  joined?: boolean;
  animateNotes?: boolean;
}

interface ExampleSyllable {
  text: string;
  note: string;
  wordEnd?: boolean;
}

/** A small, genuine HTML rendering of the syllable/note relationship taught by the tutorials. */
export function MelodyTutorialExample({
  joined = false,
  animateNotes = false,
}: MelodyTutorialExampleProps) {
  const syllables: ExampleSyllable[] = joined
    ? [
        { text: "y", note: "sol", wordEnd: true },
        { text: "a", note: "mi" },
        { text: "yu", note: "" },
        { text: "da", note: "" },
        { text: "me", note: "" },
        { text: "a", note: "" },
        { text: "en", note: "" },
        { text: "con", note: "mi" },
      ]
    : [
        { text: "Tú", note: "si", wordEnd: true },
        { text: "can", note: "re" },
        { text: "ta", note: "fa" },
        { text: "bas", note: "re", wordEnd: true },
        { text: "tris", note: "la" },
        { text: "te", note: "la", wordEnd: true },
        { text: "por", note: "sol", wordEnd: true },
        { text: "el", note: "fa", wordEnd: true },
        { text: "ca", note: "re" },
        { text: "mi", note: "la" },
        { text: "no", note: "la" },
      ];

  return (
    <span
      className={"melody-tutorial-example" + (animateNotes ? " melody-tutorial-example--typing" : "")}
      aria-label={joined ? "Ejemplo de sílabas unidas" : "Ejemplo de notas de la melodía"}
    >
      {syllables.map((syllable, index) => {
        if (joined && index === 2) {
          return (
            <Fragment key="yu-da">
              <span className="melody-tutorial-example__merged-unit">
                <span className="melody-tutorial-example__lyric">yu</span>
                <span className="melody-tutorial-example__gap melody-tutorial-example__gap--merged" />
                <span className="melody-tutorial-example__lyric">da</span>
                <span className="melody-tutorial-example__note">mi</span>
              </span>
              <span className="melody-tutorial-example__gap" />
            </Fragment>
          );
        }
        if (joined && index === 3) return null;
        if (joined && index === 4) {
          return (
            <Fragment key="me-a-en">
              <span className="melody-tutorial-example__merged-unit">
                <span className="melody-tutorial-example__lyric">me</span>
                <span className="melody-tutorial-example__gap melody-tutorial-example__gap--merged melody-tutorial-example__gap--word-boundary" />
                <span className="melody-tutorial-example__lyric">a</span>
                <span className="melody-tutorial-example__gap melody-tutorial-example__gap--merged melody-tutorial-example__gap--word-boundary" />
                <span className="melody-tutorial-example__lyric">en</span>
                <span className="melody-tutorial-example__note">re</span>
              </span>
              <span className="melody-tutorial-example__gap" />
            </Fragment>
          );
        }
        if (joined && (index === 5 || index === 6)) return null;
        return (
          <Fragment key={`${syllable.text}-${index}`}>
            <span className="melody-tutorial-example__syllable">
              <span className="melody-tutorial-example__lyric">{syllable.text}</span>
              <span
                className={
                  "melody-tutorial-example__note" +
                  (animateNotes && syllable.note ? " melody-tutorial-example__note--typing" : "")
                }
                style={animateNotes && syllable.note ? { animationDelay: `${index * 360}ms` } : undefined}
              >
                {syllable.note}
              </span>
            </span>
            {index < syllables.length - 1 && (
              <span
                className={
                  "melody-tutorial-example__gap" +
                  (syllable.wordEnd ? " melody-tutorial-example__gap--word-boundary" : "")
                }
              />
            )}
          </Fragment>
        );
      })}
    </span>
  );
}
