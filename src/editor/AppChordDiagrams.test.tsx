import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createInitialState } from "../core/state";
import type { SongDetail } from "../data/types";
import { profileQueryKeys, songQueryKeys } from "../data/queryKeys";
import { mockMatchMedia } from "../test/matchMedia";
import App from "./App";
import { SongChordDiagrams } from "./components/SongChordDiagrams";
import { transposeForReader } from "../transpose/transposeSong";
import { buildSong, getLineCellSlots } from "../core/model";

const mocks = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock("../data", () => ({ isCurrentUserAdmin: mocks.admin }));
vi.mock("../app/actions", () => ({ revalidatePublicSongs: vi.fn() }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./authRequiredContext", () => ({
  useAuthRequired: () => ({ session: { user: { id: "owner" } }, requireAuthentication: vi.fn() }),
}));
vi.mock("./toastContext", () => ({
  useToast: () => ({ showToast: vi.fn(), showTutorial: vi.fn() }),
}));
vi.mock("./useAutosave", () => ({
  useAutosave: () => ({ status: "saved", retry: vi.fn() }),
}));
vi.mock("./usePendingSongResume", () => ({ usePendingSongResume: () => vi.fn() }));


const initial = createInitialState();
initial.lyricsText = "C  G\nUna canción";
initial.song = buildSong(initial.lyricsText);
const slots = getLineCellSlots(initial.song[1]!, initial.merges);
initial.cells.chords = { [slots[0]!]: "C", [slots[1]!]: "Am", [slots[2]!]: "???" };
const song: SongDetail = {
  id: "song", slug: "song", title: "Canción", author: "Autor", ownerId: "owner",
  isPublic: false, isListed: false, youtubeUrl: null, category: null,
  forkedFrom: null, createdAt: "", updatedAt: "", performers: [],
  content: { ...initial, title: "Canción", author: "Autor" },
};

async function renderSong(readOnly: boolean, admin: boolean, mobile = false, seeded = true, detail = song) {
  mockMatchMedia(mobile);
  mocks.admin.mockResolvedValue(admin);
  const client = new QueryClient();
  client.setQueryData(songQueryKeys.bySlug(detail.slug), detail);
  render(
    <QueryClientProvider client={client}>
      <App songSlug={detail.slug} initialSong={seeded ? detail : null} readOnly={readOnly} />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client.getQueryData(profileQueryKeys.role("owner"))).toBe(admin));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("song guitar diagrams", () => {
  it("updates diagrams when the displayed song is transposed", () => {
    const view = render(<SongChordDiagrams song={initial.song} cells={initial.cells} merges={initial.merges} />);
    expect(screen.getByRole("img", { name: "Diagrama del acorde C" })).toBeInTheDocument();
    const transposed = transposeForReader(initial.song, initial.cells, 2);
    view.rerender(<SongChordDiagrams {...transposed} merges={initial.merges} />);
    expect(screen.queryByRole("img", { name: "Diagrama del acorde C" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Diagrama del acorde D" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Diagrama del acorde Bm" })).toBeInTheDocument();
  });

  it.each([false, true])("puts the toggle first and enables chords when switched on (mobile: %s)", async (mobile) => {
    await renderSong(true, false, mobile);
    if (mobile) fireEvent.click(screen.getByRole("button", { name: "Abrir herramientas" }));
    const toolbar = mobile
      ? document.querySelector(".mobile-sidebar-menu__controls")!
      : screen.getByRole("complementary", { name: "Visibilidad de pistas" });
    const buttons = within(toolbar as HTMLElement).getAllByRole("button");
    expect(buttons[0]).toHaveAccessibleName("Diagramas de guitarra");
    const chords = within(toolbar as HTMLElement).getByRole("button", { name: "Acordes" });
    fireEvent.click(chords);
    expect(chords).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("region", { name: "Diagramas de los acordes" })).not.toBeInTheDocument();
    fireEvent.click(buttons[0]);
    expect(chords).toHaveAttribute("aria-pressed", "true");
    const diagrams = screen.getByRole("region", { name: "Diagramas de los acordes" });
    expect(within(diagrams).getAllByRole("img")).toHaveLength(3);
    expect(within(diagrams).getByRole("img", { name: "Diagrama del acorde C" })).toBeInTheDocument();
    expect(diagrams.nextElementSibling).toHaveClass("song");
    fireEvent.click(buttons[0]);
    expect(screen.queryByRole("region", { name: "Diagramas de los acordes" })).not.toBeInTheDocument();
    expect(chords).toHaveAttribute("aria-pressed", "true");
  });

  it("remembers the preference for this song and keeps other songs off", async () => {
    await renderSong(true, false);
    fireEvent.click(screen.getByRole("button", { name: "Diagramas de guitarra" }));
    cleanup();
    await renderSong(true, false);
    expect(screen.getByRole("button", { name: "Diagramas de guitarra" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Diagramas de los acordes" })).toBeInTheDocument();
    cleanup();
    await renderSong(true, false, false, true, { ...song, id: "other-song", slug: "other-song" });
    expect(screen.getByRole("button", { name: "Diagramas de guitarra" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("region", { name: "Diagramas de los acordes" })).not.toBeInTheDocument();
  });
});
