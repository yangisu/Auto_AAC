import { z } from "zod";

export const GenerateRequestSchema = z.object({
  studentProfile: z.string().trim().min(5),
  scienceText: z.string().trim().min(3),
});

export const RegenerateImageRequestSchema = z.object({
  imagePrompt: z.string().trim().min(10),
});

export const StudentAnalysisSchema = z.object({
  identified_reading_level: z.string(),
  applied_simplification_rule: z.string(),
});

export const AacStepSchema = z.object({
  step_number: z.number().int().min(1).max(4),
  simplified_text: z.string(),
  image_prompt: z.string(),
});

export const AacStructuredOutputSchema = z.object({
  topic: z.string(),
  student_analysis: StudentAnalysisSchema,
  steps: z.array(AacStepSchema).min(3).max(4),
  curriculum_links: z.array(z.string()),
  special_education_rules_used: z.array(z.string()),
  teacher_review_required: z.boolean(),
});

export const AacStepWithImageSchema = AacStepSchema.extend({
  image_url: z.string(),
  image_style_profile: z.string(),
});

export const AacGenerateResponseSchema = AacStructuredOutputSchema.extend({
  steps: z.array(AacStepWithImageSchema).min(3).max(4),
  grounding_debug: z.object({
    extracted_keywords: z.array(z.string()),
    detected_needs: z.array(z.string()),
    style_profile_id: z.string(),
  }),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type RegenerateImageRequest = z.infer<typeof RegenerateImageRequestSchema>;
export type AacStructuredOutput = z.infer<typeof AacStructuredOutputSchema>;
export type AacGenerateResponse = z.infer<typeof AacGenerateResponseSchema>;
export type AacStepWithImage = z.infer<typeof AacStepWithImageSchema>;
