const issuesUrl = "https://github.com/yangisu/Auto_AAC/issues";

export default function PrivacyPage() {
  return (
    <main className="policy-page">
      <article className="policy-card">
        <p className="eyebrow">Privacy</p>
        <h1>개인정보 처리 안내</h1>
        <p className="policy-intro">
          Auto AAC는 교사가 비식별 수업 정보를 이용해 AAC 초안을 만드는 도구입니다.
          아래에서 어떤 데이터가 어디로 전송되고 어떻게 처리되는지 확인할 수 있습니다.
        </p>

        <section>
          <h2>1. 서비스와 운영자</h2>
          <p>
            이 서비스의 운영자는 Auto AAC 프로젝트 운영자입니다. 개인정보 문의와
            삭제 요청은 <a href={issuesUrl}>GitHub 이슈</a>로 접수합니다. 공개 이슈에
            개인정보를 작성하지 마세요.
          </p>
        </section>

        <section>
          <h2>2. 처리하는 데이터와 목적</h2>
          <p>
            비식별 학생 학습 특성, 과학 수업 텍스트, 교사의 수정 지시, 생성 과정의
            프롬프트와 결과를 처리합니다. 이 데이터는 교사가 검토할 AAC 카드 초안을
            생성하는 목적으로만 사용합니다.
          </p>
        </section>

        <section>
          <h2>3. 처리업체와 보관</h2>
          <p>
            서비스 호스팅과 요청 처리는 Vercel을, AAC 초안 및 그림 생성은 OpenAI
            API를 이용합니다. 브라우저에 입력한 상태는 브라우저 세션이 끝나면
            유지되지 않습니다. OpenAI API 데이터는 프로젝트에 더 엄격한 보관
            통제가 승인되지 않은 경우 악용 모니터링을 위해 최대 30일 보관될 수
            있습니다. Vercel의 운영 요청 메타데이터 보관은 설정된 Vercel 계정
            정책을 따릅니다.
          </p>
        </section>

        <section>
          <h2>4. 모델 학습</h2>
          <p>
            OpenAI API로 전송된 데이터는 기본적으로 OpenAI 모델 학습에 사용되지
            않습니다.
          </p>
        </section>

        <section>
          <h2>5. 입력하면 안 되는 정보</h2>
          <p>
            학생 이름, 학교, 학번, 연락처, 주민등록번호 같은 직접 식별정보와
            의료번호 등 불필요한 의료 식별정보를 입력하지 마세요. 이 서비스는
            교사용이며 학생이 직접 사용하는 서비스가 아닙니다. 식별 가능한 아동
            데이터의 입력은 금지됩니다.
          </p>
        </section>

        <section>
          <h2>6. 권리와 삭제 요청</h2>
          <p>
            이용자는 자신의 데이터 처리에 관해 문의하거나 삭제를 요청할 수
            있습니다. <a href={issuesUrl}>GitHub 이슈</a>에는 요청 취지만 남기고,
            삭제 대상 데이터나 학생 정보는 게시하지 마세요. 운영자가 안전한 확인
            방법을 안내합니다.
          </p>
        </section>

        <section>
          <h2>7. 보안</h2>
          <p>
            전송 구간은 HTTPS로 보호하며 OpenAI API 키는 브라우저에 노출하지 않고
            서버에서만 사용합니다.
          </p>
        </section>

        <section>
          <h2>8. 시행일과 변경 안내</h2>
          <p>
            이 안내는 2026-06-20부터 시행합니다. 내용이 바뀌면 이 페이지에
            변경 내용과 새로운 시행일을 게시합니다.
          </p>
        </section>
      </article>
    </main>
  );
}
