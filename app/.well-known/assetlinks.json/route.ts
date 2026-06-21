const FINGERPRINT_PATTERN = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function parseFingerprints(value: string | undefined): string[] {
  if (value === undefined || value.trim() === "") {
    throw new Error("ANDROID_SHA256_CERT_FINGERPRINTS is invalid");
  }

  const fingerprints = value
    .split(",")
    .map((fingerprint) => fingerprint.trim().toUpperCase());

  if (fingerprints.some((fingerprint) => !FINGERPRINT_PATTERN.test(fingerprint))) {
    throw new Error("ANDROID_SHA256_CERT_FINGERPRINTS is invalid");
  }

  return [...new Set(fingerprints)];
}

export function buildAssetLinks(fingerprints: string[]) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.yangisu.autoaac",
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}

export function GET() {
  try {
    const fingerprints = parseFingerprints(
      process.env.ANDROID_SHA256_CERT_FINGERPRINTS,
    );

    return Response.json(buildAssetLinks(fingerprints), {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Content-Type": "application/json",
      },
    });
  } catch {
    return Response.json(
      { error: "Digital Asset Links configuration is unavailable." },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
        },
      },
    );
  }
}
