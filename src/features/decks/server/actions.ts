"use server";

import { revalidatePath } from "next/cache";
import type { SaveDeckResult, SaveReviewedDeckInput } from "@/features/generation/types";
import { getSource, isSourceId } from "@/features/library/server/queries";
import { isSupabaseConfigured } from "@/server/supabase/config";
import { getCurrentUser } from "@/server/supabase/current-user";
import { createClient } from "@/server/supabase/server";

type ValidatedCard = {
  front: string;
  back: string;
  explanation: string | null;
  sourceExcerpt: string | null;
  tags: string[];
};

function validateCards(value: unknown): { cards: ValidatedCard[] } | { error: string } {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    return { error: "Keep between 1 and 20 cards in this deck." };
  }

  const cards: ValidatedCard[] = [];
  const seenFronts = new Set<string>();
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object") {
      return { error: `Card ${index + 1} is invalid.` };
    }
    const card = item as Record<string, unknown>;
    if (typeof card.front !== "string" || typeof card.back !== "string") {
      return { error: `Card ${index + 1} needs a question and answer.` };
    }
    const front = card.front.trim();
    const back = card.back.trim();
    if (front.length < 1 || front.length > 4_000 || back.length < 1 || back.length > 8_000) {
      return { error: `Card ${index + 1} has an empty or overly long question or answer.` };
    }
    const frontKey = front.toLocaleLowerCase();
    if (seenFronts.has(frontKey)) {
      return { error: `Card ${index + 1} repeats another question. Remove or edit the duplicate.` };
    }
    seenFronts.add(frontKey);

    if (card.explanation != null && typeof card.explanation !== "string") {
      return { error: `Card ${index + 1} has an invalid explanation.` };
    }
    const explanation = typeof card.explanation === "string" ? card.explanation.trim() : null;
    if (explanation && explanation.length > 8_000) {
      return { error: `Card ${index + 1} has an overly long explanation.` };
    }

    if (card.sourceExcerpt != null && typeof card.sourceExcerpt !== "string") {
      return { error: `Card ${index + 1} has an invalid source excerpt.` };
    }
    const sourceExcerpt = typeof card.sourceExcerpt === "string" ? card.sourceExcerpt.trim() : null;
    if (sourceExcerpt && sourceExcerpt.length > 500) {
      return { error: `Card ${index + 1} has an overly long source excerpt.` };
    }

    if (!Array.isArray(card.tags) || card.tags.length > 8 ||
      !card.tags.every((tag) => typeof tag === "string" && tag.trim().length <= 40)) {
      return { error: `Card ${index + 1} has invalid tags.` };
    }
    const tags = [...new Set((card.tags as string[]).map((tag) => tag.trim()).filter(Boolean))];
    cards.push({ front, back, explanation, sourceExcerpt, tags });
  }

  return { cards };
}

export async function saveReviewedDeckAction(input: SaveReviewedDeckInput): Promise<SaveDeckResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Demo decks are saved in this browser." };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save a deck." };
  if (!input || typeof input !== "object" || !isSourceId(input.sourceId)) {
    return { ok: false, error: "Choose a valid source for this deck." };
  }
  if (typeof input.title !== "string") {
    return { ok: false, error: "Give the deck a title." };
  }
  const title = input.title.trim().replace(/\s+/g, " ");
  if (title.length < 1 || title.length > 160) {
    return { ok: false, error: "Give the deck a title between 1 and 160 characters." };
  }
  const validated = validateCards(input.cards);
  if ("error" in validated) return { ok: false, error: validated.error };
  if (input.jobId != null && !isSourceId(input.jobId)) {
    return { ok: false, error: "Invalid generation reference." };
  }

  const source = await getSource(input.sourceId);
  if (!source || source.status !== "ready") {
    return { ok: false, error: "This source is unavailable. Return to the library and try again." };
  }
  const normalizedSourceText = (source.sourceText ?? "").replace(/\s+/g, " ").toLocaleLowerCase();
  const invalidExcerpt = validated.cards.findIndex((card) => card.sourceExcerpt &&
    !normalizedSourceText.includes(card.sourceExcerpt.replace(/\s+/g, " ").toLocaleLowerCase()));
  if (invalidExcerpt >= 0) {
    return { ok: false, error: `Card ${invalidExcerpt + 1} has a source reference that is not in the source. Edit or remove it.` };
  }

  const supabase = await createClient();
  const deckId = crypto.randomUUID();
  let deckCreated = false;
  try {
    const { error: deckError } = await supabase.from("decks").insert({
      id: deckId,
      user_id: user.id,
      title,
    });
    if (deckError) throw deckError;
    deckCreated = true;

    const { error: linkError } = await supabase.from("deck_sources").insert({
      user_id: user.id,
      deck_id: deckId,
      source_id: input.sourceId,
    });
    if (linkError) throw linkError;

    const { error: cardsError } = await supabase.from("cards").insert(
      validated.cards.map((card, position) => ({
        user_id: user.id,
        deck_id: deckId,
        source_id: input.sourceId,
        front: card.front,
        back: card.back,
        explanation: card.explanation,
        source_excerpt: card.sourceExcerpt,
        tags: card.tags,
        status: "active",
        position,
      })),
    );
    if (cardsError) throw cardsError;
  } catch (error) {
    console.error("Could not save reviewed deck", error);
    if (deckCreated) {
      try {
        const { error: cleanupError } = await supabase.from("decks")
          .delete().eq("id", deckId).eq("user_id", user.id);
        if (cleanupError) console.error("Could not clean up incomplete deck", cleanupError);
      } catch (cleanupError) {
        console.error("Could not clean up incomplete deck", cleanupError);
      }
    }
    return { ok: false, error: "Could not save this deck. Your reviewed cards remain on this screen; please try again." };
  }

  if (input.jobId) {
    const { error } = await supabase.from("generation_jobs")
      .update({ deck_id: deckId })
      .eq("id", input.jobId)
      .eq("user_id", user.id)
      .eq("source_id", input.sourceId)
      .eq("status", "completed");
    if (error) console.error("Could not link generation job to deck", error);
  }

  revalidatePath("/library");
  revalidatePath(`/library/sources/${input.sourceId}`);
  return { ok: true, deckId };
}
