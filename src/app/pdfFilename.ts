const DEFAULT_PDF_FILENAME_PART = "El Silbador";

/**
 * Browsers use the document title as the suggested name when a print job is saved as PDF.
 * Keep both bibliographic fields present, even for an unfinished song.
 */
export function pdfDocumentTitle(title: string, author: string): string {
  const songTitle = title.trim() || DEFAULT_PDF_FILENAME_PART;
  const songAuthor = author.trim() || DEFAULT_PDF_FILENAME_PART;

  return `${songTitle} - ${songAuthor}`;
}
