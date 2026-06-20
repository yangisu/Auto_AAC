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
});
