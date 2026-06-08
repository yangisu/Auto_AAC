import { NextResponse } from "next/server";
import { retrieveDefaultStyleProfile } from "@/lib/grounding/retrieval";
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
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Rotate any exposed key and add a safe key to .env.local.",
      },
      { status: 500 }
    );
  }

  const json = await request.json().catch(() => null);
  const input = RegenerateImageRequestSchema.safeParse(json);

  if (!input.success) {
    return NextResponse.json(
      { error: "Invalid request body.", details: input.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const openai = getOpenAIClient();
    const styleProfile = retrieveDefaultStyleProfile();
    const prompt = input.data.imagePrompt.includes("Custom AAC Style Profile")
      ? input.data.imagePrompt
      : buildImagePrompt(input.data.imagePrompt, styleProfile);

    const image = await openai.images.generate({
      model: imageModel,
      prompt,
      size: "1024x1024",
      quality: "low",
    });

    return NextResponse.json({
      image_url: imageDataUrl(image.data?.[0] ?? {}),
      image_prompt: prompt,
      image_style_profile: styleProfile.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown image generation error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
