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
  { id: "1", slug: "gracias-a-la-vida", title: "Gracias a la vida", author: "Violeta Parra", performers: ["Mercedes Sosa"], isPublic: true },
  { id: "2", slug: "cancion-con-todos", title: "Canción con todos", author: "Armando Tejada Gómez", performers: [], isPublic: true },
  { id: "3", slug: "zamba-para-violeta", title: "Zamba para Violeta", author: "Atahualpa Yupanqui", performers: ["Violeta Parra"], isPublic: true },
  { id: "4", slug: "volver-a-los-17", title: "Volver a los 17", author: "Violeta Parra", performers: [], isPublic: true },
  { id: "5", slug: "zamba-de-amor-en-vuelo", title: "Zamba de amor en vuelo", author: "Jorge Milikota", performers: ["Tamara Castro", "Soledad"], isPublic: true },
  { id: "6", slug: "zamba-para-soledad", title: "Zamba para Soledad", author: "Anónimo", performers: ["Soledad"], isPublic: true },
  { id: "7", slug: "mi-tierra", title: "Mi tierra", author: "Soledad Pastorutti", performers: ["Soledad"], isPublic: true },
];

function renderLibrary(onNewSong?: () => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthRequiredContext.Provider value={{ session: null, requireAuthentication: vi.fn() }}>
        <ToastContext.Provider value={{ showToast: vi.fn(), showTutorial: vi.fn() }}>
          <Library appVersion="0.0.0" initialPublicSongs={PUBLIC_SONGS} onNewSong={onNewSong} />
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

function performerLines(): string[] {
  return screen
    .getAllByRole("listitem")
    .flatMap((row) => row.textContent?.match(/Interpretada por:.*/) ?? []);
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

  it("finds a song by its performer and lists only the matching performers, highlighted", async () => {
    mockMatchMedia(false);
    renderLibrary();

    await search("tamara");

    expect(rowTitles()).toEqual(["Zamba de amor en vuelo"]);
    const [row] = screen.getAllByRole("listitem");
    expect(row).toHaveTextContent("Interpretada por: Tamara Castro");
    expect(row).not.toHaveTextContent("Soledad");
    expect(highlights()).toEqual(["Tamara"]);
  });

  it("finds a performer with accents in the query", async () => {
    mockMatchMedia(false);
    renderLibrary();

    await search("mercédes");

    expect(rowTitles()).toEqual(["Gracias a la vida"]);
    expect(screen.getByRole("listitem")).toHaveTextContent("Interpretada por: Mercedes Sosa");
    expect(highlights()).toEqual(["Mercedes"]);
  });

  it("lists title, then author, then performer matches, naming performers only on the last", async () => {
    mockMatchMedia(false);
    renderLibrary();

    await search("soledad");

    expect(rowTitles()).toEqual(["Zamba para Soledad", "Mi tierra", "Zamba de amor en vuelo"]);
    expect(performerLines()).toEqual(["Interpretada por: Soledad"]);
    expect(highlights()).toEqual(["Soledad", "Soledad", "Soledad"]);
  });

  it("does not name performers for songs found by title or author", async () => {
    mockMatchMedia(false);
    renderLibrary();

    await search("violeta");

    expect(screen.queryByText(/Interpretada por/)).not.toBeInTheDocument();
  });
});

describe("Library new song button", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a song on desktop", async () => {
    mockMatchMedia(false);
    const onNewSong = vi.fn();
    renderLibrary(onNewSong);

    await userEvent.click(screen.getByRole("button", { name: "Nueva canción" }));

    expect(onNewSong).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("on mobile, explains the editor is desktop-only instead of creating a song", async () => {
    mockMatchMedia(true);
    const onNewSong = vi.fn();
    renderLibrary(onNewSong);

    await userEvent.click(screen.getByRole("button", { name: "Nueva canción" }));

    expect(onNewSong).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "Solo en computadoras" });
    expect(within(dialog).getByText(/solo está disponible en computadoras/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Entendido" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
