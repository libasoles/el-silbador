import { describe, expect, it } from "vitest";

import { songDescription, songJsonLd } from "./songSeo";

describe("songDescription", () => {
  it("names the author and the performer", () => {
    expect(
      songDescription({ title: "Zamba de amor en vuelo", author: "Jorge Milikota", performers: ["Tamara Castro"] }),
    ).toBe(
      "Letra y acordes para guitarra de Zamba de amor en vuelo, de Jorge Milikota. Interpretada por Tamara Castro. Consultá la canción en El Silbador.",
    );
  });

  it("joins several performers the way it reads in Spanish", () => {
    expect(
      songDescription({
        title: "Zamba de amor en vuelo",
        author: "Jorge Milikota",
        performers: ["Tamara Castro", "Los Nocheros"],
      }),
    ).toBe(
      "Letra y acordes para guitarra de Zamba de amor en vuelo, de Jorge Milikota. Interpretada por Tamara Castro y Los Nocheros. Consultá la canción en El Silbador.",
    );
    expect(
      songDescription({
        title: "Zamba de amor en vuelo",
        author: "Jorge Milikota",
        performers: ["Tamara Castro", "Los Nocheros", "Soledad"],
      }),
    ).toBe(
      "Letra y acordes para guitarra de Zamba de amor en vuelo, de Jorge Milikota. Interpretada por Tamara Castro, Los Nocheros y Soledad. Consultá la canción en El Silbador.",
    );
  });

  it("leaves out the author when there is none", () => {
    expect(songDescription({ title: "Zamba de amor en vuelo", author: " ", performers: ["Tamara Castro"] })).toBe(
      "Letra y acordes para guitarra de Zamba de amor en vuelo. Interpretada por Tamara Castro. Consultá la canción en El Silbador.",
    );
  });

  it("stays as before when there are no performers", () => {
    expect(songDescription({ title: "Zamba de amor en vuelo", author: "Jorge Milikota", performers: [] })).toBe(
      "Letra y acordes para guitarra de Zamba de amor en vuelo, de Jorge Milikota. Consultá la canción en El Silbador.",
    );
    expect(songDescription({ title: "Zamba de amor en vuelo", author: "", performers: [] })).toBe(
      "Letra y acordes para guitarra de Zamba de amor en vuelo. Consultá la canción en El Silbador.",
    );
  });
});

describe("songJsonLd", () => {
  it("describes the composition with its composer and one recording per performer", () => {
    expect(
      songJsonLd({
        title: "Zamba de amor en vuelo",
        author: "Jorge Milikota",
        performers: ["Tamara Castro", "Los Nocheros"],
      }),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "MusicComposition",
      name: "Zamba de amor en vuelo",
      composer: { "@type": "Person", name: "Jorge Milikota" },
      recordedAs: [
        {
          "@type": "MusicRecording",
          name: "Zamba de amor en vuelo",
          byArtist: { "@type": "MusicGroup", name: "Tamara Castro" },
        },
        {
          "@type": "MusicRecording",
          name: "Zamba de amor en vuelo",
          byArtist: { "@type": "MusicGroup", name: "Los Nocheros" },
        },
      ],
    });
  });

  it("omits the composer when there is no author", () => {
    expect(songJsonLd({ title: "Zamba de amor en vuelo", author: "", performers: ["Tamara Castro"] })).toEqual({
      "@context": "https://schema.org",
      "@type": "MusicComposition",
      name: "Zamba de amor en vuelo",
      recordedAs: [
        {
          "@type": "MusicRecording",
          name: "Zamba de amor en vuelo",
          byArtist: { "@type": "MusicGroup", name: "Tamara Castro" },
        },
      ],
    });
  });

  it("omits the recordings when there are no performers", () => {
    expect(songJsonLd({ title: "Zamba de amor en vuelo", author: "Jorge Milikota", performers: [] })).toEqual({
      "@context": "https://schema.org",
      "@type": "MusicComposition",
      name: "Zamba de amor en vuelo",
      composer: { "@type": "Person", name: "Jorge Milikota" },
    });
  });
});
