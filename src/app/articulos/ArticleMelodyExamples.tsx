"use client";

import { PitchDragDemo } from "../../editor/components/EditorFeatureDemos";
import { MelodyTutorialExample } from "../../editor/components/MelodyTutorialExample";

export function MelodyTypingExample() {
  return (
    <div className="article-gesture">
      <MelodyTutorialExample animateNotes />
    </div>
  );
}

export function MelodyJoinExample() {
  return (
    <div className="article-gesture">
      <MelodyTutorialExample joined />
    </div>
  );
}

/** Looping drag demo: one note pulled up gets ↑, another pulled down gets ↓. */
export function PitchDragExample() {
  return (
    <div className="article-gesture">
      <PitchDragDemo />
    </div>
  );
}
