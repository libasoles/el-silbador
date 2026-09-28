const DEFAULT_PDF_FILENAME_PART = "El Silbador";

/**
 * Browsers use the document title as the suggested name when a print job is saved as PDF.
 * Include every bibliographic field we have; unfinished songs use the application name.
 */
export function pdfDocumentTitle(title: string, author: string): string {
  const songTitle = title.trim();
  const songAuthor = author.trim();

  if (songTitle && songAuthor) return `${songTitle} - ${songAuthor}`;
  return songTitle || songAuthor || DEFAULT_PDF_FILENAME_PART;
}
