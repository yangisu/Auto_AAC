"use client";

import { useState } from "react";
import { InputPanel } from "../components/InputPanel";
import { ReviewToolbar } from "../components/ReviewToolbar";
import { Storyboard } from "../components/Storyboard";
import type { StoryboardStep } from "../components/AacCard";

type GenerateResponse = {
  topic: string;
  student_analysis: Record<string, string | number | boolean | null | undefined>;
  steps: StoryboardStep[];
  curriculum_links: string[];
  special_education_rules_used: string[];
  teacher_review_required: boolean;
  grounding_debug?: {
    extracted_keywords?: string[];
    detected_needs?: string[];
    style_profile_id?: string;
  };
};

type RegenerateResponse = {
  image_url: string;
  image_prompt?: string;
  image_style_profile?: string;
  error?: string;
};

type DemoId = "photosynthesis" | "science-communication";

const demoInputs: Record<
  DemoId,
  {
    studentProfile: string;
    scienceText: string;
    requestedStepCount: number;
  }
> = {
  photosynthesis: {
    studentProfile:
      "초등학교 2학년 수준의 어휘는 이해하지만 긴 문장과 인과관계를 어려워함. 주의집중 시간이 짧고 흰 배경의 크고 단순한 그림에 잘 반응함.",
    scienceText:
      "식물은 광합성을 통해 빛에너지와 물을 이용하여 생장에 필요한 양분을 만든다.",
    requestedStepCount: 3,
  },
  "science-communication": {
    studentProfile:
      "중학교 2학년 수준의 어휘는 이해하지만 긴 문장과 인과관계를 어려워함. 주의집중 시간이 짧고 흰 배경의 크고 단순한 그림에 잘 반응함. 과학 개념 학습 중 자신의 의사를 표현하기 위한 AAC를 원함.",
    scienceText:
      "이 과학 개념이 이해가 안가요, 실험 과정 중 문제가 생겼어요, 방금 설명한 개념을 제가 이야기해보고 싶어요",
    requestedStepCount: 3,
  },
};

async function readError(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.error || `Request failed with status ${response.status}`;
}

export default function Home() {
  const [studentProfile, setStudentProfile] = useState("");
  const [scienceText, setScienceText] = useState("");
  const [requestedStepCount, setRequestedStepCount] = useState(1);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [steps, setSteps] = useState<StoryboardStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [regeneratingStep, setRegeneratingStep] = useState<number | null>(null);
  const [regenerateErrors, setRegenerateErrors] = useState<Record<number, string>>({});

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    setRegenerateErrors({});

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentProfile,
          scienceText,
          requestedStepCount,
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = (await response.json()) as GenerateResponse;
      setResult(data);
      setSteps(data.steps ?? []);
    } catch (generateError) {
      const message =
        generateError instanceof Error
          ? generateError.message
          : "AAC 초안 생성 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleStudentProfileChange(value: string) {
    setStudentProfile(value);
    setPrivacyAcknowledged(false);
  }

  function handleScienceTextChange(value: string) {
    setScienceText(value);
    setPrivacyAcknowledged(false);
  }

  function handleLoadDemo(demoId: DemoId) {
    const demo = demoInputs[demoId];
    setStudentProfile(demo.studentProfile);
    setScienceText(demo.scienceText);
    setRequestedStepCount(demo.requestedStepCount);
    setPrivacyAcknowledged(false);
    setError(null);
    setRegenerateErrors({});
  }

  function handleTextChange(index: number, value: string) {
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, simplified_text: value } : step
      )
    );
  }

  function handleRevisionInstructionChange(index: number, value: string) {
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, revision_instruction: value } : step
      )
    );
  }

  function handleDelete(index: number) {
    setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index));
    setRegenerateErrors((current) =>
      Object.fromEntries(
        Object.entries(current)
          .filter(([key]) => Number(key) !== index)
          .map(([key, value]) => {
            const numericKey = Number(key);
            return [numericKey > index ? numericKey - 1 : numericKey, value];
          })
      )
    );
  }

  async function handleRegenerateImage(index: number) {
    const targetStep = steps[index];
    if (!targetStep) {
      return;
    }

    setRegeneratingStep(index);
    setRegenerateErrors((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });

    try {
      const response = await fetch("/api/regenerate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imagePrompt: targetStep.image_prompt,
          revisionInstruction: targetStep.revision_instruction,
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = (await response.json()) as RegenerateResponse;
      setSteps((current) =>
        current.map((step, stepIndex) =>
          stepIndex === index
            ? {
                ...step,
                image_url: data.image_url,
                image_prompt: data.image_prompt ?? step.image_prompt,
                image_style_profile:
                  data.image_style_profile ?? step.image_style_profile,
              }
            : step
        )
      );
    } catch (regenerateError) {
      const message =
        regenerateError instanceof Error
          ? regenerateError.message
          : "그림 재생성 중 오류가 발생했습니다.";
      setRegenerateErrors((current) => ({ ...current, [index]: message }));
    } finally {
      setRegeneratingStep(null);
    }
  }

  return (
    <main className="app-shell">
      <div className="workspace">
        <div className="tool-grid">
          <InputPanel
            studentProfile={studentProfile}
            scienceText={scienceText}
            requestedStepCount={requestedStepCount}
            isLoading={isLoading}
            error={error}
            privacyAcknowledged={privacyAcknowledged}
            onStudentProfileChange={handleStudentProfileChange}
            onScienceTextChange={handleScienceTextChange}
            onRequestedStepCountChange={setRequestedStepCount}
            onPrivacyAcknowledgedChange={setPrivacyAcknowledged}
            onGenerate={handleGenerate}
            onLoadDemo={handleLoadDemo}
          />

          <ReviewToolbar
            topic={result?.topic}
            studentAnalysis={result?.student_analysis}
            curriculumLinks={result?.curriculum_links}
            rulesUsed={result?.special_education_rules_used}
            groundingDebug={result?.grounding_debug}
          />
        </div>

        <Storyboard
          steps={steps}
          regeneratingStep={regeneratingStep}
          regenerateErrors={regenerateErrors}
          onTextChange={handleTextChange}
          onRevisionInstructionChange={handleRevisionInstructionChange}
          onRegenerateImage={handleRegenerateImage}
          onDelete={handleDelete}
        />
      </div>
    </main>
  );
}
