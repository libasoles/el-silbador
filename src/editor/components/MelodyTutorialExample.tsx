interface MelodyTutorialExampleProps {
  joined?: boolean;
}

/** A small, genuine HTML rendering of the syllable/note relationship taught by the tutorials. */
export function MelodyTutorialExample({ joined = false }: MelodyTutorialExampleProps) {
  const syllables = joined
    ? [
        ["y", "sol"],
        ["a", "mi"],
        ["yu da", "mi"],
        ["me", ""],
        ["a", "re"],
        ["en", ""],
        ["con", "mi"],
      ]
    : [
        ["Tú", "si"],
        ["can", "re"],
        ["ta", "fa"],
        ["bas", "re"],
        ["tris", "la"],
        ["te", "la"],
        ["por", "sol"],
        ["el", "fa"],
        ["ca", "re"],
        ["mi", "la"],
        ["no", "la"],
      ];

  return (
    <span
      className="melody-tutorial-example"
      aria-label={joined ? "Ejemplo de sílabas unidas" : "Ejemplo de notas de la melodía"}
    >
      {syllables.map(([syllable, note], index) => (
        <span
          key={`${syllable}-${index}`}
          className={
            "melody-tutorial-example__syllable" +
            (joined && index === 2 ? " melody-tutorial-example__syllable--joined" : "")
          }
        >
          <span className="melody-tutorial-example__lyric">{syllable}</span>
          <span className="melody-tutorial-example__note">{note}</span>
        </span>
      ))}
    </span>
  );
}
