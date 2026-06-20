import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InputPanel } from "./InputPanel";

const disclosure =
  "학생 프로필과 수업 텍스트는 AAC 생성을 위해 Vercel 서버와 OpenAI로 전송됩니다. 학생 이름·학교·학번·연락처·주민등록번호·의료번호를 입력하지 마세요.";
const imageRegenerationDisclosure =
  "그림 재생성 시 이미지 프롬프트와 교사의 수정 지시도 Vercel 서버와 OpenAI로 전송됩니다.";

function renderInputPanel(privacyAcknowledged: boolean) {
  return renderToStaticMarkup(
    InputPanel({
      studentProfile: "짧은 문장과 시각 단서를 선호함",
      scienceText: "잎은 햇빛을 받아 양분을 만든다.",
      requestedStepCount: 1,
      isLoading: false,
      error: null,
      privacyAcknowledged,
      onStudentProfileChange: vi.fn(),
      onScienceTextChange: vi.fn(),
      onRequestedStepCountChange: vi.fn(),
      onPrivacyAcknowledgedChange: vi.fn(),
      onGenerate: vi.fn(),
      onLoadDemo: vi.fn(),
    }),
  );
}

describe("InputPanel privacy acknowledgement", () => {
  it("renders the data-transfer disclosure, policy link, and acknowledgement", () => {
    const html = renderInputPanel(false);

    expect(html).toContain(disclosure);
    expect(html).toContain(imageRegenerationDisclosure);
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("비식별 정보만 입력했음을 확인합니다.");
  });

  it("requires acknowledgement before generation", () => {
    expect(renderInputPanel(false)).toMatch(
      /<button class="primary-button" type="button" disabled=""/,
    );
    expect(renderInputPanel(true)).not.toMatch(
      /<button class="primary-button" type="button" disabled=""/,
    );
  });
});
