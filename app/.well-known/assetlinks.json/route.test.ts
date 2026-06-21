import { afterEach, describe, expect, it } from "vitest";

import { GET, buildAssetLinks, parseFingerprints } from "./route";

const LOWERCASE_FINGERPRINT = Array.from(
  { length: 32 },
  (_, index) => index.toString(16).padStart(2, "0"),
).join(":");
const NORMALIZED_FINGERPRINT = LOWERCASE_FINGERPRINT.toUpperCase();
const SECOND_FINGERPRINT = Array.from({ length: 32 }, () => "ab").join(":");

const originalFingerprints = process.env.ANDROID_SHA256_CERT_FINGERPRINTS;

afterEach(() => {
  if (originalFingerprints === undefined) {
    delete process.env.ANDROID_SHA256_CERT_FINGERPRINTS;
  } else {
    process.env.ANDROID_SHA256_CERT_FINGERPRINTS = originalFingerprints;
  }
});

describe("Digital Asset Links configuration", () => {
  it("normalizes and deduplicates comma-separated fingerprints", () => {
    expect(
      parseFingerprints(
        ` ${LOWERCASE_FINGERPRINT}, ${NORMALIZED_FINGERPRINT}, ${SECOND_FINGERPRINT} `,
      ),
    ).toEqual([NORMALIZED_FINGERPRINT, SECOND_FINGERPRINT.toUpperCase()]);
  });

  it.each([
    "not-a-fingerprint",
    `${NORMALIZED_FINGERPRINT},`,
    NORMALIZED_FINGERPRINT.replace(/:[0-9A-F]{2}$/, ""),
    NORMALIZED_FINGERPRINT.replace(/^00/, "GG"),
  ])("rejects malformed configuration: %s", (value) => {
    expect(() => parseFingerprints(value)).toThrow(
      "ANDROID_SHA256_CERT_FINGERPRINTS is invalid",
    );
  });
});

describe("GET /.well-known/assetlinks.json", () => {
  it.each([undefined, "   ", "not-a-fingerprint"])(
    "returns a non-cacheable 503 for unusable configuration: %s",
    async (value) => {
      if (value === undefined) {
        delete process.env.ANDROID_SHA256_CERT_FINGERPRINTS;
      } else {
        process.env.ANDROID_SHA256_CERT_FINGERPRINTS = value;
      }

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(body).toEqual({
        error: "Digital Asset Links configuration is unavailable.",
      });
      expect(JSON.stringify(body)).not.toMatch(
        /(?:[0-9A-F]{2}:){31}[0-9A-F]{2}/,
      );
    },
  );

  it("returns the exact Android app association with public caching", async () => {
    process.env.ANDROID_SHA256_CERT_FINGERPRINTS = ` ${LOWERCASE_FINGERPRINT}, ${SECOND_FINGERPRINT} `;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(body).toEqual(
      buildAssetLinks([
        NORMALIZED_FINGERPRINT,
        SECOND_FINGERPRINT.toUpperCase(),
      ]),
    );
    expect(body).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.yangisu.autoaac",
          sha256_cert_fingerprints: [
            NORMALIZED_FINGERPRINT,
            SECOND_FINGERPRINT.toUpperCase(),
          ],
        },
      },
    ]);
  });
});
