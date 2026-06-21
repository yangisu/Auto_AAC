import { afterEach, describe, expect, it } from "vitest";

import {
  GET,
  UPLOAD_CERTIFICATE_SHA256_FINGERPRINT,
  buildAssetLinks,
  parseFingerprints,
} from "./route";

const UPLOAD_CERTIFICATE_SHA256 =
  "00:9E:1F:BA:5F:61:F8:A4:A8:5D:3B:E3:07:63:BA:D1:68:07:24:63:C6:E1:B7:C6:ED:BA:CE:EE:E3:F9:83:E5";

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
  it("exports the public upload certificate fingerprint", () => {
    expect(UPLOAD_CERTIFICATE_SHA256_FINGERPRINT).toBe(
      UPLOAD_CERTIFICATE_SHA256,
    );
  });

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
  it.each([undefined, "   "])(
    "returns the upload certificate with public caching when configuration is blank: %s",
    async (value) => {
      if (value === undefined) {
        delete process.env.ANDROID_SHA256_CERT_FINGERPRINTS;
      } else {
        process.env.ANDROID_SHA256_CERT_FINGERPRINTS = value;
      }

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
      expect(body).toEqual(buildAssetLinks([UPLOAD_CERTIFICATE_SHA256]));
    },
  );

  it("merges valid configured fingerprints with the upload certificate", async () => {
    process.env.ANDROID_SHA256_CERT_FINGERPRINTS = ` ${LOWERCASE_FINGERPRINT}, ${SECOND_FINGERPRINT} `;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(body).toEqual(
      buildAssetLinks([
        UPLOAD_CERTIFICATE_SHA256,
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
            UPLOAD_CERTIFICATE_SHA256,
            NORMALIZED_FINGERPRINT,
            SECOND_FINGERPRINT.toUpperCase(),
          ],
        },
      },
    ]);
  });

  it("deduplicates the upload certificate from configured fingerprints", async () => {
    process.env.ANDROID_SHA256_CERT_FINGERPRINTS =
      UPLOAD_CERTIFICATE_SHA256.toLowerCase();

    const response = await GET();

    expect(await response.json()).toEqual(
      buildAssetLinks([UPLOAD_CERTIFICATE_SHA256]),
    );
  });

  it("returns a non-cacheable 503 for malformed configuration", async () => {
    process.env.ANDROID_SHA256_CERT_FINGERPRINTS = "not-a-fingerprint";

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: "Digital Asset Links configuration is unavailable.",
    });
  });
});
