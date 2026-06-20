import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export function jsonNoStore(
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  const headers = new Headers(init?.headers);

  for (const [name, value] of Object.entries(NO_STORE_HEADERS)) {
    headers.set(name, value);
  }

  return NextResponse.json(body, { ...init, headers });
}

function publicError(error: string) {
  return { error, correlationId: randomUUID() };
}

export function publicGenerationError() {
  return publicError(
    "AAC 초안 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  );
}

export function publicImageError() {
  return publicError(
    "그림 재생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  );
}
