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

async function readError(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.error || `Request failed with status ${response.status}`;
}

export default function Home() {
  const [studentProfile, setStudentProfile] = useState("");
  const [scienceText, setScienceText] = useState("");
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [steps, setSteps] = useState<StoryboardStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        body: JSON.stringify({ studentProfile, scienceText }),
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

  function handleTextChange(index: number, value: string) {
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, simplified_text: value } : step
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
        body: JSON.stringify({ imagePrompt: targetStep.image_prompt }),
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
            isLoading={isLoading}
            error={error}
            onStudentProfileChange={setStudentProfile}
            onScienceTextChange={setScienceText}
            onGenerate={handleGenerate}
          />

          <ReviewToolbar
            topic={result?.topic}
            studentAnalysis={result?.student_analysis}
            curriculumLinks={result?.curriculum_links}
            rulesUsed={result?.special_education_rules_used}
            teacherReviewRequired={result?.teacher_review_required}
            groundingDebug={result?.grounding_debug}
          />
        </div>

        <Storyboard
          steps={steps}
          regeneratingStep={regeneratingStep}
          regenerateErrors={regenerateErrors}
          onTextChange={handleTextChange}
          onRegenerateImage={handleRegenerateImage}
          onDelete={handleDelete}
        />
      </div>
    </main>
  );
}
