import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Storyboard } from "./Storyboard";

const step = {
  step_number: 1,
  simplified_text: "잎이 햇빛을 받는다.",
  image_prompt: "a leaf receives sunlight",
};

function renderStoryboard(privacyAcknowledged: boolean) {
  return renderToStaticMarkup(
    Storyboard({
      steps: [step],
      regeneratingStep: null,
      regenerateErrors: {},
      privacyAcknowledged,
      onTextChange: vi.fn(),
      onRevisionInstructionChange: vi.fn(),
      onRegenerateImage: vi.fn(),
      onDelete: vi.fn(),
    }),
  );
}

describe("Storyboard privacy acknowledgement", () => {
  it("disables image regeneration without acknowledgement", () => {
    expect(renderStoryboard(false)).toContain(
      '<button class="secondary-button" type="button" disabled="">수정 방향 반영 재생성</button>',
    );
  });

  it("enables image regeneration after acknowledgement", () => {
    expect(renderStoryboard(true)).toContain(
      '<button class="secondary-button" type="button">수정 방향 반영 재생성</button>',
    );
  });
});
