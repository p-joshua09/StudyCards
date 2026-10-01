import "server-only";

import type { AIProviderId, StudyAIProvider } from "./contracts";
import { geminiProvider } from "./gemini";

export function getConfiguredProviderId(): AIProviderId {
  return process.env.AI_PROVIDER === "deepseek" ? "deepseek" : "gemini";
}

export function getStudyAIProvider(): StudyAIProvider {
  const providerId = getConfiguredProviderId();
  if (providerId === "gemini") {
    return geminiProvider;
  }
  throw new Error("The DeepSeek adapter has not been connected yet. Select Gemini for now.");
}

export function isStudyAIConfigured(): boolean {
  return getConfiguredProviderId() === "gemini" && Boolean(process.env.GEMINI_API_KEY?.trim());
}
