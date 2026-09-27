import { describe, expect, it } from "vitest";
import { pdfDocumentTitle } from "./pdfFilename";

describe("pdfDocumentTitle", () => {
  it("uses the song title and author in the suggested PDF filename", () => {
    expect(pdfDocumentTitle("Alfonsina y el mar", "Ariel Ramírez")).toBe(
      "Alfonsina y el mar - Ariel Ramírez",
    );
  });

  it("keeps the available field when only one is present", () => {
    expect(pdfDocumentTitle("", "Ariel Ramírez")).toBe("Ariel Ramírez");
    expect(pdfDocumentTitle("Alfonsina y el mar", "   ")).toBe("Alfonsina y el mar");
  });

  it("uses El Silbador when both bibliographic fields are missing", () => {
    expect(pdfDocumentTitle("", "")).toBe("El Silbador");
  });
});
