import { describe, expect, it } from "vitest";

import { retrieveGrounding } from "./retrieval";

describe("retrieveGrounding", () => {
  it("selects middle-school science curriculum by Korean keyword overlap", () => {
    const result = retrieveGrounding(
      {},
      "식물은 빛에너지를 이용해 광합성을 하고 물과 이산화탄소로 양분과 산소를 만든다.",
    );

    expect(result.curriculumContexts[0]?.domain).toBe("생명과학");
    expect(result.curriculumContexts[0]?.unit).toBe("식물과 광합성");
    expect(result.curriculumContexts[0]?.matchedKeywords).toEqual(
      expect.arrayContaining(["광합성", "빛에너지", "이산화탄소", "산소"]),
    );
    expect(result.extractedKeywords).toEqual(
      expect.arrayContaining(["광합성", "빛에너지", "이산화탄소", "산소"]),
    );
  });

  it("selects special-education rules from student-profile cues", () => {
    const result = retrieveGrounding(
      {
        readingLevel: "초등 저학년 수준, 글자 읽기 어려움",
        attention: "주의집중 시간이 짧고 산만함",
        causeEffect: "원인과 결과 연결을 연습 중",
        abstractConcepts: "추상 개념 이해가 어려움",
        emotionalBehaviorNeeds: "불안과 좌절 행동이 있음",
      },
      "물은 가열하면 증발하고 냉각하면 응결한다.",
    );

    expect(result.detectedNeeds).toEqual(
      expect.arrayContaining([
        "low_reading_level",
        "short_attention",
        "cause_effect_support",
        "abstract_concept_support",
        "emotional_behavior_support",
      ]),
    );
    expect(result.specialEducationRules.map((rule) => rule.id)).toEqual(
      expect.arrayContaining([
        "no-text-low-reading",
        "single-focus-short-attention",
        "arrow-cause-effect",
        "concretize-abstract-science",
        "emotionally-neutral-predictable",
      ]),
    );
  });

  it("always returns the AAC visual style profile for prompt consumers", () => {
    const result = retrieveGrounding({}, "힘이 물체의 운동 방향을 바꾼다.");

    expect(result.styleProfile.canvas.background).toBe("white");
    expect(result.styleProfile.line.outline).toContain("thick black");
    expect(result.styleProfile.composition.conceptCount).toBe(1);
    expect(result.styleProfile.constraints).toEqual(
      expect.arrayContaining(["no text", "one concept only"]),
    );
  });

  it("provides science decomposition hints for Korean AAC card sentences", () => {
    const result = retrieveGrounding(
      "짧은 단문을 선호하고 긴 문장을 이해하기 어려움",
      "잎은 햇빛과 물을 받아 양분을 만든다.",
    );

    const photosynthesis = result.curriculumContexts[0];

    expect(photosynthesis?.unit).toBe("식물과 광합성");
    expect(photosynthesis?.sentenceDecomposition.subjectCandidates).toEqual(
      expect.arrayContaining(["잎", "식물"]),
    );
    expect(photosynthesis?.sentenceDecomposition.objectCandidates).toEqual(
      expect.arrayContaining(["햇빛", "물", "양분"]),
    );
    expect(photosynthesis?.sentenceDecomposition.predicateCandidates).toEqual(
      expect.arrayContaining(["받는다", "만든다"]),
    );
    expect(photosynthesis?.cardSentenceFrames).toEqual(
      expect.arrayContaining(["잎이 햇빛을 받는다.", "잎이 양분을 만든다."]),
    );
  });

  it("selects fine-grained special-education supports for sentence, memory, visual, and transition needs", () => {
    const result = retrieveGrounding(
      "수용언어가 약하고 긴 문장을 어려워함. 작업기억 부담이 크며 두 가지 지시를 동시에 처리하기 어려움. 그림이 많으면 시각 변별이 어렵고 전환 상황에서 불안이 커짐.",
      "물은 가열되면 수증기가 된다.",
    );

    expect(result.detectedNeeds).toEqual(
      expect.arrayContaining([
        "receptive_language_single_clause",
        "working_memory_step_limit",
        "visual_discrimination_support",
        "transition_predictability",
      ]),
    );
    expect(result.specialEducationRules.map((rule) => rule.id)).toEqual(
      expect.arrayContaining([
        "single-clause-receptive-language",
        "working-memory-three-to-four-steps",
        "visual-discrimination-clean-field",
        "predictable-transition-sequence",
      ]),
    );
  });
});
