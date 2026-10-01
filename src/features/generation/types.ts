import type { GeneratedCardDraft, GeneratedStudySet } from "@/server/ai/contracts";

export type GenerationDifficulty = "introductory" | "balanced" | "challenging";
export type GenerationLanguage = "English" | "Filipino";

export type GenerateCardsInput = {
  sourceId: string;
  // Only used for the local, development-only demo. Signed-in requests re-read the source.
  demoSourceText?: string;
  count: number;
  difficulty: GenerationDifficulty;
  language: GenerationLanguage;
  includeExplanations: boolean;
};

export type GenerateCardsResult =
  | {
      ok: true;
      set: GeneratedStudySet;
      jobId: string | null;
      sourceUsedCharacters: number;
      sourceTotalCharacters: number;
    }
  | { ok: false; error: string };

export type SaveReviewedDeckInput = {
  sourceId: string;
  title: string;
  cards: GeneratedCardDraft[];
  jobId?: string | null;
};

export type SaveDeckResult =
  | { ok: true; deckId: string }
  | { ok: false; error: string };
