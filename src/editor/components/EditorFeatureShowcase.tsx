import type { ReactNode } from "react";
import { MelodyTutorialExample } from "./MelodyTutorialExample";
import { BisTabDemo, MoveChordDemo, PitchDragDemo } from "./EditorFeatureDemos";
import "./EditorFeatureShowcase.css";

interface ShowcaseFeature {
  title: string;
  description: string;
  demo: ReactNode;
}

const FEATURES: ShowcaseFeature[] = [
  {
    title: "Mover un acorde a otra sílaba",
    description: "Si un acorde quedó corrido, arrastralo hasta la sílaba correcta.",
    demo: <MoveChordDemo />,
  },
  {
    title: "Ascensos y descensos melódicos",
    description:
      "Arrastrá una nota hacia arriba o hacia abajo para marcar si suena más aguda o más grave que la anterior.",
    demo: <PitchDragDemo />,
  },
  {
    title: "Una nota para varias sílabas",
    description: "Hacé click en el espacio entre dos sílabas para que compartan la misma nota.",
    demo: <MelodyTutorialExample joined />,
  },
  {
    title: "BIS presionando Tab",
    description: "Poné el cursor en una línea y presioná Tab para marcar que se canta dos veces.",
    demo: <BisTabDemo />,
  },
];

/** A sample of what the song editor can do, each feature with its looping demo. */
export function EditorFeatureShowcase() {
  return (
    <section className="editor-feature-showcase" aria-labelledby="editor-feature-showcase-title">
      <h3 id="editor-feature-showcase-title" className="editor-feature-showcase__title">
        Algunas cosas que vas a poder hacer
      </h3>
      <ul className="editor-feature-showcase__list">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="editor-feature-showcase__item">
            <h4 className="editor-feature-showcase__name">{feature.title}</h4>
            <p className="editor-feature-showcase__description">{feature.description}</p>
            <div className="editor-feature-showcase__demo">{feature.demo}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
