"use client";

type StudentAnalysis = Record<string, string | number | boolean | null | undefined>;

type GroundingDebug = {
  extracted_keywords?: string[];
  detected_needs?: string[];
  style_profile_id?: string;
};

type ReviewToolbarProps = {
  topic?: string;
  studentAnalysis?: StudentAnalysis;
  curriculumLinks?: string[];
  rulesUsed?: string[];
  teacherReviewRequired?: boolean;
  groundingDebug?: GroundingDebug;
};

function humanizeKey(key: string) {
  return key.replace(/_/g, " ");
}

const ruleCopy: Record<string, { label: string; reason: string }> = {
  "no-text-low-reading": {
    label: "비문해/읽기 제한",
    reason: "글자 해독 부담을 줄이기 위해 이미지 안의 문자와 말풍선을 제외합니다.",
  },
  "single-focus-short-attention": {
    label: "짧은 주의집중",
    reason: "주의가 분산되지 않도록 한 카드에 하나의 사물이나 행동만 담습니다.",
  },
  "cause-effect-visual-arrow": {
    label: "인과관계 지원",
    reason: "원인과 결과를 따로 나누고 굵은 화살표로 관계를 보이게 합니다.",
  },
  "abstract-to-concrete-anchor": {
    label: "추상개념 구체화",
    reason: "추상어를 학생이 알아볼 수 있는 구체 사물과 행동으로 바꿉니다.",
  },
  "safe-neutral-affect": {
    label: "정서적 안정",
    reason: "불안을 줄이기 위해 표정과 장면을 중립적이고 예측 가능하게 제한합니다.",
  },
  "single-clause-receptive-language": {
    label: "수용언어 지원",
    reason: "언어 수용이 쉽도록 한 문장에 하나의 동작만 담은 단문으로 제한합니다.",
  },
  "working-memory-three-to-four-steps": {
    label: "작업기억 부담 완화",
    reason: "한 번에 기억할 정보를 줄이기 위해 내용을 짧은 단계로 나눕니다.",
  },
  "visual-discrimination-clean-field": {
    label: "시각 변별 지원",
    reason: "핵심 그림을 쉽게 구별하도록 흰 배경, 큰 상징, 높은 대비를 사용합니다.",
  },
  "transition-first-next-then": {
    label: "전환 예측성",
    reason: "다음 흐름을 예측할 수 있도록 처음, 다음, 결과 순서로 배열합니다.",
  },
  "core-vocabulary-repeat": {
    label: "핵심어휘 반복",
    reason: "표현을 익히기 쉽도록 받는다, 만든다 같은 쉬운 핵심어휘를 반복합니다.",
  },
};

function explainRule(rule: string) {
  return (
    ruleCopy[rule] ?? {
      label: rule,
      reason: "학생 특성과 수업 맥락에 맞춰 문장 길이와 그림 복잡도를 제한합니다.",
    }
  );
}

export function ReviewToolbar({
  topic,
  studentAnalysis,
  curriculumLinks = [],
  rulesUsed = [],
  teacherReviewRequired,
  groundingDebug,
}: ReviewToolbarProps) {
  const analysisEntries = Object.entries(studentAnalysis ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && `${value}`.trim() !== ""
  );

  return (
    <aside className="review-toolbar" aria-label="생성 결과 검토 정보">
      <div className="review-block">
        <p className="toolbar-label">주제</p>
        <strong>{topic || "초안 생성 전"}</strong>
      </div>

      <div className="review-block">
        <p className="toolbar-label">상태</p>
        <span
          className={
            teacherReviewRequired
              ? "status-pill status-pill-yellow"
              : "status-pill status-pill-blue"
          }
        >
          {teacherReviewRequired ? "교사 검토 필요" : "입력 대기"}
        </span>
      </div>

      <div className="review-block highlight-block">
        <p className="toolbar-label">변환 근거</p>
        <p className="muted-copy">
          Auto AAC는 학생 특성, 교육과정 키워드, AAC 그림 규칙을 함께 적용해
          검토 가능한 초안을 만듭니다.
        </p>
      </div>

      <div className="review-block">
        <p className="toolbar-label">학생 분석</p>
        {analysisEntries.length > 0 ? (
          <dl className="analysis-list">
            {analysisEntries.map(([key, value]) => (
              <div key={key}>
                <dt>{humanizeKey(key)}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="muted-copy">생성 후 표시됩니다.</p>
        )}
      </div>

      <div className="review-block">
        <p className="toolbar-label">교육과정 연결</p>
        {curriculumLinks.length > 0 ? (
          <ul className="chip-list">
            {curriculumLinks.map((link) => (
              <li key={link}>{link}</li>
            ))}
          </ul>
        ) : (
          <p className="muted-copy">연결 없음</p>
        )}
      </div>

      <div className="review-block">
        <p className="toolbar-label">적용된 특수교육 원리</p>
        {rulesUsed.length > 0 ? (
          <ul className="principle-list">
            {rulesUsed.map((rule) => {
              const explanation = explainRule(rule);
              return (
                <li key={rule}>
                  <strong>{explanation.label}</strong>
                  <span>{explanation.reason}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="principle-list preview-list">
            {[
              "한 카드 한 문장",
              "흰 배경과 굵은 윤곽선",
              "교사 검토 후 사용",
            ].map((item) => (
              <li key={item}>
                <strong>{item}</strong>
                <span>생성 후 실제 감지된 규칙으로 대체됩니다.</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {groundingDebug ? (
        <div className="review-block">
          <p className="toolbar-label">Grounding</p>
          <p className="muted-copy">
            {groundingDebug.style_profile_id
              ? `스타일: ${groundingDebug.style_profile_id}`
              : "스타일 정보 없음"}
          </p>
          {groundingDebug.extracted_keywords?.length ? (
            <ul className="inline-tags">
              {groundingDebug.extracted_keywords.map((keyword) => (
                <li key={keyword}>{keyword}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
