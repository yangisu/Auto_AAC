import { describe, expect, it } from "vitest";
import {
  jsonNoStore,
  publicGenerationError,
  publicImageError,
} from "./no-store";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("jsonNoStore", () => {
  it("sets headers that prevent response storage", () => {
    const response = jsonNoStore({ ok: true });

    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Expires")).toBe("0");
  });
});

describe("public error helpers", () => {
  it("returns only the public generation message and a UUID correlation ID", () => {
    const error = publicGenerationError();

    expect(Object.keys(error).sort()).toEqual(["correlationId", "error"]);
    expect(error.error).toBe(
      "AAC 초안 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    );
    expect(error.correlationId).toMatch(UUID_PATTERN);
  });

  it("returns only the public image message and a UUID correlation ID", () => {
    const error = publicImageError();

    expect(Object.keys(error).sort()).toEqual(["correlationId", "error"]);
    expect(error.error).toBe(
      "그림 재생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    );
    expect(error.correlationId).toMatch(UUID_PATTERN);
  });
});
