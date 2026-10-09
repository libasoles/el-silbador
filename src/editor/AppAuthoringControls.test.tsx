import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createInitialState } from "../core/state";
import type { SongDetail } from "../data/types";
import { profileQueryKeys, songQueryKeys } from "../data/queryKeys";
import { mockMatchMedia } from "../test/matchMedia";
import App from "./App";

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
vi.mock("./components/SongView", () => ({ SongView: () => null }));

const song: SongDetail = {
  id: "song", slug: "song", title: "Canción", author: "Autor", ownerId: "owner",
  isPublic: false, isListed: false, youtubeUrl: null, category: null,
  forkedFrom: null, createdAt: "", updatedAt: "", performers: [],
  content: createInitialState(),
};

async function renderSong(readOnly: boolean, admin: boolean, mobile = false) {
  mockMatchMedia(mobile);
  mocks.admin.mockResolvedValue(admin);
  const client = new QueryClient();
  client.setQueryData(songQueryKeys.bySlug(song.slug), song);
  render(
    <QueryClientProvider client={client}>
      <App songSlug={song.slug} initialSong={song} readOnly={readOnly} />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client.getQueryData(profileQueryKeys.role("owner"))).toBe(admin));
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("authoring toolbar controls", () => {
  it.each([false, true])("hides privacy and YouTube in reading mode (admin: %s)", async (admin) => {
    await renderSong(true, admin);
    expect(screen.queryByRole("button", { name: "Hacer pública" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar link de YouTube" })).not.toBeInTheDocument();
  });

  it.each([false, true])("shows privacy and YouTube in editing mode (admin: %s)", async (admin) => {
    await renderSong(false, admin);
    expect(screen.getByRole("button", { name: "Hacer pública" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar link de YouTube" })).toBeInTheDocument();
  });

  it("hides both controls on mobile even in editing mode", async () => {
    await renderSong(false, true, true);
    expect(screen.queryByRole("button", { name: "Hacer pública" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar link de YouTube" })).not.toBeInTheDocument();
  });
});
