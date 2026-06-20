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
  onGenerate: () => Promise<void>;
  onLoadDemo: (demoId: "photosynthesis" | "science-communication") => void;
};

type StoryboardCallbacks = {
  onRegenerateImage: (index: number) => Promise<void>;
};

let setters: ReturnType<typeof vi.fn>[];
let stateIndex: number;
let stateOverrides: Map<number, unknown>;

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

function renderHomeCallbacks() {
  const panel = findElementByType<InputPanelCallbacks>(Home(), InputPanel);
  if (!panel) {
    throw new Error("InputPanel was not rendered");
  }
  return panel.props;
}

function renderStoryboardCallbacks() {
  const storyboard = findElementByType<StoryboardCallbacks>(Home(), Storyboard);
  if (!storyboard) {
    throw new Error("Storyboard was not rendered");
  }
  return storyboard.props;
}

describe("Home privacy acknowledgement lifetime", () => {
  beforeEach(() => {
    setters = Array.from({ length: 10 }, () => vi.fn());
    stateIndex = 0;
    stateOverrides = new Map();
    reactMocks.useState.mockImplementation((initialValue: unknown) => {
      const currentIndex = stateIndex++;
      return [
        stateOverrides.has(currentIndex)
          ? stateOverrides.get(currentIndex)
          : initialValue,
        setters[currentIndex],
      ];
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears acknowledgement when the student profile changes", () => {
    renderHomeCallbacks().onStudentProfileChange("새 학습 특성");

    expect(setters[0]).toHaveBeenCalledWith("새 학습 특성");
    expect(setters[7]).toHaveBeenCalledWith(false);
  });

  it("clears acknowledgement when the science text changes", () => {
    renderHomeCallbacks().onScienceTextChange("새 수업 텍스트");

    expect(setters[1]).toHaveBeenCalledWith("새 수업 텍스트");
    expect(setters[7]).toHaveBeenCalledWith(false);
  });

  it.each(["photosynthesis", "science-communication"] as const)(
    "clears acknowledgement when loading the %s demo",
    (demoId) => {
      renderHomeCallbacks().onLoadDemo(demoId);

      expect(setters[7]).toHaveBeenCalledWith(false);
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

    await renderHomeCallbacks().onGenerate();

    expect(setters[7]).not.toHaveBeenCalled();
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
    stateOverrides.set(4, [
      {
        step_number: 1,
        simplified_text: "잎이 햇빛을 받는다.",
        image_prompt: "a leaf receives sunlight",
      },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await renderStoryboardCallbacks().onRegenerateImage(0);

    expect(setters[7]).not.toHaveBeenCalled();
  });
});
