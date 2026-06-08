import { describe, expect, it } from "vitest";

import {
  AacStructuredOutputSchema,
  GenerateRequestSchema,
  RegenerateImageRequestSchema,
} from "./schemas";

describe("request schemas", () => {
  it("accepts a teacher-selected AAC card count from 1 to 4", () => {
    expect(
      GenerateRequestSchema.parse({
        studentProfile: "짧은 문장과 시각 단서를 선호함",
        scienceText: "잎은 햇빛을 받아 양분을 만든다.",
        requestedStepCount: 1,
      }).requestedStepCount,
    ).toBe(1);

    expect(
      GenerateRequestSchema.safeParse({
        studentProfile: "짧은 문장과 시각 단서를 선호함",
        scienceText: "잎은 햇빛을 받아 양분을 만든다.",
        requestedStepCount: 5,
      }).success,
    ).toBe(false);
  });

  it("allows one-step structured AAC drafts", () => {
    const parsed = AacStructuredOutputSchema.parse({
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
      curriculum_links: ["ms-biology-photosynthesis"],
      special_education_rules_used: ["single-clause-receptive-language"],
      teacher_review_required: true,
    });

    expect(parsed.steps).toHaveLength(1);
  });

  it("accepts an optional card revision direction for image regeneration", () => {
    const parsed = RegenerateImageRequestSchema.parse({
      imagePrompt: "Concept: a leaf receives sunlight.",
      revisionInstruction: "화살표를 더 크게 보여줘",
    });

    expect(parsed.revisionInstruction).toBe("화살표를 더 크게 보여줘");
  });
});
