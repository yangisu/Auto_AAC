import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDirectory = path.join(projectRoot, "public", "icons");
const source = path.join(iconsDirectory, "icon-source.svg");
const outputs = [
  { filename: "icon-192.png", size: 192, maskable: false },
  { filename: "icon-512.png", size: 512, maskable: false },
  { filename: "icon-maskable-512.png", size: 512, maskable: true },
];

export async function generatePwaIcons(outputDirectory = iconsDirectory) {
  await mkdir(outputDirectory, { recursive: true });

  for (const { filename, size, maskable } of outputs) {
    let image = sharp(source, { density: 192 }).resize(size, size, {
      fit: "fill",
    });

    if (maskable) {
      image = image.flatten({ background: "#245fc9" });
    }

    await image
      .png({
        adaptiveFiltering: false,
        compressionLevel: 9,
        effort: 10,
        palette: false,
        progressive: false,
      })
      .toFile(path.join(outputDirectory, filename));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generatePwaIcons();
}
