import { describe, expect, it } from "vitest";
import { extractYoutubeVideoId, isValidYoutubeUrl } from "./youtubeUrl";

describe("extractYoutubeVideoId", () => {
  it("reads the id from a standard watch URL", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("reads the id from a watch URL with extra query params", () => {
    expect(
      extractYoutubeVideoId("https://youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&t=30s"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("reads the id from a share short link", () => {
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("reads the id from a share short link with a query string", () => {
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ?si=abc123")).toBe("dQw4w9WgXcQ");
  });

  it("reads the id from an embed URL", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("reads the id from a Shorts URL", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("rejects a non-YouTube URL", () => {
    expect(extractYoutubeVideoId("https://vimeo.com/12345")).toBeNull();
  });

  it("rejects a YouTube URL with no video id", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/")).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(extractYoutubeVideoId("not a url")).toBeNull();
  });
});

describe("isValidYoutubeUrl", () => {
  it("mirrors extractYoutubeVideoId", () => {
    expect(isValidYoutubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isValidYoutubeUrl("https://example.com")).toBe(false);
  });
});
