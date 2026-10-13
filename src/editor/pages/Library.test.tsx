import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listFavorites, listMySongs } from "../../data/songs";
import type { SongSummary } from "../../data/types";
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

function renderLibrary(
  onNewSong?: () => void,
  searchProps: Pick<ComponentProps<typeof Library>, "initialQuery" | "onQueryChange"> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthRequiredContext.Provider value={{ session: null, requireAuthentication: vi.fn() }}>
        <ToastContext.Provider value={{ showToast: vi.fn(), showTutorial: vi.fn() }}>
          <Library appVersion="0.0.0" initialPublicSongs={PUBLIC_SONGS} onNewSong={onNewSong} {...searchProps} />
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

  it.each([false, true])("links every public song to its read-only page (mobile: %s)", (isMobile) => {
    mockMatchMedia(isMobile);
    renderLibrary();

    for (const song of PUBLIC_SONGS) {
      expect(screen.getByRole("link", { name: `${song.title}${song.author}` })).toHaveAttribute("href", `/cancion/${song.slug}`);
    }
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

  it("starts filtered by the query it is opened with, e.g. a performer from a song's page", () => {
    mockMatchMedia(false);
    renderLibrary(undefined, { initialQuery: "Tamara Castro" });

    expect(screen.getByLabelText("Buscar canciones o autores")).toHaveValue("Tamara Castro");
    expect(rowTitles()).toEqual(["Zamba de amor en vuelo"]);
  });

  it("reports every change to the query, including clearing it", async () => {
    mockMatchMedia(false);
    const onQueryChange = vi.fn();
    renderLibrary(undefined, { initialQuery: "so", onQueryChange });

    await search("l");
    expect(onQueryChange).toHaveBeenLastCalledWith("sol");
    await userEvent.clear(screen.getByLabelText("Buscar canciones o autores"));
    expect(onQueryChange).toHaveBeenLastCalledWith("");
  });

  it("offers a clear button only while there is a query, and it empties the search", async () => {
    mockMatchMedia(false);
    const onQueryChange = vi.fn();
    renderLibrary(undefined, { onQueryChange });
    const input = screen.getByLabelText("Buscar canciones o autores");

    expect(screen.queryByRole("button", { name: "Borrar búsqueda" })).not.toBeInTheDocument();

    await search("tamara");
    await userEvent.click(screen.getByRole("button", { name: "Borrar búsqueda" }));

    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(onQueryChange).toHaveBeenLastCalledWith("");
    expect(rowTitles()).toHaveLength(PUBLIC_SONGS.length);
    expect(screen.queryByRole("button", { name: "Borrar búsqueda" })).not.toBeInTheDocument();
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
    const dialog = screen.getByRole("dialog", { name: "Probalo en una computadora" });
    expect(within(dialog).getByText(/no está disponible para el celular/)).toBeInTheDocument();
    expect(
      within(dialog)
        .getAllByRole("heading", { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "Mover un acorde a otra sílaba",
      "Ascensos y descensos melódicos",
      "Una nota para varias sílabas",
      "BIS presionando Tab",
    ]);

    expect(within(dialog).getByRole("link", { name: "acá" })).toHaveAttribute("href", "/articulos");

    await userEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

const MY_SONG: SongSummary = {
  id: "mine-1",
  slug: "mi-cancion",
  title: "Mi canción",
  author: "Yo",
  ownerId: "me",
  isPublic: false,
  isListed: false,
  youtubeUrl: null,
  category: null,
  performers: [],
};

function renderSignedInLibrary(
  handlers: {
    onEditSong?: (song: LibrarySong) => void;
  },
  favorites: SongSummary[] = [
    { ...MY_SONG, id: "fav-1", slug: "favorita", title: "Favorita", ownerId: "other" },
  ],
) {
  vi.mocked(listMySongs).mockResolvedValue([MY_SONG]);
  vi.mocked(listFavorites).mockResolvedValue(favorites);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const session = { user: { id: "me" } } as unknown as Session;
  render(
    <QueryClientProvider client={queryClient}>
      <AuthRequiredContext.Provider value={{ session, requireAuthentication: vi.fn() }}>
        <ToastContext.Provider value={{ showToast: vi.fn(), showTutorial: vi.fn() }}>
          <Library appVersion="0.0.0" initialPublicSongs={PUBLIC_SONGS} {...handlers} />
        </ToastContext.Provider>
      </AuthRequiredContext.Provider>
    </QueryClientProvider>,
  );
}

describe("Library own songs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(listMySongs).mockResolvedValue([]);
    vi.mocked(listFavorites).mockResolvedValue([]);
  });

  it("opens an own song read-only from its title and in the editor only from the pencil", async () => {
    mockMatchMedia(false);
    const onEditSong = vi.fn();
    renderSignedInLibrary({ onEditSong });

    const row = (await screen.findByText("Mi canción")).closest("li")!;
    expect(within(row).getByRole("link", { name: /Mi canción/ })).toHaveAttribute("href", "/cancion/mi-cancion");
    expect(onEditSong).not.toHaveBeenCalled();

    await userEvent.click(within(row).getByRole("button", { name: "Editar canción" }));
    expect(onEditSong).toHaveBeenCalledWith(expect.objectContaining({ slug: "mi-cancion" }));
  });

  it("shows the pencil only next to own songs, not favorites or public ones", async () => {
    mockMatchMedia(false);
    renderSignedInLibrary({});

    const favorite = await screen.findByRole("link", { name: /Favorita/ });
    expect(favorite).toHaveAttribute("href", "/cancion/favorita");
    const pencils = screen.getAllByRole("button", { name: "Editar canción" });
    expect(pencils).toHaveLength(1);
    expect(pencils[0].closest("li")).toHaveTextContent("Mi canción");
  });

  it("lists favorites above own songs without a redundant heading", async () => {
    mockMatchMedia(false);
    renderSignedInLibrary({});

    await screen.findByText("Favorita");
    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(titles.slice(0, 3)).toEqual(["Tuyas", "Públicas", "Estudio"]);
  });

  it("keeps the own songs first while there are no favorites", async () => {
    mockMatchMedia(false);
    renderSignedInLibrary({}, []);

    await screen.findByText("Mi canción");
    await screen.findByText(/Todavía no marcaste ninguna canción/);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(titles.slice(0, 3)).toEqual(["Tuyas", "Favoritas", "Públicas"]);
  });

  it("hides the pencil on mobile, where editing is not allowed", async () => {
    mockMatchMedia(true);
    renderSignedInLibrary({});

    expect(await screen.findByRole("link", { name: /Mi canción/ })).toHaveAttribute("href", "/cancion/mi-cancion");
    expect(screen.queryByRole("button", { name: "Editar canción" })).not.toBeInTheDocument();
  });
});
