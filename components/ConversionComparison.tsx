"use client";

import type { StoryboardStep } from "./AacCard";

type ConversionComparisonProps = {
  scienceText: string;
  steps: StoryboardStep[];
};

function buildNaiveSummary(scienceText: string) {
  const trimmed = scienceText.trim();
  if (!trimmed) {
    return "과학 원문을 입력하면 일반 요약 예시가 여기에 표시됩니다.";
  }

  return `${trimmed.replace(/[.。]$/, "")} 과정을 이해한다.`;
}

export function ConversionComparison({
  scienceText,
  steps,
}: ConversionComparisonProps) {
  return (
    <section className="comparison-panel" aria-labelledby="comparison-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Why Auto AAC</p>
          <h2 id="comparison-title">일반 요약이 아니라 AAC 단위 변환</h2>
        </div>
      </div>

      <div className="comparison-grid">
        <div className="comparison-column muted-comparison">
          <span className="comparison-kicker">일반 AI 요약</span>
          <p>{buildNaiveSummary(scienceText)}</p>
          <small>긴 문장과 추상어가 남아 수업 중 의사표현 카드로 쓰기 어렵습니다.</small>
        </div>

        <div className="comparison-column strong-comparison">
          <span className="comparison-kicker">Auto AAC 변환</span>
          {steps.length > 0 ? (
            <ol className="mini-step-list">
              {steps.map((step, index) => (
                <li key={`${step.step_number}-${index}`}>
                  {step.simplified_text || "교사가 검토할 단문 초안"}
                </li>
              ))}
            </ol>
          ) : (
            <p>생성 후 한 카드 한 문장 구조의 AAC 초안이 표시됩니다.</p>
          )}
          <small>학생이 보고, 가리키고, 교사가 바로 수정할 수 있는 단문 카드 흐름입니다.</small>
        </div>
      </div>
    </section>
  );
}
