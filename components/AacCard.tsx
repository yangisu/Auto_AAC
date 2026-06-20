"use client";

export type StoryboardStep = {
  step_number: number;
  simplified_text: string;
  image_prompt: string;
  image_url?: string;
  image_style_profile?: string;
  revision_instruction?: string;
};

type AacCardProps = {
  step: StoryboardStep;
  displayNumber: number;
  isRegenerating: boolean;
  privacyAcknowledged: boolean;
  error?: string;
  onTextChange: (value: string) => void;
  onRevisionInstructionChange: (value: string) => void;
  onRegenerateImage: () => void;
  onDelete: () => void;
};

export function AacCard({
  step,
  displayNumber,
  isRegenerating,
  privacyAcknowledged,
  error,
  onTextChange,
  onRevisionInstructionChange,
  onRegenerateImage,
  onDelete,
}: AacCardProps) {
  return (
    <article className="aac-card" aria-label={`교사용 검토 초안 ${displayNumber}`}>
      <div className="card-topline">
        <div>
          <span className="step-badge">단계 {displayNumber}</span>
          <span className="draft-label">교사용 검토 초안</span>
        </div>
        <button className="icon-button danger" type="button" onClick={onDelete}>
          삭제
        </button>
      </div>

      <div className="symbol-frame">
        {step.image_url ? (
          <img src={step.image_url} alt={`AAC symbol draft for step ${displayNumber}`} />
        ) : (
          <div className="image-placeholder">이미지 대기</div>
        )}
      </div>

      <label className="card-editor">
        <span>간단 문장</span>
        <textarea
          value={step.simplified_text}
          onChange={(event) => onTextChange(event.target.value)}
          rows={4}
        />
      </label>

      <label className="card-editor revision-editor">
        <span>재생성 수정 방향</span>
        <textarea
          value={step.revision_instruction ?? ""}
          onChange={(event) => onRevisionInstructionChange(event.target.value)}
          placeholder="예: 화살표를 더 크게, 배경은 비우고 잎만 크게"
          rows={3}
        />
      </label>

      <div className="card-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={onRegenerateImage}
          disabled={isRegenerating || !privacyAcknowledged}
        >
          {isRegenerating ? "재생성 중..." : "수정 방향 반영 재생성"}
        </button>
        {step.image_style_profile ? (
          <span className="style-note">{step.image_style_profile}</span>
        ) : null}
      </div>

      {error ? (
        <p className="card-error" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}
