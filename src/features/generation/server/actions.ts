"use server";

import { headers } from "next/headers";
import type { GenerateCardsInput, GenerateCardsResult } from "@/features/generation/types";
import { isSourceId, getSource } from "@/features/library/server/queries";
import { getConfiguredProviderId, getStudyAIProvider, isStudyAIConfigured } from "@/server/ai/provider";
import { isSupabaseConfigured } from "@/server/supabase/config";
import { getCurrentUser } from "@/server/supabase/current-user";
import { createClient } from "@/server/supabase/server";

const maxGenerationCharacters = 30_000;
const allowedDifficulties = new Set(["introductory", "balanced", "challenging"]);
const allowedLanguages = new Set(["English", "Filipino"]);

function isValidInput(input: GenerateCardsInput): boolean {
  return Boolean(
    input &&
    typeof input === "object" &&
    typeof input.sourceId === "string" &&
    isSourceId(input.sourceId) &&
    Number.isInteger(input.count) &&
    input.count >= 5 &&
    input.count <= 20 &&
    allowedDifficulties.has(input.difficulty) &&
    allowedLanguages.has(input.language) &&
    typeof input.includeExplanations === "boolean",
  );
}

function providerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message && error.message.length <= 300) {
    return error.message;
  }
  return "Gemini could not generate cards right now. Please try again.";
}

export async function generateCardsAction(input: GenerateCardsInput): Promise<GenerateCardsResult> {
  if (!isValidInput(input)) {
    return { ok: false, error: "Choose 5–20 cards and valid generation options." };
  }
  if (!isStudyAIConfigured()) {
    return { ok: false, error: "Add a Gemini API key on the server to enable generation." };
  }

  const configured = isSupabaseConfigured();
  let sourceText: string;
  let jobId: string | null = null;
  let userId: string | null = null;

  if (configured) {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Sign in to generate flashcards." };
    userId = user.id;

    // Never use client-supplied text for a signed-in source.
    const source = await getSource(input.sourceId);
    if (!source || source.status !== "ready" || !source.sourceText) {
      return { ok: false, error: "This source is unavailable or has no readable text." };
    }
    sourceText = source.sourceText;
    if (sourceText.trim().length < 100) {
      return { ok: false, error: "Add at least 100 characters of source text for useful flashcards." };
    }

    const supabase = await createClient();
    const { data: reservedId, error: reserveError } = await supabase.rpc("reserve_generation_job", {
      p_source_id: input.sourceId,
      p_requested_count: input.count,
      p_difficulty: input.difficulty,
      p_language: input.language,
      p_provider_id: getConfiguredProviderId(),
    });
    if (reserveError || typeof reservedId !== "string") {
      if (reserveError?.message.includes("Generation limit reached")) {
        return { ok: false, error: "You have reached the testing limit of 20 generations in 24 hours." };
      }
      console.error("Could not reserve generation job", reserveError);
      return { ok: false, error: "Could not start generation. Apply the latest database migration and try again." };
    }
    jobId = reservedId;
  } else {
    // Never expose a server-owned key from a public production demo.
    if (process.env.NODE_ENV !== "development" || process.env.LOCAL_DEMO_AI !== "true") {
      return { ok: false, error: "Connect an account, or explicitly enable local demo AI in development." };
    }
    const host = (await headers()).get("host") ?? "";
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
      return { ok: false, error: "Demo generation is available only on localhost." };
    }
    if (typeof input.demoSourceText !== "string" || input.demoSourceText.length > 200_000) {
      return { ok: false, error: "This demo source has no usable text." };
    }
    sourceText = input.demoSourceText.trim();
  }

  if (sourceText.trim().length < 100) {
    return { ok: false, error: "Add at least 100 characters of source text for useful flashcards." };
  }

  const sourceTotalCharacters = sourceText.length;
  const selectedText = sourceText.slice(0, maxGenerationCharacters);

  try {
    const provider = getStudyAIProvider();
    const set = await provider.generateStudySet({
      sourceText: selectedText,
      output: "flashcards",
      count: input.count,
      difficulty: input.difficulty,
      language: input.language,
      includeExplanations: input.includeExplanations,
    });
    if (!Array.isArray(set.cards) || set.cards.length === 0 || set.cards.length > input.count) {
      throw new Error("Gemini returned no usable cards. Try again with a different source or card count.");
    }

    if (jobId && userId) {
      const supabase = await createClient();
      const { error } = await supabase
        .from("generation_jobs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("user_id", userId);
      if (error) console.error("Could not finish generation job", error);
    }

    return {
      ok: true,
      set,
      jobId,
      sourceUsedCharacters: selectedText.length,
      sourceTotalCharacters,
    };
  } catch (error) {
    const message = providerErrorMessage(error);
    if (jobId && userId) {
      const supabase = await createClient();
      const { error: updateError } = await supabase
        .from("generation_jobs")
        .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("user_id", userId);
      if (updateError) console.error("Could not mark generation job failed", updateError);
    }
    return { ok: false, error: message };
  }
}
