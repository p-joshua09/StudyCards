import type { GeneratedCardDraft } from "@/server/ai/contracts";
import type { DeckCard, DeckSummary, StudyDeck } from "./types";

const STORAGE_KEY = "studycards.demo.decks.v1";

export type DemoDeckInput = {
  sourceId: string;
  title: string;
  cards: GeneratedCardDraft[];
};

type DemoDeckResult = { ok: true; deck: StudyDeck } | { ok: false; error: string };

function isDeckCard(value: unknown): value is DeckCard {
  if (typeof value !== "object" || value === null) return false;
  const card = value as Partial<DeckCard>;
  return typeof card.id === "string" &&
    typeof card.position === "number" &&
    typeof card.front === "string" &&
    typeof card.back === "string" &&
    typeof card.sourceExcerpt === "string" &&
    Array.isArray(card.tags) && card.tags.every((tag) => typeof tag === "string");
}

function isStudyDeck(value: unknown): value is StudyDeck {
  if (typeof value !== "object" || value === null) return false;
  const deck = value as Partial<StudyDeck>;
  return typeof deck.id === "string" &&
    typeof deck.title === "string" &&
    (typeof deck.sourceId === "string" || deck.sourceId === null) &&
    typeof deck.cardCount === "number" &&
    typeof deck.createdAt === "string" &&
    typeof deck.updatedAt === "string" &&
    Array.isArray(deck.cards) && deck.cards.every(isDeckCard);
}

function readDecks(): StudyDeck[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isStudyDeck) : [];
  } catch {
    return [];
  }
}

export function getDemoDecks(): DeckSummary[] {
  return readDecks()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ id, title, sourceId, cardCount, createdAt, updatedAt }) =>
      ({ id, title, sourceId, cardCount, createdAt, updatedAt }));
}

export function getDemoDeck(id: string): StudyDeck | null {
  return readDecks().find((deck) => deck.id === id) ?? null;
}

export function saveDemoDeck(input: DemoDeckInput): DemoDeckResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Browser storage is unavailable." };
  }

  const title = input.title.trim();
  if (!title || title.length > 160) {
    return { ok: false, error: "Give this deck a title of 1 to 160 characters." };
  }
  if (!input.sourceId || input.cards.length === 0 || input.cards.length > 20) {
    return { ok: false, error: "Choose 1 to 20 approved cards before saving." };
  }
  if (input.cards.some((card) =>
    !card.front.trim() || card.front.length > 4000 ||
    !card.back.trim() || card.back.length > 8000 ||
    !Array.isArray(card.tags) || card.tags.some((tag) => typeof tag !== "string"))) {
    return { ok: false, error: "One or more cards needs a valid front and answer." };
  }

  const now = new Date().toISOString();
  const deck: StudyDeck = {
    id: crypto.randomUUID(),
    title,
    sourceId: input.sourceId,
    cardCount: input.cards.length,
    createdAt: now,
    updatedAt: now,
    cards: input.cards.map((card, position) => ({
      ...card,
      front: card.front.trim(),
      back: card.back.trim(),
      explanation: card.explanation?.trim() || undefined,
      sourceExcerpt: card.sourceExcerpt.trim(),
      tags: card.tags.map((tag) => tag.trim()).filter(Boolean),
      id: crypto.randomUUID(),
      position,
    })),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([deck, ...readDecks()]));
    return { ok: true, deck };
  } catch {
    return { ok: false, error: "Browser storage is full or unavailable. Try saving fewer cards, or connect an account." };
  }
}
