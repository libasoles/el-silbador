// Regenerate the section's share image: node scripts/generate-metrica-og.mjs
import sharp from "sharp";

await sharp(new URL("assets/metrica-og.svg", import.meta.url).pathname)
  .png()
  .toFile(new URL("../public/og-metrica.png", import.meta.url).pathname);
