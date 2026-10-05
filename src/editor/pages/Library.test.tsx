import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
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

const PUBLIC_SONGS: LibrarySong[] = [
  { id: "1", slug: "gracias-a-la-vida", title: "Gracias a la vida", author: "Violeta Parra", isPublic: true },
  { id: "2", slug: "cancion-con-todos", title: "Canción con todos", author: "Armando Tejada Gómez", isPublic: true },
  { id: "3", slug: "zamba-para-violeta", title: "Zamba para Violeta", author: "Atahualpa Yupanqui", isPublic: true },
  { id: "4", slug: "volver-a-los-17", title: "Volver a los 17", author: "Violeta Parra", isPublic: true },
];

function renderLibrary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthRequiredContext.Provider value={{ session: null, requireAuthentication: vi.fn() }}>
        <ToastContext.Provider value={{ showToast: vi.fn(), showTutorial: vi.fn() }}>
          <Library appVersion="0.0.0" initialPublicSongs={PUBLIC_SONGS} />
        </ToastContext.Provider>
      </AuthRequiredContext.Provider>
    </QueryClientProvider>,
  );
}

async function search(text: string) {
  await userEvent.type(screen.getByLabelText("Buscar canciones o autores"), text);
}

function rowTitles(): string[] {
  return screen
    .getAllByRole("listitem")
    .map((row) => row.querySelector(".library-row__title-text")?.textContent ?? "");
}

function highlights(): string[] {
  return Array.from(document.querySelectorAll("mark"), (mark) => mark.textContent ?? "");
}

describe("Library search", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("finds an accented title with a query without accents and marks the original text", async () => {
    mockMatchMedia(false);
    renderLibrary();

    await search("cancion");

    expect(rowTitles()).toEqual(["Canción con todos"]);
    expect(highlights()).toEqual(["Canción"]);
  });

  it("finds an unaccented title with a query with accents", async () => {
    mockMatchMedia(false);
    renderLibrary();

    await search("Grácias");

    expect(rowTitles()).toEqual(["Gracias a la vida"]);
    expect(highlights()).toEqual(["Gracias"]);
  });

  it("finds an accented author and marks it in the row", async () => {
    mockMatchMedia(false);
    renderLibrary();

    await search("gomez");

    const [row] = screen.getAllByRole("listitem");
    expect(within(row).getByText("Gómez").tagName).toBe("MARK");
  });

  it("lists title matches before songs that only match by author", async () => {
    mockMatchMedia(false);
    renderLibrary();

    await search("violeta");

    expect(rowTitles()).toEqual(["Zamba para Violeta", "Gracias a la vida", "Volver a los 17"]);
    expect(highlights()).toEqual(["Violeta", "Violeta", "Violeta"]);
  });
});
