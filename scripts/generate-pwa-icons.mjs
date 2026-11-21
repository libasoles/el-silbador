// Keep the PWA mark slightly lighter than the small browser favicon.
// Run with: node scripts/generate-pwa-icons.mjs
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const publicDir = new URL("../public/", import.meta.url);
const source = (await readFile(new URL("favicon.svg", publicDir), "utf8"))
  .replace('stroke-width="2.15"', 'stroke-width="1.83"')
  .replaceAll('stroke-width="1.75"', 'stroke-width="1.49"');

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(new URL(name, publicDir).pathname);
}

// The maskable variant leaves the same 10% inset on each side as the existing icon.
const maskable = source.replace('<g fill="none"', '<g transform="translate(6.4 6.4) scale(0.8)" fill="none"');
await sharp(Buffer.from(maskable))
  .resize(512, 512)
  .png()
  .toFile(new URL("icon-maskable-512.png", publicDir).pathname);
