"use client";

type InputPanelProps = {
  studentProfile: string;
  scienceText: string;
  requestedStepCount: number;
  isLoading: boolean;
  error: string | null;
  onStudentProfileChange: (value: string) => void;
  onScienceTextChange: (value: string) => void;
  onRequestedStepCountChange: (value: number) => void;
  onGenerate: () => void;
  onLoadDemo: (demoId: "photosynthesis" | "science-communication") => void;
};

export function InputPanel({
  studentProfile,
  scienceText,
  requestedStepCount,
  isLoading,
  error,
  onStudentProfileChange,
  onScienceTextChange,
  onRequestedStepCountChange,
  onGenerate,
  onLoadDemo,
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
          <h1 id="input-panel-title">Auto AAC</h1>
          <p className="panel-lead">
            생성용 텍스트를 학생 특성에 맞춰 분해해 AAC 카드 묶음을 생성합니다.
          </p>
        </div>
        <span className="status-pill status-pill-blue">Human-in-the-loop</span>
      </div>

      <div className="demo-strip" aria-label="시연 예시 불러오기">
        <div>
          <span className="demo-label">시연 예시</span>
          <strong>버튼 클릭 시 예시 템플릿이 입력됩니다.</strong>
        </div>
        <div className="demo-actions">
          <button
            className="demo-button"
            type="button"
            onClick={() => onLoadDemo("photosynthesis")}
            disabled={isLoading}
          >
            광합성
          </button>
          <button
            className="demo-button"
            type="button"
            onClick={() => onLoadDemo("science-communication")}
            disabled={isLoading}
          >
            과학 수업 중 의사소통
          </button>
        </div>
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
          <span>생성용 텍스트</span>
          <textarea
            value={scienceText}
            onChange={(event) => onScienceTextChange(event.target.value)}
            placeholder="AAC 카드로 만들 수업 텍스트를 붙여 넣으세요."
            rows={8}
          />
        </label>
      </div>

      <div className="input-actions">
        <div className="count-control" aria-label="생성할 AAC 카드 수">
          <span>카드 수</span>
          <button
            className="step-count-button"
            type="button"
            disabled={requestedStepCount <= 1 || isLoading}
            onClick={() => onRequestedStepCountChange(requestedStepCount - 1)}
            aria-label="AAC 카드 수 줄이기"
          >
            -
          </button>
          <strong>{requestedStepCount}</strong>
          <button
            className="step-count-button"
            type="button"
            disabled={requestedStepCount >= 4 || isLoading}
            onClick={() => onRequestedStepCountChange(requestedStepCount + 1)}
            aria-label="AAC 카드 수 늘리기"
          >
            +
          </button>
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={!canGenerate}
          onClick={onGenerate}
        >
          {isLoading ? "생성 중..." : `AAC ${requestedStepCount}개 초안 생성`}
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
