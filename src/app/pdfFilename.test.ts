import { describe, expect, it } from "vitest";
import { pdfDocumentTitle } from "./pdfFilename";

describe("pdfDocumentTitle", () => {
  it("uses the song title and author in the suggested PDF filename", () => {
    expect(pdfDocumentTitle("Alfonsina y el mar", "Ariel Ramírez")).toBe(
      "Alfonsina y el mar - Ariel Ramírez",
    );
  });

  it("uses El Silbador for each missing bibliographic field", () => {
    expect(pdfDocumentTitle("", "Ariel Ramírez")).toBe("El Silbador - Ariel Ramírez");
    expect(pdfDocumentTitle("Alfonsina y el mar", "   ")).toBe("Alfonsina y el mar - El Silbador");
    expect(pdfDocumentTitle("", "")).toBe("El Silbador - El Silbador");
  });
});
