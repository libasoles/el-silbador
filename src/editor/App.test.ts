import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("./App.css", import.meta.url), "utf8");
const themeStyles = readFileSync(new URL("./theme.css", import.meta.url), "utf8");
const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const iconButtonTooltip = readFileSync(
  new URL("./components/IconButtonTooltip.tsx", import.meta.url),
  "utf8",
);
const favicon = readFileSync(new URL("../../public/favicon.svg", import.meta.url), "utf8");
const authModal = readFileSync(new URL("./components/AuthModal.tsx", import.meta.url), "utf8");

describe("underline visibility", () => {
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
});

describe("lyric caret visibility", () => {
  it("uses a dark-gray color instead of the browser's automatic caret color", () => {
    expect(styles).toMatch(/\.song\s*\{[\s\S]*caret-color: #555/);
  });
});

describe("icon-button tooltips", () => {
  it("renders a visible tooltip from a hoverable wrapper", () => {
    expect(iconButtonTooltip).toContain("function IconButtonTooltip");
    expect(iconButtonTooltip).toContain("icon-button-tooltip");
    expect(iconButtonTooltip).toContain("data-tooltip={tooltip}");
    expect(app).not.toMatch(/<button[^>]*\btitle=/);
    expect(themeStyles).toMatch(/\.icon-button-tooltip\s*\{[\s\S]*display: inline-flex/);
    expect(themeStyles).toMatch(
      /\.icon-button-tooltip > button:disabled\s*\{[\s\S]*pointer-events: none/,
    );
    expect(themeStyles).toMatch(
      /\.icon-button-tooltip:hover::after,\s*\.icon-button-tooltip:focus-within::after\s*\{[\s\S]*opacity: 1/,
    );
    expect(themeStyles).toContain("content: attr(data-tooltip)");
  });

  it("anchors the close tooltip wrapper to the fixed close control", () => {
    expect(app).toContain('<IconButtonTooltip className="app-close-tooltip"');
    expect(styles).toMatch(
      /\.app-close-tooltip\s*\{[\s\S]*position: fixed[\s\S]*top: 1rem[\s\S]*right: 1rem/,
    );
    expect(styles).toMatch(
      /\.app-close-tooltip\s*\{[\s\S]*width: 2\.75rem[\s\S]*height: 2\.75rem/,
    );
    expect(styles).toMatch(/\.app-close\s*\{[\s\S]*position: static/);
  });
});

describe("fork source link", () => {
  it("places a fork icon before the title and explains that it navigates to the source song", () => {
    expect(app).toContain('className="fork-source-link"');
    expect(app).toContain('href={`/cancion/${forkSourceSlug}`}');
    expect(app).toContain("Ver la canción de la que se derivó esta versión");
    expect(app).toMatch(/className="title-row"[\s\S]*className="fork-source-link"[\s\S]*className="title-input"/);
    expect(styles).toMatch(/\.fork-source-tooltip::after\s*\{[\s\S]*left: calc\(100% \+ 0\.6rem\)/);
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
  it("uses the supplied whistling-face mark on an accent-colored background", () => {
    // A stroke-only icon with no background is invisible against a browser tab's own
    // background, so the mark sits on a filled square colored with the brand accent.
    expect(favicon).toContain('viewBox="0 0 64 64"');
    expect(favicon).toContain('fill="#9c4a3c"');
    expect(favicon).toContain('stroke="#fbfaf7"');
    expect(favicon).toContain('stroke-width="2.15"');
    expect(favicon).toContain('M38.8 35.3C40.1 34.7');
    expect(favicon).toContain('stroke-width="1.75"');
  });
});

describe("authentication dialog", () => {
  it("confirms magic links without assuming the action that opened it", () => {
    expect(authModal).toContain("Abrí el enlace para iniciar sesión y continuar.");
    expect(authModal).toContain("<MailIcon aria-hidden=\"true\" />");
    expect(authModal).not.toContain("terminar de guardar la canción");
  });
});

describe("autosave", () => {
  it("keeps its creation callback stable across status renders", () => {
    // `useAutosave` schedules a save whenever one of its effect dependencies changes. An inline
    // callback here changes identity after every "saving"/"saved" status update, which turns the
    // debounce into a perpetual one-second save loop even while the editor content is unchanged.
    expect(app).toMatch(/const handleSongCreated = useCallback\(/);
    expect(app).toMatch(/useAutosave\([\s\S]*?handleSongCreated,/);
  });
});
