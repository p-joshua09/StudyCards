import { LibraryWorkspace } from "@/features/library/library-workspace";
import { getDecks } from "@/features/decks/server/queries";
import type { DeckSummary } from "@/features/decks/types";
import { getSources } from "@/features/library/server/queries";
import type { StudySource } from "@/features/library/source-types";
import { isSupabaseConfigured } from "@/server/supabase/config";

export default async function LibraryPage() {
  const configured = isSupabaseConfigured();
  const [sources, savedDecks]: [StudySource[], DeckSummary[]] = configured
    ? await Promise.all([getSources(), getDecks()])
    : [[], []];

  return <LibraryWorkspace configured={configured} initialSources={sources} initialDecks={savedDecks} />;
}
