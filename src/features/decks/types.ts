import type { GeneratedCardDraft } from "@/server/ai/contracts";

export type DeckCard = GeneratedCardDraft & {
  id: string;
  position: number;
};

export type DeckSummary = {
  id: string;
  title: string;
  sourceId: string | null;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StudyDeck = DeckSummary & {
  cards: DeckCard[];
};
