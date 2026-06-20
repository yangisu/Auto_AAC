import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacyPage from "./page";

describe("privacy policy", () => {
  it("lists service, security, and provider abuse-monitoring purposes", () => {
    const html = renderToStaticMarkup(PrivacyPage());

    expect(html).toContain(
      "서비스 제공, 보안 유지, 제공업체의 악용 모니터링을 위해 처리합니다.",
    );
    expect(html).not.toContain("생성하는 목적으로만 사용합니다");
  });

  it("states teacher-only intended use without claiming access enforcement", () => {
    const html = renderToStaticMarkup(PrivacyPage());

    expect(html).toContain(
      "이 서비스의 의도된 사용자는 교사이며 학생의 직접 사용은 금지됩니다.",
    );
    expect(html).not.toContain("학생이 직접 사용하는 서비스가 아닙니다");
  });
});
