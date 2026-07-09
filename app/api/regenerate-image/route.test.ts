import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const openaiMocks = vi.hoisted(() => ({
  hasOpenAIKey: vi.fn(),
  imagesGenerate: vi.fn(),
}));

const groundingMocks = vi.hoisted(() => ({
  retrieveDefaultStyleProfile: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  hasOpenAIKey: openaiMocks.hasOpenAIKey,
  getOpenAIClient: () => ({
    images: { generate: openaiMocks.imagesGenerate },
  }),
  imageModel: "test-image-model",
}));

vi.mock("@/lib/grounding/retrieval", () => ({
  retrieveDefaultStyleProfile: groundingMocks.retrieveDefaultStyleProfile,
}));

vi.mock("@/lib/http/no-store", () => import("../../../lib/http/no-store"));
vi.mock("@/lib/prompts/image-prompt", () =>
  import("../../../lib/prompts/image-prompt"),
);
vi.mock("@/lib/schemas", () => import("../../../lib/schemas"));

import { POST } from "./route";

const validRequest = {
  imagePrompt: "Custom AAC Style Profile: test-style. Concept: a green leaf",
  revisionInstruction: "화살표를 크게 표시해 주세요",
};

function request(body: unknown) {
  return new Request("http://localhost/api/regenerate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  expect(response.headers.get("Pragma")).toBe("no-cache");
  expect(response.headers.get("Expires")).toBe("0");
}

describe("POST /api/regenerate-image privacy controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openaiMocks.hasOpenAIKey.mockReturnValue(true);
    openaiMocks.imagesGenerate.mockResolvedValue({
      data: [{ b64_json: "regenerated-image" }],
    });
    groundingMocks.retrieveDefaultStyleProfile.mockReturnValue({
      id: "test-style",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns validation details without cacheable headers", async () => {
    const privateValue = "do-not-echo-this-image-input";
    const response = await POST(
      request({ imagePrompt: { privateValue } }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.error).toBe("Invalid request body.");
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ["imagePrompt"] }),
      ]),
    );
    expect(
      body.details.every(
        (detail: object) =>
          JSON.stringify(Object.keys(detail).sort()) ===
          JSON.stringify(["message", "path"]),
      ),
    ).toBe(true);
    expect(JSON.stringify(body)).not.toContain(privateValue);
  });

  it("logs the missing-key correlation ID with only a fixed error name", async () => {
    openaiMocks.hasOpenAIKey.mockReturnValue(false);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request(validRequest));
    const body = await response.json();

    expect(response.status).toBe(500);
    expectNoStore(response);
    expect(body).toEqual({
      error: "그림 재생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      correlationId: expect.stringMatching(UUID_PATTERN),
    });
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "AI image regeneration configuration error",
      { correlationId: body.correlationId, errorName: "ConfigurationError" },
    );
  });

  it("hides provider failures and logs no provider message", async () => {
    class ProviderFailure extends Error {
      override name = "ProviderFailure";
    }
    const providerMessage = "raw provider image detail";
    openaiMocks.imagesGenerate.mockRejectedValue(
      new ProviderFailure(providerMessage),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request(validRequest));
    const body = await response.json();

    expect(response.status).toBe(500);
    expectNoStore(response);
    expect(body).toEqual({
      error: "그림 재생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      correlationId: expect.stringMatching(UUID_PATTERN),
    });
    expect(JSON.stringify(body)).not.toContain(providerMessage);
    expect(consoleError).toHaveBeenCalledWith(
      "AI image regeneration failed",
      { correlationId: body.correlationId, errorName: "ProviderFailure" },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(providerMessage);
  });

  it("returns a successful image response with no-store headers", async () => {
    const response = await POST(request(validRequest));
    const body = await response.json();

    expect(response.status).toBe(200);
    expectNoStore(response);
    expect(body.image_url).toBe(
      "data:image/png;base64,regenerated-image",
    );
    expect(openaiMocks.imagesGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          "Teacher revision direction: 화살표를 크게 표시해 주세요",
        ),
      }),
    );
  });
});
