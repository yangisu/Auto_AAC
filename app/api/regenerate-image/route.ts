import { retrieveDefaultStyleProfile } from "@/lib/grounding/retrieval";
import { jsonNoStore, publicImageError } from "@/lib/http/no-store";
import { getOpenAIClient, hasOpenAIKey, imageModel } from "@/lib/openai";
import { buildImagePrompt } from "@/lib/prompts/image-prompt";
import { RegenerateImageRequestSchema } from "@/lib/schemas";

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
    const publicError = publicImageError();
    console.error("AI image regeneration configuration error", {
      correlationId: publicError.correlationId,
      errorName: "ConfigurationError",
    });
    return jsonNoStore(publicError, { status: 500 });
  }

  const json = await request.json().catch(() => null);
  const input = RegenerateImageRequestSchema.safeParse(json);

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
    const openai = getOpenAIClient();
    const styleProfile = retrieveDefaultStyleProfile();
    const basePrompt = input.data.imagePrompt.includes("Custom AAC Style Profile")
      ? input.data.imagePrompt
      : buildImagePrompt(input.data.imagePrompt, styleProfile);
    const prompt = input.data.revisionInstruction
      ? `${basePrompt}\nTeacher revision direction: ${input.data.revisionInstruction}\nKeep the same AAC style profile and one-concept rule.`
      : basePrompt;

    const image = await openai.images.generate({
      model: imageModel,
      prompt,
      size: "1024x1024",
      quality: "low",
    });

    return jsonNoStore({
      image_url: imageDataUrl(image.data?.[0] ?? {}),
      image_prompt: prompt,
      image_style_profile: styleProfile.id,
    });
  } catch (error) {
    const publicError = publicImageError();
    console.error("AI image regeneration failed", {
      correlationId: publicError.correlationId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonNoStore(publicError, { status: 500 });
  }
}
