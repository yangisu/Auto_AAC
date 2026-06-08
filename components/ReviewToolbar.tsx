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
        <p className="toolbar-label">적용 규칙</p>
        {rulesUsed.length > 0 ? (
          <ul className="rule-list">
            {rulesUsed.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        ) : (
          <p className="muted-copy">생성 후 표시됩니다.</p>
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
