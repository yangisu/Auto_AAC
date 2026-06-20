import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDirectory = path.join(projectRoot, "public", "icons");
const source = path.join(iconsDirectory, "icon-source.svg");
const outputs = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["icon-maskable-512.png", 512],
];

await mkdir(iconsDirectory, { recursive: true });

for (const [filename, size] of outputs) {
  await sharp(source, { density: 192 })
    .resize(size, size, { fit: "fill" })
    .png({
      adaptiveFiltering: false,
      compressionLevel: 9,
      effort: 10,
      palette: false,
      progressive: false,
    })
    .toFile(path.join(iconsDirectory, filename));
}
