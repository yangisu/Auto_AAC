"use client";

import { AacCard, type StoryboardStep } from "./AacCard";

type StoryboardProps = {
  steps: StoryboardStep[];
  regeneratingStep: number | null;
  regenerateErrors: Record<number, string>;
  privacyAcknowledged: boolean;
  onTextChange: (index: number, value: string) => void;
  onRevisionInstructionChange: (index: number, value: string) => void;
  onRegenerateImage: (index: number) => void;
  onDelete: (index: number) => void;
};

export function Storyboard({
  steps,
  regeneratingStep,
  regenerateErrors,
  privacyAcknowledged,
  onTextChange,
  onRevisionInstructionChange,
  onRegenerateImage,
  onDelete,
}: StoryboardProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <section className="storyboard-panel" aria-labelledby="storyboard-title">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Storyboard</p>
          <h2 id="storyboard-title">AAC 카드 검토</h2>
        </div>
        <div className="storyboard-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={handlePrint}
            disabled={steps.length === 0}
          >
            인쇄
          </button>
          <span className="status-pill status-pill-green">교사 검토 필요</span>
        </div>
      </div>

      {steps.length > 0 ? (
        <div className="storyboard-grid">
          {steps.map((step, index) => (
            <AacCard
              key={step.step_number}
              step={step}
              displayNumber={index + 1}
              isRegenerating={regeneratingStep === index}
              privacyAcknowledged={privacyAcknowledged}
              error={regenerateErrors[index]}
              onTextChange={(value) => onTextChange(index, value)}
              onRevisionInstructionChange={(value) =>
                onRevisionInstructionChange(index, value)
              }
              onRegenerateImage={() => onRegenerateImage(index)}
              onDelete={() => onDelete(index)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-symbol" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>생성된 AAC 카드 초안이 여기에 표시됩니다.</p>
        </div>
      )}
    </section>
  );
}
