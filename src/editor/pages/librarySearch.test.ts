import { describe, expect, it } from "vitest";
import type { LibrarySong } from "./librarySongs";
import { getHighlightParts, searchSongs } from "./librarySearch";

function song(id: string, title: string, author: string | null = null): LibrarySong {
  return { id, slug: id, title, author, isPublic: true };
}

function titles(songs: LibrarySong[]): string[] {
  return songs.map((each) => each.title);
}

describe("searchSongs", () => {
  it("finds accented titles and authors when the query has no accents", () => {
    const songs = [
      song("1", "Canción con todos", "Armando Tejada Gómez"),
      song("2", "Zamba de mi esperanza", "Luis Profili"),
    ];

    expect(titles(searchSongs(songs, "cancion"))).toEqual(["Canción con todos"]);
    expect(titles(searchSongs(songs, "gomez"))).toEqual(["Canción con todos"]);
  });

  it("finds unaccented text when the query has accents", () => {
    const songs = [song("1", "Cancion de las simples cosas"), song("2", "Alfonsina y el mar")];

    expect(titles(searchSongs(songs, "Canción"))).toEqual(["Cancion de las simples cosas"]);
  });

  it("lists title matches before songs that only match by author", () => {
    const songs = [
      song("1", "Gracias a la vida", "Violeta Parra"),
      song("2", "Zamba para Violeta", "Atahualpa Yupanqui"),
      song("3", "Volver a los 17", "Violeta Parra"),
      song("4", "Violeta", "Anónimo"),
    ];

    expect(titles(searchSongs(songs, "violeta"))).toEqual([
      "Zamba para Violeta",
      "Violeta",
      "Gracias a la vida",
      "Volver a los 17",
    ]);
  });

  it("matches words spread across title and author, ranked by the title", () => {
    const songs = [
      song("1", "Luna tucumana", "Atahualpa Yupanqui"),
      song("2", "Alfonsina y el mar", "Ariel Ramírez"),
      song("3", "El arriero", "Atahualpa Yupanqui"),
    ];

    expect(titles(searchSongs(songs, "yupanqui arriero"))).toEqual(["El arriero"]);
    expect(titles(searchSongs(songs, "atahualpa luna"))).toEqual(["Luna tucumana"]);
  });

  it("returns every song in its original order when the query is blank", () => {
    const songs = [song("1", "B"), song("2", "A")];

    expect(titles(searchSongs(songs, "   "))).toEqual(["B", "A"]);
  });
});

describe("getHighlightParts", () => {
  it("marks every search word while preserving the original text", () => {
    expect(getHighlightParts("Mercedes Sosa", "mercedes so")).toEqual([
      { text: "Mercedes", matches: true },
      { text: " ", matches: false },
      { text: "So", matches: true },
      { text: "sa", matches: false },
    ]);
  });

  it("treats special characters in a query as text", () => {
    expect(getHighlightParts("Canción (en vivo)", "(en")).toEqual([
      { text: "Canción ", matches: false },
      { text: "(en", matches: true },
      { text: " vivo)", matches: false },
    ]);
  });

  it("marks the original accented text for a query without accents", () => {
    expect(getHighlightParts("Canción de Gómez", "cancion gomez")).toEqual([
      { text: "Canción", matches: true },
      { text: " de ", matches: false },
      { text: "Gómez", matches: true },
    ]);
  });

  it("marks unaccented text for a query with accents", () => {
    expect(getHighlightParts("La cancion del pequeño", "canción PEQUENO")).toEqual([
      { text: "La ", matches: false },
      { text: "cancion", matches: true },
      { text: " del ", matches: false },
      { text: "pequeño", matches: true },
    ]);
  });

  it("keeps a match that starts or ends on an accented letter whole", () => {
    expect(getHighlightParts("Atahualpa Yupanqui: Camión", "on")).toEqual([
      { text: "Atahualpa Yupanqui: Cami", matches: false },
      { text: "ón", matches: true },
    ]);
  });

  it("leaves the text unmarked for a blank query", () => {
    expect(getHighlightParts("Canción", "  ")).toEqual([{ text: "Canción", matches: false }]);
  });
});
