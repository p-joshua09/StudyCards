export type AIProviderId = "gemini" | "deepseek";

export type StudyGenerationInput = {
  sourceText: string;
  output: "flashcards" | "quiz" | "both";
  count: number;
  difficulty: "introductory" | "balanced" | "challenging";
  language: string;
  includeExplanations: boolean;
};

export type GeneratedCardDraft = {
  front: string;
  back: string;
  explanation?: string;
  sourceExcerpt: string;
  tags: string[];
};

export type GeneratedStudySet = {
  title: string;
  cards: GeneratedCardDraft[];
};

export interface StudyAIProvider {
  readonly id: AIProviderId;
  generateStudySet(input: StudyGenerationInput): Promise<GeneratedStudySet>;
}
