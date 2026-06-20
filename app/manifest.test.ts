import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { viewport } from "./layout";
import manifest from "./manifest";

describe("PWA manifest", () => {
  it("describes the installable Auto AAC experience and its generated icons", () => {
    expect(manifest()).toEqual({
      name: "Auto AAC",
      short_name: "Auto AAC",
      description: "교사가 검토하는 AAC 카드 초안 생성 도구",
      start_url: "/",
      scope: "/",
      display: "standalone",
      lang: "ko",
      theme_color: "#245fc9",
      background_color: "#f7f8fb",
      categories: ["education", "productivity"],
      icons: [
        {
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    });
  });
});

describe("root viewport", () => {
  it("uses the installable app theme and device-safe viewport", () => {
    expect(viewport).toEqual({
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover",
      themeColor: "#245fc9",
    });
  });
});

describe("generated PWA icons", () => {
  it.each([
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["icon-maskable-512.png", 512],
  ])("renders %s at %ipx square", async (filename, size) => {
    const metadata = await sharp(
      path.join(process.cwd(), "public", "icons", filename),
    ).metadata();

    expect(metadata).toMatchObject({
      format: "png",
      width: size,
      height: size,
    });
  });

  it("renders the maskable icon with fully opaque pixels", async () => {
    const { data, info } = await sharp(
      path.join(process.cwd(), "public", "icons", "icon-maskable-512.png"),
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const alphaValues = data.filter((_, index) => index % info.channels === 3);

    expect(alphaValues.reduce((minimum, alpha) => Math.min(minimum, alpha), 255)).toBe(
      255,
    );
  });

  it("keeps the opaque maskable icon distinct from the transparent regular icon", async () => {
    const iconsDirectory = path.join(process.cwd(), "public", "icons");
    const regular = await readFile(path.join(iconsDirectory, "icon-512.png"));
    const maskable = await readFile(
      path.join(iconsDirectory, "icon-maskable-512.png"),
    );

    expect(maskable.equals(regular)).toBe(false);
  });

  it("reproduces identical PNG bytes in independent output directories", async () => {
    const generatorModulePath = path.join(
      process.cwd(),
      "scripts",
      "generate-pwa-icons.mjs",
    );
    const { generatePwaIcons } = await import(generatorModulePath);

    expect(generatePwaIcons).toBeTypeOf("function");

    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "auto-aac-icons-"));
    const firstDirectory = path.join(temporaryRoot, "first");
    const secondDirectory = path.join(temporaryRoot, "second");

    try {
      await generatePwaIcons(firstDirectory);
      await generatePwaIcons(secondDirectory);

      for (const filename of [
        "icon-192.png",
        "icon-512.png",
        "icon-maskable-512.png",
      ]) {
        const first = await readFile(path.join(firstDirectory, filename));
        const second = await readFile(path.join(secondDirectory, filename));

        expect(first.equals(second), filename).toBe(true);
      }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
