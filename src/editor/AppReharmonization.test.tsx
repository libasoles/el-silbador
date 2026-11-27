import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeSlotId, buildSong, flattenSyllables, getLineCellSlots } from "../core/model";
import { createInitialState } from "../core/state";
import type { SongDetail } from "../data/types";
import { profileQueryKeys, songQueryKeys } from "../data/queryKeys";
import { mockMatchMedia } from "../test/matchMedia";
import App from "./App";

const mocks = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock("../data", () => ({
  isCurrentUserAdmin: mocks.admin,
  listArtistNames: vi.fn().mockResolvedValue([]),
  setSongKey: vi.fn().mockResolvedValue({ songKey: null }),
}));
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
initial.lyricsText = "Una canción";
initial.song = buildSong(initial.lyricsText);
const slots = getLineCellSlots(initial.song[0]!, initial.merges);
const firstSyllable = flattenSyllables(initial.song[0]!)[0]!;
initial.cells.chords = { [slots[0]!]: "Am" };
initial.cells.vocalNotes = { [beforeSlotId(firstSyllable.id)]: "do" };
const song: SongDetail = {
  id: "song", slug: "song", title: "Canción", author: "Autor", ownerId: "owner",
  isPublic: false, isListed: false, youtubeUrl: null, category: null,
  forkedFrom: null, createdAt: "", updatedAt: "", performers: [],
  content: { ...initial, title: "Canción", author: "Autor" },
};

async function renderSong(admin: boolean) {
  mockMatchMedia(false);
  mocks.admin.mockResolvedValue(admin);
  const client = new QueryClient();
  client.setQueryData(songQueryKeys.bySlug(song.slug), song);
  render(
    <QueryClientProvider client={client}>
      <App songSlug={song.slug} initialSong={song} readOnly={false} />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client.getQueryData(profileQueryKeys.role("owner"))).toBe(admin));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("reharmonization and the chords tool", () => {
  it("are exclusive: turning one on turns the other off, and written chords stay shown", async () => {
    await renderSong(true);
    const chords = screen.getByRole("button", { name: "Acordes" });
    const reharmonization = await screen.findByRole("button", { name: "Rearmonización" });
    expect(chords).toHaveAttribute("aria-pressed", "true");
    expect(reharmonization).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(reharmonization);
    expect(reharmonization).toHaveAttribute("aria-pressed", "true");
    expect(chords).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Am")).toBeInTheDocument();
    // The chords tool is off: its cells are not editable, but syllables with a note are clickable.
    expect(document.querySelectorAll("[data-reharmonizable]")).toHaveLength(1);

    fireEvent.click(chords);
    expect(chords).toHaveAttribute("aria-pressed", "true");
    expect(reharmonization).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Am")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-reharmonizable]")).toHaveLength(0);
  });

  it("turns the chords tool back on when reharmonization is switched off", async () => {
    await renderSong(true);
    const reharmonization = await screen.findByRole("button", { name: "Rearmonización" });
    fireEvent.click(reharmonization);
    fireEvent.click(reharmonization);
    expect(screen.getByRole("button", { name: "Acordes" })).toHaveAttribute("aria-pressed", "true");
  });

  it("is not offered to non-admins", async () => {
    await renderSong(false);
    expect(screen.queryByRole("button", { name: "Rearmonización" })).toBeNull();
  });
});
