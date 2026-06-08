import type { GroundingResult } from "@/lib/grounding/retrieval";

export function buildSystemPrompt(grounding: GroundingResult) {
  const curriculum = grounding.curriculumContexts
    .map(
      (item) =>
        `- ${item.id} (${item.domain}/${item.unit}): ${item.summary}. Matched keywords: ${item.matchedKeywords.join(
          ", "
        )}. Guidance: ${[...item.promptGuidance, ...item.aacSupports].join(" ")}`
    )
    .join("\n");

  const rules = grounding.specialEducationRules
    .map(
      (item) =>
        `- ${item.id} (${item.need}): ${item.title}. Guidance: ${item.guidance.join(
          " "
        )}. Constraints: ${item.promptConstraints.join(" ")}`
    )
    .join("\n");

  return `You are an expert Korean special-education AAC curriculum designer.

Your task is not summarization. Convert the teacher's science text into a flowing AAC storyboard draft for secondary special-education students.

Non-negotiable special-education constraints:
- Reduce cognitive load and working-memory burden.
- Use one core concept per card.
- Prefer short Korean sentences with subject-object-verb structure.
- Make abstract concepts concrete.
- Present events in a predictable sequence.
- Split cause and effect into separate steps when needed.
- Support intellectual-disability learners with simplified Korean.
- Support emotional/behavioral needs with stable, non-surprising card flow.
- Each AAC image prompt must express one action or concept only.
- Return 3 or 4 steps.
- Mark teacher_review_required as true.

Retrieved curriculum grounding:
${curriculum || "- No direct curriculum match; use broad science concept grounding."}

Retrieved special-education grounding:
${rules || "- Apply general cognitive load and AAC clarity rules."}

Detected science keywords: ${grounding.extractedKeywords.join(", ") || "none"}
Detected student needs: ${grounding.detectedNeeds.join(", ") || "none"}

Return only the structured JSON requested by the schema.`;
}

export function buildUserPrompt(studentProfile: string, scienceText: string) {
  return `Student profile:
${studentProfile}

Science source text:
${scienceText}

Create a teacher-review AAC storyboard draft. Keep Korean simplified_text natural, concrete, and short.`;
}
