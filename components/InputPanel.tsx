"use client";

type InputPanelProps = {
  studentProfile: string;
  scienceText: string;
  isLoading: boolean;
  error: string | null;
  onStudentProfileChange: (value: string) => void;
  onScienceTextChange: (value: string) => void;
  onGenerate: () => void;
};

export function InputPanel({
  studentProfile,
  scienceText,
  isLoading,
  error,
  onStudentProfileChange,
  onScienceTextChange,
  onGenerate,
}: InputPanelProps) {
  const canGenerate =
    studentProfile.trim().length >= 5 &&
    scienceText.trim().length >= 3 &&
    !isLoading;

  return (
    <section className="input-panel" aria-labelledby="input-panel-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Teacher workspace</p>
          <h1 id="input-panel-title">Auto AAC 검토 도구</h1>
        </div>
        <span className="status-pill status-pill-blue">초안 생성</span>
      </div>

      <div className="field-grid">
        <label className="text-field">
          <span>학생 프로필</span>
          <textarea
            value={studentProfile}
            onChange={(event) => onStudentProfileChange(event.target.value)}
            placeholder="예: 초등 5학년, 짧은 문장 선호, 추상어 어려움, 시각 단서에 잘 반응함"
            rows={8}
          />
        </label>

        <label className="text-field">
          <span>과학 원문</span>
          <textarea
            value={scienceText}
            onChange={(event) => onScienceTextChange(event.target.value)}
            placeholder="수업에서 다룰 과학 텍스트를 붙여 넣으세요."
            rows={8}
          />
        </label>
      </div>

      <div className="input-actions">
        <button
          className="primary-button"
          type="button"
          disabled={!canGenerate}
          onClick={onGenerate}
        >
          {isLoading ? "생성 중..." : "AAC 초안 생성"}
        </button>
        <p className="helper-copy">
          생성 결과는 수업 적용 전 교사가 문장, 순서, 그림 적합성을 검토해야
          합니다.
        </p>
      </div>

      {error ? (
        <div className="error-banner" role="alert">
          {error}
        </div>
      ) : null}
    </section>
  );
}
