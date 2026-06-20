import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const openaiMocks = vi.hoisted(() => ({
  hasOpenAIKey: vi.fn(),
  responsesParse: vi.fn(),
  imagesGenerate: vi.fn(),
}));

const groundingMocks = vi.hoisted(() => ({
  retrieveGrounding: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  hasOpenAIKey: openaiMocks.hasOpenAIKey,
  getOpenAIClient: () => ({
    responses: { parse: openaiMocks.responsesParse },
    images: { generate: openaiMocks.imagesGenerate },
  }),
  textModel: "test-text-model",
  imageModel: "test-image-model",
}));

vi.mock("@/lib/grounding/retrieval", () => ({
  retrieveGrounding: groundingMocks.retrieveGrounding,
}));

vi.mock("@/lib/http/no-store", () => import("../../../lib/http/no-store"));
vi.mock("@/lib/prompts/image-prompt", () =>
  import("../../../lib/prompts/image-prompt"),
);
vi.mock("@/lib/prompts/system-prompt", () =>
  import("../../../lib/prompts/system-prompt"),
);
vi.mock("@/lib/schemas", () => import("../../../lib/schemas"));

import { POST } from "./route";

const validRequest = {
  studentProfile: "짧은 문장과 시각 단서를 선호함",
  scienceText: "잎은 햇빛을 받아 양분을 만든다.",
  requestedStepCount: 1,
};

const parsedDraft = {
  topic: "광합성",
  student_analysis: {
    identified_reading_level: "짧은 단문 필요",
    applied_simplification_rule: "한 카드에 한 개념",
  },
  steps: [
    {
      step_number: 1,
      simplified_text: "잎이 햇빛을 받는다.",
      image_prompt: "a leaf receives sunlight",
    },
  ],
  curriculum_links: ["photosynthesis"],
  special_education_rules_used: [],
  teacher_review_required: false,
};

const grounding = {
  curriculumContexts: [],
  specialEducationRules: [
    {
      id: "one-concept",
      need: "cognitive-support",
      title: "One concept",
      guidance: ["Use one concept."],
      promptConstraints: ["one concept only"],
    },
  ],
  styleProfile: {
    id: "test-style",
    source: "test",
    canvas: {
      background: "white",
      frame: "rounded",
      frameRadius: "small",
      borderColors: ["black"],
    },
    line: { outline: "black", weight: "thick", joins: "round" },
    rendering: {},
    composition: {
      conceptCount: 1,
      layout: "centered",
      sequenceCue: "none",
      backgroundDetail: "none",
    },
    constraints: ["one concept"],
    negativePrompt: ["text"],
  },
  extractedKeywords: ["잎"],
  detectedNeeds: ["visual-support"],
};

function request(body: unknown) {
  return new Request("http://localhost/api/generate", {
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

describe("POST /api/generate privacy controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openaiMocks.hasOpenAIKey.mockReturnValue(true);
    openaiMocks.responsesParse.mockResolvedValue({ output_parsed: parsedDraft });
    openaiMocks.imagesGenerate.mockResolvedValue({
      data: [{ b64_json: "generated-image" }],
    });
    groundingMocks.retrieveGrounding.mockReturnValue(grounding);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns validation details without cacheable headers", async () => {
    const directIdentifier = "teacher@example.com";
    const response = await POST(
      request({
        ...validRequest,
        studentProfile: `연락처는 ${directIdentifier}입니다`,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.error).toBe("Invalid request body.");
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ["studentProfile"] }),
      ]),
    );
    expect(
      body.details.every(
        (detail: object) =>
          JSON.stringify(Object.keys(detail).sort()) ===
          JSON.stringify(["message", "path"]),
      ),
    ).toBe(true);
    expect(JSON.stringify(body)).not.toContain(directIdentifier);
  });

  it("logs the missing-key correlation ID with only a fixed error name", async () => {
    openaiMocks.hasOpenAIKey.mockReturnValue(false);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request(validRequest));
    const body = await response.json();

    expect(response.status).toBe(500);
    expectNoStore(response);
    expect(body).toEqual({
      error: "AAC 초안 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      correlationId: expect.stringMatching(UUID_PATTERN),
    });
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "AI generation configuration error",
      { correlationId: body.correlationId, errorName: "ConfigurationError" },
    );
  });

  it("hides provider failures and logs no provider message", async () => {
    class ProviderFailure extends Error {
      override name = "ProviderFailure";
    }
    const providerMessage = "raw provider secret detail";
    openaiMocks.responsesParse.mockRejectedValue(
      new ProviderFailure(providerMessage),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request(validRequest));
    const body = await response.json();

    expect(response.status).toBe(500);
    expectNoStore(response);
    expect(body).toEqual({
      error: "AAC 초안 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      correlationId: expect.stringMatching(UUID_PATTERN),
    });
    expect(JSON.stringify(body)).not.toContain(providerMessage);
    expect(consoleError).toHaveBeenCalledWith("AI generation failed", {
      correlationId: body.correlationId,
      errorName: "ProviderFailure",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(providerMessage);
  });

  it("returns a no-store draft and disables OpenAI response storage", async () => {
    const response = await POST(request(validRequest));
    const body = await response.json();

    expect(response.status).toBe(200);
    expectNoStore(response);
    expect(body.steps[0].image_url).toBe(
      "data:image/png;base64,generated-image",
    );
    expect(openaiMocks.responsesParse).toHaveBeenCalledWith(
      expect.objectContaining({ store: false }),
    );
  });
});
