import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const DEFAULT_TEXT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-nano";

export function requireOpenAiApiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return key;
}

export function createOpenAiProvider(openAiApiKey: string) {
  return createOpenAICompatible({
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
    },
  });
}
