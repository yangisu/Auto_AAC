import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
  useState: vi.fn(),
}));

vi.mock("react", async () => ({
  ...(await vi.importActual<typeof import("react")>("react")),
  useState: reactMocks.useState,
}));

import { InputPanel } from "../components/InputPanel";
import { Storyboard } from "../components/Storyboard";
import Home from "./page";

type InputPanelCallbacks = {
  onStudentProfileChange: (value: string) => void;
  onScienceTextChange: (value: string) => void;
  onPrivacyAcknowledgedChange: (value: boolean) => void;
  onGenerate: () => Promise<void>;
  onLoadDemo: (demoId: "photosynthesis" | "science-communication") => void;
};

type StoryboardCallbacks = {
  onRevisionInstructionChange: (index: number, value: string) => void;
  onRegenerateImage: (index: number) => Promise<void>;
};

let stepsStateOverride: unknown[] | undefined;
let falseBooleanStateOverride: boolean | undefined;

function findElementByType<Props>(
  node: ReactNode,
  type: unknown,
): ReactElement<Props> | null {
  if (!isValidElement(node)) {
    return null;
  }

  if (node.type === type) {
    return node as ReactElement<Props>;
  }

  const element = node as ReactElement<{ children?: ReactNode }>;
  for (const child of Children.toArray(element.props.children)) {
    const match = findElementByType<Props>(child, type);
    if (match) {
      return match;
    }
  }

  return null;
}

function renderHomeElements() {
  const home = Home();
  const panel = findElementByType<InputPanelCallbacks>(home, InputPanel);
  if (!panel) {
    throw new Error("InputPanel was not rendered");
  }
  const storyboard = findElementByType<StoryboardCallbacks>(home, Storyboard);
  if (!storyboard) {
    throw new Error("Storyboard was not rendered");
  }
  return { inputPanel: panel.props, storyboard: storyboard.props };
}

describe("Home privacy acknowledgement lifetime", () => {
  beforeEach(() => {
    stepsStateOverride = undefined;
    falseBooleanStateOverride = undefined;
    reactMocks.useState.mockImplementation((initialValue: unknown) => {
      if (Array.isArray(initialValue) && stepsStateOverride) {
        return [stepsStateOverride, vi.fn()];
      }
      if (initialValue === false && falseBooleanStateOverride !== undefined) {
        return [falseBooleanStateOverride, vi.fn()];
      }
      return [initialValue, vi.fn()];
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears acknowledgement when the student profile changes", () => {
    const { inputPanel } = renderHomeElements();
    inputPanel.onStudentProfileChange("새 학습 특성");

    expect(inputPanel.onPrivacyAcknowledgedChange).toHaveBeenCalledWith(false);
  });

  it("clears acknowledgement when the science text changes", () => {
    const { inputPanel } = renderHomeElements();
    inputPanel.onScienceTextChange("새 수업 텍스트");

    expect(inputPanel.onPrivacyAcknowledgedChange).toHaveBeenCalledWith(false);
  });

  it.each(["photosynthesis", "science-communication"] as const)(
    "clears acknowledgement when loading the %s demo",
    (demoId) => {
      const { inputPanel } = renderHomeElements();
      inputPanel.onLoadDemo(demoId);

      expect(inputPanel.onPrivacyAcknowledgedChange).toHaveBeenCalledWith(false);
    },
  );

  it.each([
    {
      name: "successful generation",
      response: { ok: true, json: async () => ({ steps: [] }) },
    },
    {
      name: "failed generation",
      response: {
        ok: false,
        status: 500,
        json: async () => ({ error: "generation failed" }),
      },
    },
  ])("preserves acknowledgement after $name", async ({ response }) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const { inputPanel } = renderHomeElements();
    await inputPanel.onGenerate();

    expect(inputPanel.onPrivacyAcknowledgedChange).not.toHaveBeenCalled();
  });

  it("preserves acknowledgement when a revision instruction changes", () => {
    stepsStateOverride = [
      {
        step_number: 1,
        simplified_text: "잎이 햇빛을 받는다.",
        image_prompt: "a leaf receives sunlight",
      },
    ];
    const { inputPanel, storyboard } = renderHomeElements();

    storyboard.onRevisionInstructionChange(0, "화살표를 더 크게");

    expect(inputPanel.onPrivacyAcknowledgedChange).not.toHaveBeenCalled();
  });

  it("does not request image regeneration without acknowledgement", async () => {
    stepsStateOverride = [
      {
        step_number: 1,
        simplified_text: "잎이 햇빛을 받는다.",
        image_prompt: "a leaf receives sunlight",
      },
    ];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { storyboard } = renderHomeElements();
    await storyboard.onRegenerateImage(0);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "successful image regeneration",
      response: { ok: true, json: async () => ({ image_url: "new-image" }) },
    },
    {
      name: "failed image regeneration",
      response: {
        ok: false,
        status: 500,
        json: async () => ({ error: "regeneration failed" }),
      },
    },
  ])("preserves acknowledgement after $name", async ({ response }) => {
    stepsStateOverride = [
      {
        step_number: 1,
        simplified_text: "잎이 햇빛을 받는다.",
        image_prompt: "a leaf receives sunlight",
      },
    ];
    falseBooleanStateOverride = true;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const { inputPanel, storyboard } = renderHomeElements();
    await storyboard.onRegenerateImage(0);

    expect(inputPanel.onPrivacyAcknowledgedChange).not.toHaveBeenCalled();
  });
});
