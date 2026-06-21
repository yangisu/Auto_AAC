const FINGERPRINT_PATTERN = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export const UPLOAD_CERTIFICATE_SHA256_FINGERPRINT =
  "00:9E:1F:BA:5F:61:F8:A4:A8:5D:3B:E3:07:63:BA:D1:68:07:24:63:C6:E1:B7:C6:ED:BA:CE:EE:E3:F9:83:E5";

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
    const configuredValue = process.env.ANDROID_SHA256_CERT_FINGERPRINTS;
    const configuredFingerprints =
      configuredValue === undefined || configuredValue.trim() === ""
        ? []
        : parseFingerprints(configuredValue);
    const fingerprints = [
      ...new Set([
        UPLOAD_CERTIFICATE_SHA256_FINGERPRINT,
        ...configuredFingerprints,
      ]),
    ];

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
