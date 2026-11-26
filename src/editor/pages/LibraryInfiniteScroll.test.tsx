import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../../test/matchMedia";
import { AuthRequiredContext } from "../authRequiredContext";
import { ToastContext } from "../toastContext";
import { Library } from "./Library";
import type { LibrarySong } from "./librarySongs";

vi.mock("../../data/songs", () => ({
  deleteSong: vi.fn(),
  listFavorites: vi.fn(async () => []),
  listMySongs: vi.fn(async () => []),
  listPublicSongs: vi.fn(() => new Promise(() => {})),
  toggleFavorite: vi.fn(),
}));
vi.mock("../../data/auth", () => ({ signOut: vi.fn() }));

const SONGS: LibrarySong[] = Array.from({ length: 45 }, (_, index) => ({
  id: String(index),
  slug: `cancion-${index}`,
  title: `Canción ${String(index).padStart(2, "0")}`,
  author: index % 2 ? "Par" : "Impar",
  performers: [],
  isPublic: true,
}));

/** Stands in for the browser: tests decide when the sentinel comes near the viewport. */
let observers: { callback: IntersectionObserverCallback; disconnected: boolean }[] = [];
class FakeIntersectionObserver {
  record = { callback: undefined as unknown as IntersectionObserverCallback, disconnected: false };
  constructor(callback: IntersectionObserverCallback) {
    this.record.callback = callback;
    observers.push(this.record);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.record.disconnected = true;
  }
}

function scrollNearEnd() {
  const live = observers.filter((observer) => !observer.disconnected).at(-1);
  act(() =>
    live?.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver),
  );
}

function renderLibrary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthRequiredContext.Provider value={{ session: null, requireAuthentication: vi.fn() }}>
        <ToastContext.Provider value={{ showToast: vi.fn(), showTutorial: vi.fn() }}>
          <Library appVersion="0.0.0" initialPublicSongs={SONGS} />
        </ToastContext.Provider>
      </AuthRequiredContext.Provider>
    </QueryClientProvider>,
  );
}

const rows = () => screen.getAllByRole("listitem").length;

describe("Library infinite scroll", () => {
  afterEach(() => {
    observers = [];
    vi.unstubAllGlobals();
  });

  it("shows 20 songs and reveals 20 more each time the end nears", () => {
    mockMatchMedia(false);
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    renderLibrary();
    expect(rows()).toBe(20);
    scrollNearEnd();
    expect(rows()).toBe(40);
    scrollNearEnd();
    expect(rows()).toBe(45);
    expect(observers.filter((observer) => !observer.disconnected)).toHaveLength(0);
  });

  it("starts over from the first page when the search changes", async () => {
    mockMatchMedia(false);
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    renderLibrary();
    scrollNearEnd();
    expect(rows()).toBe(40);
    await userEvent.type(screen.getByLabelText("Buscar canciones o autores"), "Impar");
    expect(rows()).toBe(20);
  });
});
