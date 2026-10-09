import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { shouldPreserveTextSelection } from "./selectionGesture";

const styles = readFileSync(new URL("./App.css", import.meta.url), "utf8");
const themeStyles = readFileSync(
  new URL("./theme.css", import.meta.url),
  "utf8",
);
const globalStyles = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const iconButtonTooltip = readFileSync(
  new URL("./components/IconButtonTooltip.tsx", import.meta.url),
  "utf8",
);
const favicon = readFileSync(
  new URL("../../public/favicon.svg", import.meta.url),
  "utf8",
);
const darkFavicon = readFileSync(
  new URL("../../public/favicon-dark.svg", import.meta.url),
  "utf8",
);
const layout = readFileSync(
  new URL("../../src/app/layout.tsx", import.meta.url),
  "utf8",
);
const authModal = readFileSync(
  new URL("./components/AuthModal.tsx", import.meta.url),
  "utf8",
);
const autosave = readFileSync(
  new URL("./useAutosave.ts", import.meta.url),
  "utf8",
);
const lineView = readFileSync(
  new URL("./components/LineView.tsx", import.meta.url),
  "utf8",
);
const trackRow = readFileSync(
  new URL("./components/TrackRow.tsx", import.meta.url),
  "utf8",
);
const songView = readFileSync(
  new URL("./components/SongView.tsx", import.meta.url),
  "utf8",
);
const toastStyles = readFileSync(
  new URL("./components/Toast.css", import.meta.url),
  "utf8",
);
const providers = readFileSync(
  new URL("../app/providers.tsx", import.meta.url),
  "utf8",
);
const toastProvider = readFileSync(
  new URL("./components/ToastProvider.tsx", import.meta.url),
  "utf8",
);
const tabBlockStyles = readFileSync(
  new URL("./components/TabBlock.css", import.meta.url),
  "utf8",
);

describe("Tabs toggle", () => {
  it("comes first in the desktop toolbar and in the mobile menu", () => {
    for (const container of ['className="track-toolbar"', 'className="mobile-sidebar-menu__controls"']) {
      const toolbar = app.slice(app.indexOf(container));
      expect(toolbar.indexOf("<TabsToggleButton"), container).toBeGreaterThan(-1);
      expect(toolbar.indexOf("<TabsToggleButton"), container).toBeLessThan(toolbar.indexOf("<TrackToggleButton"));
    }
  });
});

describe("tab blocks in the PDF", () => {
  it("prints a shown block without its editing and copy tools", () => {
    expect(tabBlockStyles).toMatch(
      /@media print\s*\{[\s\S]*\.ascii-tabs-hint,[\s\S]*\.ascii-tabs-spacing,[\s\S]*\.ascii-tabs-button,[\s\S]*\.ascii-tabs-add[\s\S]*display:\s*none/,
    );
  });

  it("keeps each Sheet on one page when it can", () => {
    expect(tabBlockStyles).toMatch(/@media print\s*\{[\s\S]*\.ascii-tabs-sheet\s*\{[\s\S]*break-inside:\s*avoid/);
  });

  it("prints nothing for a block a reader left hidden", () => {
    expect(styles).toMatch(/\.line--tab\[hidden\]\s*\{\s*display:\s*none;/);
  });
});

describe("tab blocks", () => {
  it("inherits the surrounding font size for ascii-tabs", () => {
    expect(tabBlockStyles).toMatch(/\.tab-block\s*\{[\s\S]*--ascii-tabs-font-size:\s*1em;/);
  });
});

describe("underline visibility", () => {
  it("applies the saved global melody choice before annotation cells are revealed", () => {
    expect(app).toContain("useLayoutEffect");
    expect(app).toContain("readMelodyTogglePreference()");
    expect(app).toContain("[songSlug, state.song, setMelodyVisibility]");
  });

  it("persists only an explicit melody toggle and does not sync open tabs", () => {
    expect(app).toContain("saveMelodyTogglePreference(next)");
    expect(app).not.toContain('addEventListener("storage"');
  });

  it("does not couple the underline to the chords track visibility", () => {
    expect(styles).not.toMatch(/\.line--chords-hidden\s+\.syllable::after/);
    expect(styles).toMatch(/\.song--underline-hidden\s+\.syllable::after/);
  });

  it("uses an ink-based underline when printing", () => {
    // Browser print dialogs may omit CSS backgrounds, so the visible editor background must not
    // be the only representation of a syllable underline in the generated PDF.
    expect(styles).toMatch(
      /@media print\s*\{[\s\S]*\.syllable::after,\s*\.syllable-gap--merged::after\s*\{[\s\S]*border-bottom:\s*2px solid var\(--syllable-underline\)/,
    );
  });

  it("shows read-only underlines for chorded and merged syllables while keeping editor guides complete", () => {
    expect(lineView).toContain(
      'readOnly ? " line--chord-underlines-only" : ""',
    );
    expect(lineView).toContain(
      'readOnly && hasChordAtSyllable(syllable.id) ? " syllable--has-chord" : ""',
    );
    expect(styles).toMatch(
      /\.line--chord-underlines-only \.syllable::after,[\s\S]*\.line--chord-underlines-only \.syllable-gap--merged::after\s*\{\s*content: none/,
    );
    expect(styles).toMatch(
      /\.line--chord-underlines-only \.syllable--has-chord::after,[\s\S]*\.line--chord-underlines-only \.syllable--merged::after,[\s\S]*\.line--chord-underlines-only \.syllable-gap--merged::after\s*\{\s*content: ""/,
    );
  });
});

describe("PDF export layout", () => {
  it("removes the responsive page-shell clearance from printed pages", () => {
    // On phones the screen layout reserves 5.5rem for the fixed logo. That clearance is not
    // part of the document and must not consume the printable height of the first PDF page.
    expect(globalStyles).toMatch(
      /@media print\s*\{[\s\S]*\.page-shell\s*\{[\s\S]*padding:\s*0/,
    );
  });

  it("replaces editor save state with the El Silbador URL in the lower-right corner", () => {
    expect(app).toContain('className="print-site-url">elsilbador.com.ar</p>');
    expect(styles).toMatch(
      /@media print\s*\{[\s\S]*\.autosave-status,[\s\S]*\.print-site-url\s*\{[\s\S]*position: fixed[\s\S]*right: 1\.5cm[\s\S]*bottom: 1\.5cm/,
    );
  });
});

describe("lyric caret visibility", () => {
  it("uses a dark-gray color instead of the browser's automatic caret color", () => {
    expect(styles).toMatch(/\.song\s*\{[\s\S]*caret-color: #555/);
  });
});

describe("BIS phrases", () => {
  it("renders emphasized phrases and a baseline-aligned sans-serif BIS marker, and supports the Tab shortcut", () => {
    expect(songView).toContain('event.key === "Tab"');
    expect(songView).toContain("event.shiftKey");
    expect(songView).toContain("onToggleBis(");
    expect(lineView).toContain('"bis-marker"');
    expect(lineView).toContain("ArrowLeft");
    expect(lineView).toContain("ArrowUpLeft");
    expect(lineView).toContain('bisRule === "end" ? ArrowUpLeft : ArrowLeft');
    expect(styles).toMatch(
      /\.line--bis \.syllable-row\s*\{[\s\S]*align-items:\s*baseline[\s\S]*font-weight:\s*600/,
    );
    expect(styles).toMatch(
      /\.line--tab-candidate \.syllable-row\s*\{[\s\S]*font-family:\s*var\(--sans\)/,
    );
    expect(styles).toMatch(
      /\.bis-marker\s*\{[\s\S]*color:\s*var\(--muted\)[\s\S]*font-weight:\s*500/,
    );
  });

  it("never underlines the BIS word or lets it join a melisma, wherever it sits in the line", () => {
    expect(lineView).toContain("isBisWord(");
    expect(lineView).toContain('(bis ? " syllable--bis" : "")');
    expect(lineView).toContain(
      "disabled={!showUnderline || readOnly || touchesBis}",
    );
    expect(styles).toMatch(
      /\.line \.syllable--bis::after\s*\{\s*content:\s*none/,
    );
  });

  it("offers no chord or melody cell above BIS and refuses drops on it", () => {
    expect(lineView).toContain(
      '!bisSlots.has(slotId) && (trackId !== "vocalNotes"',
    );
    expect(lineView).toContain(
      '!bisSlots.has(slotId) && (track.id !== "vocalNotes"',
    );
  });

  it("handles Tab and Shift+Tab from anywhere in a lyric line instead of moving browser focus", () => {
    expect(songView).not.toContain("start.offset !== 0) return;");
    expect(songView).toContain("event.preventDefault();");
  });

  it("normalizes a multi-line selection ending on another row of its line", () => {
    expect(songView).toContain('closest<HTMLElement>(".line")');
    expect(songView).toContain("Node.DOCUMENT_POSITION_FOLLOWING");
  });
});

describe("passive editor click caret placement", () => {
  it("maps a simple click in annotation space or an edge drop zone to the associated lyric row", () => {
    expect(songView).toContain("function lyricLineForClick");
    expect(songView).toContain('targetElement?.closest(".line")');
    expect(songView).toContain("function caretForClick");
    expect(songView).toContain("caretForClick(");
    expect(songView).toContain("restoreCaret(root, position)");
    expect(songView).toContain("function isPassiveCaretSurface");
    expect(songView).toContain("onPointerDownCapture");
  });

  it("uses the browser's horizontal caret hit-testing and keeps a deterministic end fallback", () => {
    expect(songView).toContain("caretPositionFromPoint");
    expect(songView).toContain("caretRangeFromPoint");
    expect(songView).toContain("lineText(line).length");
    expect(styles).toMatch(/\.track-row\s*\{[\s\S]*cursor: text/);
    expect(styles).toMatch(/\.line-edge-drop\s*\{[\s\S]*cursor: text/);
  });

  it("places passive-surface carets before click and extends a drag with pointer capture", () => {
    expect(songView).toContain(
      "event.currentTarget.setPointerCapture(event.pointerId)",
    );
    expect(songView).toContain("selection.setBaseAndExtent(");
    expect(songView).toContain("if (gesture?.managed) return");
  });
});

describe("lyric selection completion", () => {
  it("keeps a non-collapsed selection made by dragging or Shift+clicking", () => {
    expect(
      shouldPreserveTextSelection({ isCollapsed: false }, true, false),
    ).toBe(true);
    expect(
      shouldPreserveTextSelection({ isCollapsed: false }, false, true),
    ).toBe(true);
    expect(
      shouldPreserveTextSelection({ isCollapsed: false }, false, false),
    ).toBe(false);
    expect(
      shouldPreserveTextSelection({ isCollapsed: true }, true, false),
    ).toBe(false);
  });
});

describe("melody-note layout reveal", () => {
  it("keeps melody notes invisible until their slots are measured, then reveals them left to right", () => {
    expect(lineView).toContain("areSlotRectsReady(trackSlotIds, slotRects)");
    expect(lineView).toContain(
      "slotRectsMeasuredFor === annotationGapExtrasKey",
    );
    expect(styles).toMatch(
      /\.track-row\[data-track="vocalNotes"\]:not\(\.track-row--annotations-ready\) \.track-cell\s*\{\s*visibility: hidden/,
    );
    expect(styles).toMatch(
      /\.track-row\[data-track="vocalNotes"\]\.track-row--annotations-ready \.track-cell\s*\{[\s\S]*animation: melody-note-reveal 120ms ease-out both[\s\S]*animation-delay: calc\(var\(--melody-note-index, 0\) \* 28ms\)/,
    );
  });
});

describe("chord layout loading", () => {
  it("keeps chords hidden until their slots are measured only on the initial load, without animation", () => {
    expect(lineView).toContain("const chordRevealedRef = useRef(false)");
    expect(lineView).toContain("chordRevealedRef.current ||");
    expect(styles).toMatch(
      /\.track-row\[data-track="chords"\]:not\(\.track-row--annotations-ready\) \.track-cell\s*\{\s*visibility: hidden/,
    );
    expect(styles).not.toMatch(
      /\.track-row\[data-track="chords"\]\.track-row--annotations-ready \.track-cell\s*\{[\s\S]*animation:/,
    );
  });
});

describe("empty annotation rows", () => {
  it("omits every empty track in read-only lines", () => {
    expect(lineView).toContain("if (!readOnly) return true;");
    expect(lineView).toContain(
      'trackSlotIds.some((slotId) => getCell(cells, track.id, slotId).trim() !== "")',
    );
    expect(lineView).toContain('if (track.id === "chordNotes")');
    expect(lineView).toContain(
      'track.visible && track.id !== "vocalNotes" && hasTrackContent(track)',
    );
    expect(lineView).toContain(
      'track.visible && track.id === "vocalNotes" && showUnderline && hasTrackContent(track)',
    );
  });

  it("keeps blank rows available while editing but removes them from PDF exports", () => {
    expect(lineView).toContain("if (!readOnly) return true;");
    expect(trackRow).toContain("data-empty={!hasContent}");
    expect(styles).toMatch(
      /@media print\s*\{[\s\S]*\.track-row\[data-empty="true"\]\s*\{\s*display: none/,
    );
  });
});

describe("icon-button tooltips", () => {
  it("uses a lock that reflects the song's current privacy", () => {
    expect(app).toContain("PrivacyLockedIcon");
    expect(app).toContain("PrivacyUnlockedIcon");
    expect(app).toMatch(
      /songIsPublic \? \(\s*<PrivacyUnlockedIcon \/>\s*\) : \(\s*<PrivacyLockedIcon \/>/,
    );
  });

  it("uses a simple lock for private songs and a visibly detached shackle for public ones", () => {
    const icons = readFileSync(
      new URL("./components/icons.tsx", import.meta.url),
      "utf8",
    );

    expect(icons).toContain("Lock as PrivacyLockedIcon");
    expect(icons).toMatch(
      /function PrivacyUnlockedIcon\(\)[\s\S]*<path d="M8 10V6a4 4 0 0 1 7\.2-2\.4" \/>/,
    );
  });

  it("renders a visible tooltip from a hoverable wrapper", () => {
    expect(iconButtonTooltip).toContain("function IconButtonTooltip");
    expect(iconButtonTooltip).toContain("icon-button-tooltip");
    expect(iconButtonTooltip).toContain("data-tooltip={tooltip}");
    expect(app).not.toMatch(/<button[^>]*\btitle=/);
    expect(themeStyles).toMatch(
      /\.icon-button-tooltip\s*\{[\s\S]*display: inline-flex/,
    );
    expect(themeStyles).toMatch(
      /\.icon-button-tooltip > button:disabled\s*\{[\s\S]*pointer-events: none/,
    );
    // Touch taps leave a sticky hover/focus: only real hover and keyboard focus may show it.
    expect(themeStyles).toMatch(
      /@media \(hover: hover\)\s*\{\s*\.icon-button-tooltip:hover::after\s*\{\s*opacity: 1/,
    );
    expect(themeStyles).toMatch(
      /\.icon-button-tooltip:has\(:focus-visible\)::after\s*\{\s*opacity: 1/,
    );
    expect(themeStyles).not.toContain(".icon-button-tooltip:focus-within::after");
    expect(themeStyles).toContain("content: attr(data-tooltip)");
  });

  it("anchors the close tooltip wrapper to the fixed close control", () => {
    expect(app).toMatch(/<IconButtonTooltip\s+className="app-close-tooltip"/);
    expect(styles).toMatch(
      /\.app-close-tooltip\s*\{[\s\S]*position: fixed[\s\S]*top: 1rem[\s\S]*right: 1rem/,
    );
    expect(styles).toMatch(
      /\.app-close-tooltip\s*\{[\s\S]*width: 2\.75rem[\s\S]*height: 2\.75rem/,
    );
    expect(styles).toMatch(/\.app-close\s*\{[\s\S]*position: static/);
  });
});

describe("mobile sidebar menu", () => {
  it("keeps song controls collapsed behind a top-of-sidebar hamburger on mobile", () => {
    expect(app).toContain(
      "const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)",
    );
    expect(app).toContain('className="mobile-sidebar-menu"');
    expect(app).toContain("<MenuIcon />");
    expect(app).toContain('aria-controls="mobile-sidebar-menu-controls"');
    expect(app).toContain("ref={mobileSidebarMenuRef}");
    expect(app).toContain(
      'document.addEventListener("pointerdown", closeWhenClickingOutside)',
    );
    expect(app).toContain(
      "!mobileSidebarMenuRef.current?.contains(event.target)",
    );
    expect(app).toContain('tooltip="Herramientas"');
    expect(app).not.toContain("Herramientas de la canción");
    expect(app).toMatch(/mobile-sidebar-menu__controls[\s\S]*Exportar a PDF/);
    expect(styles).toMatch(
      /@media \(max-width: 30rem\)\s*\{[\s\S]*\.mobile-sidebar-menu\s*\{[\s\S]*top: 9rem/,
    );
    expect(styles).toMatch(
      /@media \(max-width: 30rem\)\s*\{[\s\S]*\.track-toolbar,\s*\.action-toolbar\s*\{[\s\S]*display: none/,
    );
    expect(styles).toMatch(
      /\.mobile-sidebar-menu__controls\s*\{[\s\S]*top: calc\(100% \+ 0\.5rem\)[\s\S]*right: 0/,
    );
  });
});

describe("fork source link", () => {
  it("places a fork icon before the title and explains that it navigates to the source song", () => {
    expect(app).toContain('className="fork-source-link"');
    expect(app).toContain("href={`/cancion/${forkSourceSlug}`}");
    expect(app).toContain("Ver la canción de la que se derivó esta versión");
    expect(app).toMatch(
      /className="title-row"[\s\S]*className="fork-source-link"[\s\S]*className="title-input"/,
    );
    expect(app).toMatch(/className="fork-source-tooltip"[\s\S]*?side="right"/);
  });
});

describe("application mark", () => {
  it("renders a larger Silbador icon that links to the index", () => {
    expect(app).toContain("<SilbadorIcon />");
    expect(app).toContain('className="app-mark"');
    expect(app).toContain('href="/"');
    expect(themeStyles).toMatch(
      /\.app-mark\s*\{[\s\S]*position: fixed[\s\S]*top: 1rem[\s\S]*left: 1rem/,
    );
    expect(themeStyles).toMatch(/\.app-mark\s*\{[\s\S]*color: #000/);
    expect(themeStyles).toMatch(/\.app-mark\s*\{[\s\S]*width: 3\.25rem/);
  });
});

describe("favicon", () => {
  it("uses a black whistling-face mark on a white background", () => {
    expect(favicon).toContain('viewBox="0 0 64 64"');
    expect(favicon).toContain('<rect width="64" height="64" fill="#fff"/>');
    expect(favicon).toContain('stroke="#000"');
    expect(favicon).toContain('stroke-width="2.15"');
    expect(favicon).toContain("M38.8 35.3C40.1 34.7");
    expect(favicon).toContain('stroke-width="1.75"');
  });

  it("selects black or white strokes from the system color scheme", () => {
    expect(layout).toContain('url: "/favicon-light.svg"');
    expect(layout).toContain('media: "(prefers-color-scheme: light)"');
    expect(layout).toContain('url: "/favicon-dark.svg"');
    expect(layout).toContain('media: "(prefers-color-scheme: dark)"');
    expect(darkFavicon).toContain('stroke="#000"');
  });
});

describe("authentication dialog", () => {
  it("confirms magic links without assuming the action that opened it", () => {
    expect(authModal).toContain(
      "Abrí el enlace para iniciar sesión y continuar.",
    );
    expect(authModal).toContain('<MailIcon aria-hidden="true" />');
    expect(authModal).not.toContain("terminar de guardar la canción");
  });
});

describe("post-login save", () => {
  it("restores a pending draft into the editor", () => {
    expect(app).toMatch(
      /if \(draft\) \{[\s\S]*actions\.loadContent\(draft\.content\);\s*setContentLoaded\(true\);\s*\}/,
    );
  });

  it("confirms an existing song's post-login save only after it succeeds", () => {
    expect(app).toMatch(
      /if \(!songSlug \|\| !authenticated \|\| autosaveStatus !== "saved"\) return;[\s\S]*pendingAction\?\.type === "save-song"[\s\S]*clearDraft\(\);[\s\S]*showToast\(SONG_SAVED_TOAST\)/,
    );
  });

  it("defers reading a local draft until after hydration", () => {
    expect(app).toMatch(
      /const \[restoredDraft, setRestoredDraft\] =\s*useState<ReturnType<typeof readDraft>>\(null\);/,
    );
    expect(app).toContain("useEditor(initialSong?.content, isMobile)");
    expect(app).toMatch(
      /const draft = readDraft\(songSlug\);\s*restoredDraftRef\.current = draft;\s*setRestoredDraft\(draft\);/,
    );
  });

  it("leaves a pending new song to the app-wide resumer instead of autosave", () => {
    expect(providers).toContain("<PendingSongResumer session={session} />");
    expect(app).toContain(
      "const canPersist = isAuthoring && !isMobile && !pendingCreationId;",
    );
    expect(app).not.toContain("arrivedViaMagicLink");
  });

  it("keeps the same reserved creation id when Save is clicked again", () => {
    expect(app).toContain(
      "const draft = saveDraft(songSlug, content, pendingCreationId);",
    );
  });

  it("writes edits to the pending local copy, signed in or not", () => {
    expect(app).toContain(
      "const isPendingNewSong = Boolean(pendingCreationId) && !songSlug;",
    );
    expect(app).toMatch(
      /if \(!isPendingNewSong\) return;\s*saveDraft\(undefined, content, pendingCreationId\);/,
    );
  });

  it("retries a pending new song's save from the Save button once signed in", () => {
    expect(app).toMatch(
      /if \(isPendingNewSong\) \{\s*void resumePendingSong\(\);/,
    );
  });
});

describe("magic-link callback errors", () => {
  it("shows Supabase callback errors as a ten-second error toast", () => {
    expect(providers).toContain("<AuthCallbackErrorToast />");
    expect(toastStyles).toMatch(
      /\.toast--error\s*\{[\s\S]*background: #fff1f1[\s\S]*border: 1px solid #bd2d2d/,
    );
  });
});

describe("chord notes tutorial", () => {
  it("appears when the chord-notes track is activated and illustrates one shared note", () => {
    expect(app).toContain('tutorialId: "chord-notes-shared"');
    expect(app).toContain('icon: <NoteStackIcon boldNotes={["sol"]} />');
    expect(app).toContain(
      "Las notas en negrita significan que también existen en el acorde anterior.",
    );
  });

  it("keeps tutorials open until dismissal and records that dismissal", () => {
    expect(toastProvider).toContain("duration: Infinity");
    expect(toastProvider).toContain("markTutorialSeen(dismissed.tutorialId)");
    expect(toastProvider).toContain("!toast.tutorialId &&");
  });
});

describe("melody notes tutorials", () => {
  it("shows the writing and joining tutorials together when the underline is activated", () => {
    expect(app).toContain('tutorialId: "melody-notes-write"');
    expect(app).toMatch(
      /Podés hacer click debajo de una sílaba para escribir las notas de la\s+melodía\./,
    );
    expect(app).toContain('tutorialId: "melody-notes-join-syllables"');
    expect(app).toMatch(
      /Podés hacer click entre dos o más sílabas para unirlas y asignarles\s+una sola nota\./,
    );
    expect(app).toMatch(
      /if \(next && canEditOnThisDevice\) \{[\s\S]*showTutorial\(\{[\s\S]*tutorialId: "melody-notes-write"[\s\S]*\}\);\s*showMelodyJoinTutorial\(\)/,
    );
    expect(app).not.toContain("onDismiss: showMelodyJoinTutorial");
    expect(app).not.toMatch(/icon: <UnderlineIcon \/>/);
  });

  it("uses real HTML notation examples beneath both explanations", () => {
    const melodyExample = readFileSync(
      new URL("./components/MelodyTutorialExample.tsx", import.meta.url),
      "utf8",
    );
    expect(app).toContain("<MelodyTutorialExample animateNotes />");
    expect(app).toContain("<MelodyTutorialExample joined />");
    expect(melodyExample).toContain("melody-tutorial-example");
    expect(toastStyles).toContain(".melody-tutorial-example__note");
    expect(toastStyles).toContain("background: var(--syllable-underline)");
    expect(toastStyles).toContain("height: 2px");
    expect(toastStyles).toContain("left: 0.14em");
    expect(toastStyles).toMatch(
      /\.melody-tutorial-example__unit\s*\{[\s\S]*display: inline-grid[\s\S]*grid-template-rows: 1\.1em 1\.35em/,
    );
    expect(toastStyles).toMatch(
      /\.melody-tutorial-example__lyrics\s*\{[\s\S]*align-items: flex-end/,
    );
    expect(toastStyles).toMatch(
      /\.melody-tutorial-example__note\s*\{[\s\S]*text-align: left/,
    );
    expect(melodyExample).toContain("mergedAfter");
    expect(melodyExample).toMatch(
      /wordBoundaryAfter\s*\?\s*" melody-tutorial-example__gap--word-boundary"/,
    );
    expect(melodyExample).toContain("melody-tutorial-example--typing");
    expect(toastStyles).toContain("melody-tutorial-note-appear");
    expect(melodyExample).toContain("setInterval");
    expect(melodyExample).toContain("}, 4_000)");
    expect(melodyExample).toContain(
      "key={animateNotes ? `${unitIndex}-${animationCycle}` : undefined}",
    );
    expect(toastStyles).toMatch(
      /\.melody-tutorial-example--typing \.melody-tutorial-example__note--typing\s*\{[\s\S]*animation: melody-tutorial-note-appear 160ms ease-out forwards/,
    );
  });

  it("omits the default info icon from tutorials without artwork", () => {
    expect(toastProvider).toContain("toast.icon || !toast.tutorialId");
  });
});

describe("autosave", () => {
  it("serializes overlapping saves so a new song cannot be inserted twice", () => {
    expect(autosave).toContain("const saveInFlightRef = useRef(false)");
    expect(autosave).toContain("queuedSnapshotRef.current = snapshot");
    expect(autosave).toContain(
      "const saved = await saveSong({ id: idRef.current, content: snapshot.content });",
    );
  });

  it("keeps its creation callback stable across status renders", () => {
    // `useAutosave` schedules a save whenever one of its effect dependencies changes. An inline
    // callback here changes identity after every "saving"/"saved" status update, which turns the
    // debounce into a perpetual one-second save loop even while the editor content is unchanged.
    expect(app).toMatch(/const handleSongCreated = useCallback\(/);
    expect(app).toMatch(/useAutosave\([\s\S]*?handleSongCreated,/);
  });

  it("debounces document changes only", () => {
    // Saving updates state and can cause route callbacks or the database id to change. Neither is
    // a document edit, so neither may schedule another save one second later. Performers are
    // saved through the same flow (see useAutosave's doc comment), so they count as an edit.
    expect(autosave).toContain(
      "onSlugResolvedRef.current(saved.id, saved.slug)",
    );
    expect(autosave).toContain(
      "}, [content, performers, ready, authenticated, canPersist, retryTick, queryClient]);",
    );
    expect(autosave).toContain("const switchedExistingSong =");
  });
});
