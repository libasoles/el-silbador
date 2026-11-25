// Regenerate the editor share images: node scripts/generate-editor-og.mjs
import sharp from "sharp";

const source = new URL("assets/editor-og.svg", import.meta.url).pathname;
await sharp(source)
  .png()
  .toFile(new URL("../public/banner.png", import.meta.url).pathname);
await sharp(source)
  .resize(1200, 630, { fit: "fill" })
  .png()
  .toFile(new URL("../public/og-image.png", import.meta.url).pathname);
