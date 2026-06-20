import { zodTextFormat } from "openai/helpers/zod";
import { retrieveGrounding } from "@/lib/grounding/retrieval";
import {
  jsonNoStore,
  publicGenerationError,
} from "@/lib/http/no-store";
import { getOpenAIClient, hasOpenAIKey, imageModel, textModel } from "@/lib/openai";
import { buildImagePrompt } from "@/lib/prompts/image-prompt";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts/system-prompt";
import {
  AacStructuredOutputSchema,
  GenerateRequestSchema,
} from "@/lib/schemas";

export const runtime = "nodejs";

function imageDataUrl(image: { b64_json?: string | null; url?: string | null }) {
  if (image.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }

  if (image.url) {
    return image.url;
  }

  throw new Error("Image generation returned no image data.");
}

export async function POST(request: Request) {
  if (!hasOpenAIKey()) {
    const publicError = publicGenerationError();
    console.error("AI generation configuration error", {
      correlationId: publicError.correlationId,
      errorName: "ConfigurationError",
    });
    return jsonNoStore(publicError, { status: 500 });
  }

  const json = await request.json().catch(() => null);
  const input = GenerateRequestSchema.safeParse(json);

  if (!input.success) {
    return jsonNoStore(
      {
        error: "Invalid request body.",
        details: input.error.issues.map(({ path, message }) => ({
          path,
          message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const grounding = retrieveGrounding(
      input.data.studentProfile,
      input.data.scienceText
    );
    const openai = getOpenAIClient();

    const response = await openai.responses.parse({
      model: textModel,
      store: false,
      input: [
        {
          role: "system",
          content: buildSystemPrompt(grounding),
        },
        {
          role: "user",
          content: buildUserPrompt(
            input.data.studentProfile,
            input.data.scienceText,
            input.data.requestedStepCount
          ),
        },
      ],
      text: {
        format: zodTextFormat(AacStructuredOutputSchema, "aac_storyboard"),
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      throw new Error("Structured output was empty.");
    }

    const steps = await Promise.all(
      parsed.steps.map(async (step) => {
        const prompt = buildImagePrompt(
          step.image_prompt,
          grounding.styleProfile
        );
        const image = await openai.images.generate({
          model: imageModel,
          prompt,
          size: "1024x1024",
          quality: "low",
        });

        return {
          ...step,
          image_prompt: prompt,
          image_url: imageDataUrl(image.data?.[0] ?? {}),
          image_style_profile: grounding.styleProfile.id,
        };
      })
    );

    return jsonNoStore({
      ...parsed,
      special_education_rules_used: grounding.specialEducationRules.map(
        (rule) => rule.id,
      ),
      teacher_review_required: true,
      steps,
      grounding_debug: {
        extracted_keywords: grounding.extractedKeywords,
        detected_needs: grounding.detectedNeeds,
        style_profile_id: grounding.styleProfile.id,
      },
    });
  } catch (error) {
    const publicError = publicGenerationError();
    console.error("AI generation failed", {
      correlationId: publicError.correlationId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonNoStore(publicError, { status: 500 });
  }
}
