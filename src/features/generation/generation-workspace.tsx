"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, LoaderCircle, MinusCircle, Plus, Sparkles, WandSparkles } from "lucide-react";
import { saveDemoDeck } from "@/features/decks/demo-store";
import { saveReviewedDeckAction } from "@/features/decks/server/actions";
import { getDemoSource } from "@/features/library/demo-store";
import type { StudySource } from "@/features/library/source-types";
import type { GeneratedCardDraft } from "@/server/ai/contracts";
import { generateCardsAction } from "./server/actions";
import type { GenerationDifficulty, GenerationLanguage } from "./types";
import styles from "./generation.module.css";

type GenerationWorkspaceProps = {
  sourceId: string;
  configured: boolean;
  aiConfigured: boolean;
  initialSource: StudySource | null;
};

type EditableCard = {
  localId: string;
  card: GeneratedCardDraft;
};

type SourceUsage = { used: number; total: number } | null;

type SessionDraft = {
  version: 1;
  title: string;
  cards: EditableCard[];
  jobId: string | null;
  sourceUsage: SourceUsage;
};

const draftKeyPrefix = "studycards.review-draft.v1.";
const maxDraftStorageChars = 500_000;

function readSessionDraft(sourceId: string): { draft: SessionDraft | null; available: boolean } {
  try {
    const raw = window.sessionStorage.getItem(`${draftKeyPrefix}${sourceId}`);
    if (!raw) return { draft: null, available: true };
    if (raw.length > maxDraftStorageChars) return { draft: null, available: false };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return { draft: null, available: true };
    const draft = value as Partial<SessionDraft>;
    if (draft.version !== 1 || typeof draft.title !== "string" || draft.title.length > 160 ||
      !Array.isArray(draft.cards) || draft.cards.length > 20 ||
      (draft.jobId !== null && (typeof draft.jobId !== "string" || draft.jobId.length > 64))) {
      return { draft: null, available: true };
    }
    if (draft.sourceUsage !== null && (!draft.sourceUsage ||
      !Number.isInteger(draft.sourceUsage.used) || !Number.isInteger(draft.sourceUsage.total) ||
      draft.sourceUsage.used < 0 || draft.sourceUsage.total < draft.sourceUsage.used || draft.sourceUsage.total > 200_000)) {
      return { draft: null, available: true };
    }
    const validCards = draft.cards.every((item) => {
      if (!item || typeof item !== "object" || typeof item.localId !== "string" || !item.card || typeof item.card !== "object") return false;
      const card = item.card;
      return typeof card.front === "string" && card.front.length <= 4000 &&
        typeof card.back === "string" && card.back.length <= 8000 &&
        (card.explanation === undefined || (typeof card.explanation === "string" && card.explanation.length <= 8000)) &&
        typeof card.sourceExcerpt === "string" && card.sourceExcerpt.length <= 500 &&
        Array.isArray(card.tags) && card.tags.length <= 8 && card.tags.every((tag) => typeof tag === "string" && tag.length <= 40);
    });
    return validCards ? { draft: draft as SessionDraft, available: true } : { draft: null, available: true };
  } catch {
    return { draft: null, available: false };
  }
}

function writeSessionDraft(sourceId: string, draft: SessionDraft): boolean {
  try {
    const serialized = JSON.stringify(draft);
    if (serialized.length > maxDraftStorageChars) return false;
    window.sessionStorage.setItem(`${draftKeyPrefix}${sourceId}`, serialized);
    return true;
  } catch {
    return false;
  }
}

function clearSessionDraft(sourceId: string) {
  try {
    window.sessionStorage.removeItem(`${draftKeyPrefix}${sourceId}`);
  } catch {
    // A successful deck save still takes precedence if browser storage is unavailable.
  }
}

const difficulties: { value: GenerationDifficulty; title: string; description: string }[] = [
  { value: "introductory", title: "Introductory", description: "Core facts and definitions" },
  { value: "balanced", title: "Balanced", description: "Recall plus understanding" },
  { value: "challenging", title: "Challenging", description: "Deeper reasoning and detail" },
];

function makeEditableCards(cards: GeneratedCardDraft[]): EditableCard[] {
  return cards.map((card) => ({ localId: crypto.randomUUID(), card }));
}

export function GenerationWorkspace({ sourceId, configured, aiConfigured, initialSource }: GenerationWorkspaceProps) {
  const router = useRouter();
  const savedRef = useRef(false);
  const [source, setSource] = useState(initialSource);
  const [sourceLoaded, setSourceLoaded] = useState(configured);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<GenerationDifficulty>("balanced");
  const [language, setLanguage] = useState<GenerationLanguage>("English");
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [cards, setCards] = useState<EditableCard[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [sourceUsage, setSourceUsage] = useState<SourceUsage>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftStorageStatus, setDraftStorageStatus] = useState<"saved" | "failed">("saved");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errorScope, setErrorScope] = useState<"generate" | "save">("generate");

  useEffect(() => {
    if (configured) return;
    const timer = window.setTimeout(() => {
      setSource(getDemoSource(sourceId));
      setSourceLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [configured, sourceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readSessionDraft(sourceId);
      if (stored.draft) {
        setCards(stored.draft.cards);
        setDeckTitle(stored.draft.title);
        setJobId(stored.draft.jobId);
        setSourceUsage(stored.draft.sourceUsage);
        setHasGenerated(true);
        setDraftRestored(true);
      }
      if (!stored.available) setDraftStorageStatus("failed");
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sourceId]);

  useEffect(() => {
    if (!draftReady || !hasGenerated || savedRef.current) return;
    const stored = writeSessionDraft(sourceId, {
      version: 1,
      title: deckTitle,
      cards,
      jobId,
      sourceUsage,
    });
    const timer = window.setTimeout(() => setDraftStorageStatus(stored ? "saved" : "failed"), 0);
    return () => window.clearTimeout(timer);
  }, [cards, deckTitle, draftReady, hasGenerated, jobId, sourceId, sourceUsage]);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!source || !aiConfigured || generating || saving) return;
    setErrorScope("generate");
    const readableText = source.sourceText?.trim() ?? "";
    if (readableText.length < 100) {
      setError("Add a source with at least 100 characters of readable text to generate useful cards.");
      return;
    }
    if (!Number.isInteger(count) || count < 5 || count > 20) {
      setError("Choose a whole number of cards between 5 and 20.");
      return;
    }
    if (hasGenerated && !window.confirm("Replace your current draft? Unsaved edits will be lost.")) return;

    setGenerating(true);
    setError("");
    try {
      const result = await generateCardsAction({
        sourceId,
        demoSourceText: configured ? undefined : readableText,
        count,
        difficulty,
        language,
        includeExplanations,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.set.cards.length) {
        setError("Gemini did not return any cards. Try a different source or settings.");
        return;
      }
      setCards(makeEditableCards(result.set.cards));
      setHasGenerated(true);
      setDraftRestored(false);
      setDeckTitle(result.set.title.trim().slice(0, 160) || `${source.title} flashcards`);
      setJobId(result.jobId);
      setSourceUsage({ used: result.sourceUsedCharacters, total: result.sourceTotalCharacters });
      window.setTimeout(() => document.getElementById("review-draft")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setError("Generation could not complete. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function updateCard(localId: string, field: "front" | "back" | "explanation" | "sourceExcerpt", value: string) {
    setCards((current) => current.map((item) => item.localId === localId
      ? { ...item, card: {
        ...item.card,
        [field]: value,
        ...(field === "front" || field === "back" ? { sourceExcerpt: "" } : {}),
      } }
      : item));
  }

  function addCard() {
    if (cards.length >= 20) return;
    setCards((current) => [...current, {
      localId: crypto.randomUUID(),
      card: { front: "", back: "", explanation: "", sourceExcerpt: "", tags: [] },
    }]);
  }

  async function handleSave() {
    if (!source || generating || saving) return;
    setErrorScope("save");
    const cleanTitle = deckTitle.trim();
    if (!cleanTitle || cleanTitle.length > 160) {
      setError("Give your deck a title of 1 to 160 characters.");
      return;
    }
    if (cards.length < 1 || cards.length > 20) {
      setError("Keep between 1 and 20 cards in your reviewed deck.");
      return;
    }
    const reviewedCards = cards.map(({ card }) => ({
      ...card,
      front: card.front.trim(),
      back: card.back.trim(),
      explanation: card.explanation?.trim() || undefined,
    }));
    if (reviewedCards.some((card) => !card.front || !card.back || card.front.length > 4000 || card.back.length > 8000 || (card.explanation?.length ?? 0) > 8000)) {
      setError("Each card needs a front and back. Keep fronts under 4,000 characters and backs or explanations under 8,000.");
      return;
    }
    const seenQuestions = new Set<string>();
    for (const [index, card] of reviewedCards.entries()) {
      const question = card.front.toLocaleLowerCase();
      if (seenQuestions.has(question)) {
        setError(`Card ${index + 1} repeats another question. Edit or remove the duplicate before saving.`);
        return;
      }
      seenQuestions.add(question);
    }

    setSaving(true);
    setError("");
    try {
      if (configured) {
        const result = await saveReviewedDeckAction({ sourceId, title: cleanTitle, cards: reviewedCards, jobId });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        savedRef.current = true;
        clearSessionDraft(sourceId);
        router.push(`/library/decks/${result.deckId}`);
      } else {
        const result = saveDemoDeck({ sourceId, title: cleanTitle, cards: reviewedCards });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        savedRef.current = true;
        clearSessionDraft(sourceId);
        router.push(`/library/decks/${result.deck.id}`);
      }
    } catch {
      setError("The deck could not be saved. Your draft is still here; please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!sourceLoaded) {
    return <div className={styles.loadingState} role="status"><LoaderCircle className={styles.spinner} size={22} /> Loading source…</div>;
  }

  if (!source) {
    return (
      <div className={styles.page}>
        <Link href="/library" className={styles.backLink}><ArrowLeft size={16} /> Back to library</Link>
        <div className={styles.emptyState}><FileText size={30} /><h1>Source not found</h1><p>It may have been archived or saved in another browser.</p><Link href="/library" className="button button-primary">Go to library</Link></div>
      </div>
    );
  }

  const canGenerate = aiConfigured && (source.sourceText?.trim().length ?? 0) >= 100 && !generating && !saving;

  return (
    <div className={styles.page}>
      <Link href={`/library/sources/${sourceId}`} className={styles.backLink}><ArrowLeft size={16} /> Back to source</Link>

      <header className={styles.hero}>
        <div className={styles.heroIcon}><WandSparkles size={25} aria-hidden="true" /></div>
        <div>
          <p className="eyebrow">Step 2 · Generate</p>
          <h1>Make flashcards from your source</h1>
          <p>Choose how to study <strong>{source.title}</strong>, then review every AI draft before saving.</p>
        </div>
      </header>

      <div className={styles.layout}>
        <form className={styles.settings} onSubmit={handleGenerate}>
          <div className={styles.sectionHeading}><div><p className="eyebrow">Generation settings</p><h2>Shape your cards</h2></div><Sparkles size={19} aria-hidden="true" /></div>
          <label className={styles.field} htmlFor="card-count"><span>Number of cards</span><input id="card-count" type="number" min={5} max={20} step={1} value={count} onChange={(event) => setCount(Number(event.target.value))} disabled={generating || saving} /><small>Between 5 and 20 cards</small></label>

          <fieldset className={styles.difficultyFieldset} disabled={generating || saving}>
            <legend>Difficulty</legend>
            <div className={styles.difficultyOptions}>
              {difficulties.map((option) => <label className={`${styles.difficultyOption} ${difficulty === option.value ? styles.difficultySelected : ""}`} key={option.value}>
                <input type="radio" name="difficulty" value={option.value} checked={difficulty === option.value} onChange={() => setDifficulty(option.value)} />
                <span><strong>{option.title}</strong><small>{option.description}</small></span>
                {difficulty === option.value ? <Check size={17} aria-hidden="true" /> : null}
              </label>)}
            </div>
          </fieldset>

          <label className={styles.field} htmlFor="card-language"><span>Language</span><select id="card-language" value={language} onChange={(event) => setLanguage(event.target.value as GenerationLanguage)} disabled={generating || saving}><option value="English">English</option><option value="Filipino">Filipino</option></select></label>

          <label className={styles.toggle}><input type="checkbox" checked={includeExplanations} onChange={(event) => setIncludeExplanations(event.target.checked)} disabled={generating || saving} /><span><strong>Include explanations</strong><small>Add a brief reason behind each answer.</small></span></label>

          <div className={styles.sourceNotice}><FileText size={18} aria-hidden="true" /><p>Gemini receives up to the first 30,000 characters of this source. Its draft can be wrong, so check facts against the source before saving.</p></div>
          <p className={styles.privacyNote}>On Gemini’s free tier, submitted content may be used to improve Google’s products. Avoid sensitive material while testing. <a href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noopener noreferrer">Learn about data use</a>.</p>
          {!aiConfigured ? <div className={styles.setupNotice} role="status"><strong>Gemini setup needed</strong><p>Add a server-only <code>GEMINI_API_KEY</code> to <code>.env.local</code>. For a local demo without Supabase, also set <code>LOCAL_DEMO_AI=true</code>. Restart the app after changing these values; a deployed app needs Supabase.</p></div> : null}
          {aiConfigured && (source.sourceText?.trim().length ?? 0) < 100 ? <div className={styles.setupNotice} role="status"><strong>More text needed</strong><p>Gemini needs at least 100 characters of readable text. Add a longer source to continue.</p></div> : null}
          <button className="button button-primary" type="submit" disabled={!canGenerate}>{generating ? <LoaderCircle size={17} className={styles.spinner} /> : <Sparkles size={17} />}{generating ? "Generating cards…" : hasGenerated ? "Regenerate draft" : "Generate flashcards"}</button>
        </form>

        <aside className={styles.sourceAside} aria-label="Source preview">
          <div className={styles.sectionHeading}><div><p className="eyebrow">Your material</p><h2>{source.title}</h2></div></div>
          <p>{source.sourceText ? `${source.sourceText.length.toLocaleString()} characters available` : "No extracted text available"}</p>
          <div className={styles.sourceExcerpt}>{source.sourceText?.slice(0, 1100) || "Text is not available for this source."}{source.sourceText && source.sourceText.length > 1100 ? "…" : ""}</div>
          <Link href={`/library/sources/${sourceId}`} className={styles.sourceLink}>View full source <ArrowRight size={15} /></Link>
        </aside>
      </div>

      {error && errorScope === "generate" ? <div className={styles.error} role="alert">{error}</div> : null}

      {hasGenerated ? (
        <section id="review-draft" className={styles.review} aria-labelledby="review-heading">
          <div className={styles.reviewHeading}>
            <div><p className="eyebrow">Step 3 · Review</p><h2 id="review-heading">Review your draft</h2><p>Read, correct, or remove cards before adding them to your library.</p></div>
            <span className={styles.countBadge}>{cards.length} {cards.length === 1 ? "card" : "cards"}</span>
          </div>
          <p className={draftStorageStatus === "failed" ? styles.draftStorageFailed : styles.draftStorageNote} role="status">
            {draftStorageStatus === "failed"
              ? "This draft could not be saved in this tab. Keep this page open or save your deck now."
              : draftRestored
                ? "Unsaved draft restored from this tab. Drafts are not synced to other tabs or devices."
                : "Unsaved draft kept in this tab only. It is not synced to other tabs or devices."}
          </p>
          {sourceUsage ? <p className={styles.usageNote}>Generated from {sourceUsage.used.toLocaleString()} of {sourceUsage.total.toLocaleString()} source characters{sourceUsage.used < sourceUsage.total ? " (the rest was not sent)" : ""}.</p> : null}
          <label className={styles.titleField} htmlFor="deck-title"><span>Deck title</span><input id="deck-title" type="text" maxLength={160} value={deckTitle} onChange={(event) => setDeckTitle(event.target.value)} disabled={saving} /></label>

          {cards.length === 0 ? <p className={styles.noCards}>All draft cards were removed. Add a card below or regenerate a new draft.</p> : null}
          <div className={styles.cards}>
            {cards.map((item, index) => <article className={styles.card} key={item.localId}>
              <div className={styles.cardHeader}><span>Card {index + 1}</span><button type="button" onClick={() => setCards((current) => current.filter((candidate) => candidate.localId !== item.localId))} disabled={saving} aria-label={`Remove card ${index + 1}`}><MinusCircle size={16} /> Remove</button></div>
              <div className={styles.cardFields}>
                <label><span>Front / question</span><textarea value={item.card.front} onChange={(event) => updateCard(item.localId, "front", event.target.value)} maxLength={4000} rows={3} disabled={saving} /></label>
                <label><span>Back / answer</span><textarea value={item.card.back} onChange={(event) => updateCard(item.localId, "back", event.target.value)} maxLength={8000} rows={4} disabled={saving} /></label>
                <label className={styles.fullWidth}><span>Explanation <small>(optional)</small></span><textarea value={item.card.explanation ?? ""} onChange={(event) => updateCard(item.localId, "explanation", event.target.value)} maxLength={8000} rows={2} disabled={saving} /></label>
                <label className={styles.fullWidth}><span>Source reference <small>(optional)</small></span><textarea value={item.card.sourceExcerpt} onChange={(event) => updateCard(item.localId, "sourceExcerpt", event.target.value)} maxLength={500} rows={2} disabled={saving} /><small className={styles.referenceHint}>Editing the question or answer clears this reference. Include it only after checking the source.</small></label>
              </div>
            </article>)}
          </div>

          {error && errorScope === "save" ? <div className={styles.error} role="alert">{error}</div> : null}
          <div className={styles.reviewFooter}>
            <button className="button button-secondary" type="button" onClick={addCard} disabled={saving || cards.length >= 20}><Plus size={16} /> Add card</button>
            <button className="button button-primary" type="button" onClick={handleSave} disabled={saving || generating || cards.length === 0}>{saving ? <LoaderCircle size={17} className={styles.spinner} /> : <Check size={17} />}{saving ? "Saving deck…" : "Save reviewed deck"}</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
