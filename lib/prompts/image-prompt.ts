import type { AacStyleProfile } from "@/lib/grounding/retrieval";

const mandatoryAacStyle = [
  "Create a clear AAC pictogram for a student with intellectual disability.",
  "Style: simple flat vector, centered object or action, white background, thick black outline, high contrast, no text, no letters, no speech bubbles, one concept only, classroom-safe, consistent AAC symbol style.",
];

export function buildImagePrompt(
  conceptPrompt: string,
  styleProfile?: AacStyleProfile
) {
  return [
    ...mandatoryAacStyle,
    `Custom AAC Style Profile: ${styleProfile?.id ?? "auto-aac-flat-vector-card"}.`,
    styleProfile
      ? `Match these reference-derived style rules: ${[
          ...styleProfile.constraints,
          `frame: ${styleProfile.canvas.frame}`,
          `border colors: ${styleProfile.canvas.borderColors.join(" or ")}`,
          `line: ${styleProfile.line.outline}, ${styleProfile.line.weight}`,
          `composition: ${styleProfile.composition.layout}`,
          `sequence cue: ${styleProfile.composition.sequenceCue}`,
        ].join("; ")}.`
      : "Match a Korean classroom AAC card style with rounded card frame and clear line art.",
    styleProfile?.negativePrompt?.length
      ? `Avoid: ${styleProfile.negativePrompt.join("; ")}.`
      : "",
    `Concept: ${conceptPrompt}`,
  ]
    .filter(Boolean)
    .join("\n");
}
