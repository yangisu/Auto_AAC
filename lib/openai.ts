import OpenAI from "openai";

let client: OpenAI | null = null;

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIClient() {
  if (!hasOpenAIKey()) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
}

export const textModel = process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";
export const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
