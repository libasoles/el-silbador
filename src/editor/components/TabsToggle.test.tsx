import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState, editorReducer } from "../../core/state";
import type { EditorState } from "../../core/types";
import { mockMatchMedia } from "../../test/matchMedia";
import { useTabsToggle } from "../useTabsToggle";
import { SongView } from "./SongView";
import { TabsToggleButton } from "./TabsToggleButton";

function songState(text: string): EditorState {
  return editorReducer(createInitialState(), { type: "setLyricsText", text });
}

const noop = () => {};

/** The toolbar's toggle above the song it controls, as the song page lays them out. */
function SongPage({ state, editing }: { state: EditorState; editing: boolean }) {
  const tabsToggle = useTabsToggle(state.song, editing);
  return (
    <>
      {tabsToggle.available && <TabsToggleButton pressed={tabsToggle.pressed} onToggle={tabsToggle.toggle} />}
      <SongView
        song={state.song}
        lyricsText={state.lyricsText}
        bisGroups={state.bisGroups}
        merges={state.merges}
        tracks={state.tracks}
        cells={state.cells}
        chordVariants={state.chordVariants}
        pitchDirections={state.pitchDirections}
        showUnderline={state.showUnderline}
        showHelp={false}
        placeholder={null}
        canEdit={editing}
        onSetCellText={noop}
        onSetChordVariant={noop}
        onToggleMerge={noop}
        onMoveCellText={noop}
        onDragPitchDirection={noop}
        onReconcileLyricsText={noop}
        onToggleBis={noop}
        onPasteText={noop}
        tabs={state.tabs}
        showTabs={tabsToggle.showTabBlocks}
      />
    </>
  );
}

function toggle() {
  return screen.queryByRole("button", { name: "Tablaturas" });
}

describe.each([
  ["desktop", false],
  ["mobile", true],
])("Tabs toggle on %s", (_, mobile) => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("is absent while editing, where the blocks always show", async () => {
    mockMatchMedia(mobile);
    render(<SongPage state={songState("una\nTAB")} editing />);

    expect(toggle()).toBeNull();
    await waitFor(() => expect(document.querySelector("ascii-tabs")).not.toBeNull());
  });

  it("is absent from a song without tab blocks", () => {
    mockMatchMedia(mobile);
    render(<SongPage state={songState("una noche")} editing={false} />);

    expect(toggle()).toBeNull();
  });

  it("starts off, without drawing the blocks", () => {
    mockMatchMedia(mobile);
    render(<SongPage state={songState("una\nTAB")} editing={false} />);

    expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelector("[data-tab-block]")).toBeNull();
  });

  it("shows the blocks read-only once on, and remembers it for the next song", async () => {
    mockMatchMedia(mobile);
    const { unmount } = render(<SongPage state={songState("una\nTAB")} editing={false} />);

    fireEvent.click(toggle()!);

    expect(toggle()).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(document.querySelector("ascii-tabs")).toHaveAttribute("readonly"));
    expect(window.localStorage.getItem("el-silbador:tabs-toggle-visible")).toBe("true");

    unmount();
    render(<SongPage state={songState("otra\nTAB")} editing={false} />);
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
  });
});
