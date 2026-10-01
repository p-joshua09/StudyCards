import "server-only";

import type { DeckSummary, StudyDeck } from "@/features/decks/types";
import { isSourceId } from "@/features/library/server/queries";
import { isSupabaseConfigured } from "@/server/supabase/config";
import { getCurrentUser } from "@/server/supabase/current-user";
import { createClient } from "@/server/supabase/server";

type DeckListRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  deck_sources: { source_id: string }[] | null;
  cards: { count: number }[] | null;
};

type CardRow = {
  id: string;
  front: string;
  back: string;
  explanation: string | null;
  source_excerpt: string | null;
  tags: string[];
  position: number;
};

function toSummary(row: DeckListRow): DeckSummary {
  return {
    id: row.id,
    title: row.title,
    sourceId: row.deck_sources?.[0]?.source_id ?? null,
    cardCount: row.cards?.[0]?.count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getDecks(): Promise<DeckSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.from("decks")
    .select("id,title,created_at,updated_at,deck_sources(source_id),cards(count)")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .eq("cards.status", "active")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("Could not load decks", error);
    throw new Error("Could not load your decks. Please try again.");
  }

  return (data as DeckListRow[]).map(toSummary);
}

export async function getDeck(id: string): Promise<StudyDeck | null> {
  if (!isSupabaseConfigured() || !isSourceId(id)) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: deck, error: deckError } = await supabase.from("decks")
    .select("id,title,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();
  if (deckError) {
    console.error("Could not load deck", deckError);
    throw new Error("Could not load this deck. Please try again.");
  }
  if (!deck) return null;

  const [cardsResult, linksResult] = await Promise.all([
    supabase.from("cards")
      .select("id,front,back,explanation,source_excerpt,tags,position")
      .eq("deck_id", id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("position", { ascending: true }),
    supabase.from("deck_sources")
      .select("source_id")
      .eq("deck_id", id)
      .eq("user_id", user.id)
      .limit(1),
  ]);
  if (cardsResult.error || linksResult.error) {
    console.error("Could not load deck contents", cardsResult.error ?? linksResult.error);
    throw new Error("Could not load this deck's cards. Please try again.");
  }

  const cards = (cardsResult.data as CardRow[]).map((card) => ({
    id: card.id,
    front: card.front,
    back: card.back,
    explanation: card.explanation ?? undefined,
    sourceExcerpt: card.source_excerpt ?? "",
    tags: card.tags,
    position: card.position,
  }));
  return {
    id: deck.id,
    title: deck.title,
    sourceId: linksResult.data?.[0]?.source_id ?? null,
    cardCount: cards.length,
    createdAt: deck.created_at,
    updatedAt: deck.updated_at,
    cards,
  };
}
