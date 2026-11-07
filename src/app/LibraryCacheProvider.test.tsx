import { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { dehydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LibraryCacheProvider } from "./LibraryCacheProvider";
import { AuthRequiredContext } from "../editor/authRequiredContext";
import { ToastContext } from "../editor/toastContext";
import { Library } from "../editor/pages/Library";
import { mockMatchMedia } from "../test/matchMedia";
import { listFavorites, listMySongs } from "../data/songs";
import { songQueryKeys } from "../data/queryKeys";
import { LIBRARY_CACHE_KEY, LIBRARY_CACHE_MAX_AGE, libraryCacheBuster } from "../data/libraryQueryPersistence";

vi.mock("../data/songs", () => ({
  listMySongs: vi.fn(), listFavorites: vi.fn(),
  listPublicSongs: vi.fn(() => new Promise(() => {})),
  deleteSong: vi.fn(), toggleFavorite: vi.fn(),
}));
vi.mock("../data/auth", () => ({ signOut: vi.fn() }));

const mine = { id: "mine", slug: "propia", title: "Propia guardada", author: "Yo", performers: [], isPublic: false };
const favorite = { ...mine, id: "favorite", slug: "favorita", title: "Favorita guardada", isPublic: true };
const publicSong = { ...mine, id: "public", slug: "publica", title: "Pública", isPublic: true };
const sessionFor = (id: string) => ({ user: { id } }) as Session;

function client() {
  return new QueryClient({ defaultOptions: { queries: {
    retry: false, gcTime: LIBRARY_CACHE_MAX_AGE, staleTime: 0,
  } } });
}

function seed(userId = "me", timestamp = Date.now(), buster = libraryCacheBuster(userId)) {
  const source = client();
  source.setQueryData(songQueryKeys.mine(userId), [mine]);
  source.setQueryData(songQueryKeys.favorites(userId), [favorite]);
  window.localStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify({
    timestamp, buster, clientState: dehydrate(source),
  }));
  source.clear();
}

function view(queryClient: QueryClient, session: Session | null | undefined) {
  return <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LibraryCacheProvider session={session}>
        <AuthRequiredContext.Provider value={{ session, requireAuthentication: vi.fn() }}>
          <ToastContext.Provider value={{ showToast: vi.fn(), showTutorial: vi.fn() }}>
            <Library appVersion="0.0.0" initialPublicSongs={[publicSong]} />
          </ToastContext.Provider>
        </AuthRequiredContext.Provider>
      </LibraryCacheProvider>
    </QueryClientProvider>
  </StrictMode>;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mockMatchMedia(false);
  vi.mocked(listMySongs).mockImplementation(() => new Promise(() => {}));
  vi.mocked(listFavorites).mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("persistent personal library", () => {
  it("waits for auth, restores both lists and keeps them visible during background fetching", async () => {
    seed();
    const queryClient = client();
    const ui = render(view(queryClient, undefined));
    expect(screen.getByRole("status", { name: "Cargando canciones" })).toBeInTheDocument();
    expect(screen.queryByText("Pública")).not.toBeInTheDocument();
    expect(listMySongs).not.toHaveBeenCalled();

    ui.rerender(view(queryClient, sessionFor("me")));
    expect(await screen.findByText(mine.title)).toBeInTheDocument();
    expect(screen.getByText(favorite.title)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Cargando canciones" })).not.toBeInTheDocument();
    await waitFor(() => expect(queryClient.isFetching({ queryKey: songQueryKeys.mine("me") })).toBe(1));
    expect(screen.getByText(mine.title)).toBeInTheDocument();
    expect(listFavorites).toHaveBeenCalled();
    ui.unmount();
    queryClient.clear();
  });

  it("persists updated lists only and restores them into a new query client after reload", async () => {
    const queryClient = client();
    const ui = render(view(queryClient, sessionFor("me")));
    await screen.findByText("Tuyas");
    act(() => {
      queryClient.setQueryData(songQueryKeys.mine("me"), [mine]);
      queryClient.setQueryData(songQueryKeys.favorites("me"), [favorite]);
      queryClient.setQueryData(songQueryKeys.mine("other"), [mine]);
      queryClient.setQueryData(songQueryKeys.detail("mine"), { content: "private lyrics" });
    });
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(LIBRARY_CACHE_KEY)!);
      expect(saved.clientState.queries.map((q: { queryKey: unknown }) => q.queryKey)).toEqual([
        songQueryKeys.mine("me"), songQueryKeys.favorites("me"),
      ]);
    }, { timeout: 2500 });
    expect(window.localStorage.getItem(LIBRARY_CACHE_KEY)).not.toContain("private lyrics");
    ui.unmount();
    queryClient.clear();

    const reloaded = client();
    const next = render(view(reloaded, sessionFor("me")));
    expect(await screen.findByText(mine.title)).toBeInTheDocument();
    expect(screen.getByText(favorite.title)).toBeInTheDocument();
    next.unmount();
    reloaded.clear();
  });

  it("clears personal data on logout, including delayed writes and pending requests", async () => {
    seed();
    const queryClient = client();
    const ui = render(view(queryClient, sessionFor("me")));
    await screen.findByText(mine.title);
    act(() => queryClient.setQueryData(songQueryKeys.mine("me"), [mine]));
    ui.rerender(view(queryClient, null));
    await screen.findByText("Pública");
    expect(screen.queryByText(mine.title)).not.toBeInTheDocument();
    expect(queryClient.getQueryData(songQueryKeys.mine("me"))).toBeUndefined();
    // Let the persister's pending throttle run: it must not resurrect the logged-out cache.
    await act(() => new Promise((resolve) => setTimeout(resolve, 1200)));
    expect(window.localStorage.getItem(LIBRARY_CACHE_KEY)).toBeNull();
    ui.unmount();
    queryClient.clear();
  });

  it("does not restore another account's songs", async () => {
    seed("other");
    const queryClient = client();
    const ui = render(view(queryClient, sessionFor("me")));
    await screen.findByText("Tuyas");
    expect(screen.queryByText(mine.title)).not.toBeInTheDocument();
    expect(queryClient.getQueryData(songQueryKeys.mine("other"))).toBeUndefined();
    ui.unmount();
    queryClient.clear();
  });

  it("updates restored songs from the server without returning to a loading screen", async () => {
    seed();
    let finishRequest!: (songs: Awaited<ReturnType<typeof listMySongs>>) => void;
    vi.mocked(listMySongs).mockImplementation(() => new Promise((resolve) => { finishRequest = resolve; }));
    const queryClient = client();
    const ui = render(view(queryClient, sessionFor("me")));
    await screen.findByText(mine.title);
    await act(async () => finishRequest([{
      ...mine, title: "Título actualizado", ownerId: "me", isListed: false,
      youtubeUrl: null, category: null, forkedFrom: null,
      createdAt: "2026-11-07T00:00:00Z", updatedAt: "2026-11-07T00:00:00Z",
    }]));
    expect(await screen.findByText("Título actualizado")).toBeInTheDocument();
    expect(screen.getByText(favorite.title)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Cargando canciones" })).not.toBeInTheDocument();
    ui.unmount();
    queryClient.clear();
  });

  it("removes the previous account's songs on an account switch, even if its request finishes later", async () => {
    seed();
    let finishOldRequest!: (songs: Awaited<ReturnType<typeof listMySongs>>) => void;
    vi.mocked(listMySongs).mockImplementationOnce(() => new Promise((resolve) => { finishOldRequest = resolve; }));
    const queryClient = client();
    const ui = render(view(queryClient, sessionFor("me")));
    await screen.findByText(mine.title);
    ui.rerender(view(queryClient, sessionFor("other")));
    expect(screen.queryByText(mine.title)).not.toBeInTheDocument();
    await screen.findByText("Tuyas");
    await act(async () => finishOldRequest([]));
    expect(queryClient.getQueryData(songQueryKeys.mine("me"))).toBeUndefined();
    expect(queryClient.getQueryData(songQueryKeys.favorites("me"))).toBeUndefined();
    ui.unmount();
    queryClient.clear();
  });

  it.each(["expired", "old schema", "corrupt", "blocked"])("loads from the server when storage is %s", async (failure) => {
    seed("me", failure === "expired" ? Date.now() - LIBRARY_CACHE_MAX_AGE - 1 : Date.now(),
      failure === "old schema" ? "v0:me" : libraryCacheBuster("me"));
    if (failure === "corrupt") {
      window.localStorage.setItem(LIBRARY_CACHE_KEY, "invalid JSON");
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
    }
    if (failure === "blocked") {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
    }
    vi.mocked(listMySongs).mockResolvedValue([]);
    vi.mocked(listFavorites).mockResolvedValue([]);
    const queryClient = client();
    const ui = render(view(queryClient, sessionFor("me")));
    expect(await screen.findByText("Todavía no escribiste ninguna canción.")).toBeInTheDocument();
    expect(screen.queryByText(mine.title)).not.toBeInTheDocument();
    ui.unmount();
    queryClient.clear();
  });
});
