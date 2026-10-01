import { DeckDetail } from "@/features/decks/deck-detail";
import { getDeck } from "@/features/decks/server/queries";
import { getSource } from "@/features/library/server/queries";
import { isSupabaseConfigured } from "@/server/supabase/config";

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const configured = isSupabaseConfigured();
  const deck = configured ? await getDeck(id) : null;
  const sourceAvailable = deck?.sourceId ? Boolean(await getSource(deck.sourceId)) : false;

  return <DeckDetail id={id} configured={configured} initialDeck={deck} sourceAvailable={sourceAvailable} />;
}
