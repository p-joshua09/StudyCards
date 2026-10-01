import type { AIProviderId, StudyAIProvider } from "./contracts";

export function getConfiguredProviderId(): AIProviderId {
  return process.env.AI_PROVIDER === "deepseek" ? "deepseek" : "gemini";
}

export function getStudyAIProvider(): StudyAIProvider {
  const providerId = getConfiguredProviderId();
  throw new Error(`The ${providerId} adapter has not been connected yet.`);
}
