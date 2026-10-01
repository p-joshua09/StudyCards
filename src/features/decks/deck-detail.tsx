"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Eye, EyeOff, FileText, LoaderCircle } from "lucide-react";
import { getDemoSource } from "@/features/library/demo-store";
import { getDemoDeck } from "./demo-store";
import type { StudyDeck } from "./types";
import styles from "./deck.module.css";

type DeckDetailProps = {
  id: string;
  configured: boolean;
  initialDeck: StudyDeck | null;
  sourceAvailable: boolean;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function DeckDetail({ id, configured, initialDeck, sourceAvailable }: DeckDetailProps) {
  const [deck, setDeck] = useState(initialDeck);
  const [loaded, setLoaded] = useState(configured);
  const [demoSourceAvailable, setDemoSourceAvailable] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);

  useEffect(() => {
    if (configured) return;
    const timer = window.setTimeout(() => {
      const savedDeck = getDemoDeck(id);
      setDeck(savedDeck);
      setDemoSourceAvailable(Boolean(savedDeck?.sourceId && getDemoSource(savedDeck.sourceId)));
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [configured, id]);

  function toggleAnswer(cardId: string) {
    setRevealed((current) => current.includes(cardId)
      ? current.filter((id) => id !== cardId)
      : [...current, cardId]);
  }

  if (!loaded) {
    return <div className={`panel ${styles.state}`} role="status"><LoaderCircle size={22} className="spinner" /> Loading deck…</div>;
  }

  if (!deck) {
    return (
      <div className="page-stack">
        <Link href="/library" className={`text-link ${styles.backLink}`}><ArrowLeft size={16} /> Back to library</Link>
        <div className={`panel ${styles.state}`}><BookOpen size={28} /><h1>Deck not found</h1><p>It may have been removed, or this demo deck is saved in another browser.</p><Link href="/library" className="button button-primary">Go to library</Link></div>
      </div>
    );
  }

  const orderedCards = [...deck.cards].sort((a, b) => a.position - b.position);
  const canViewSource = configured ? sourceAvailable : demoSourceAvailable;

  return (
    <div className="page-stack">
      <Link href="/library" className={`text-link ${styles.backLink}`}><ArrowLeft size={16} /> Back to library</Link>

      <header className={styles.header}>
        <span className={styles.headerIcon}><BookOpen size={29} aria-hidden="true" /></span>
        <div className={styles.heading}>
          <p className="eyebrow">Saved flashcards</p>
          <h1>{deck.title}</h1>
          <p>{deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"} · Created {formatDate(deck.createdAt)}</p>
        </div>
        {deck.sourceId ? canViewSource
          ? <Link href={`/library/sources/${deck.sourceId}`} className="button button-secondary"><FileText size={16} /> View source</Link>
          : <span className={styles.sourceUnavailable}><FileText size={16} aria-hidden="true" /> Source archived or unavailable</span>
          : null}
      </header>

      <section className={styles.intro} aria-label="Card viewing tip">
        <Eye size={18} aria-hidden="true" />
        <p>Read each prompt, then reveal its answer. These are your approved cards; study scheduling is not active yet.</p>
      </section>

      <section aria-labelledby="deck-cards-heading">
        <div className="section-heading">
          <div><p className="eyebrow">In this deck</p><h2 id="deck-cards-heading">Flashcards</h2></div>
          <span className="section-count">{orderedCards.length} {orderedCards.length === 1 ? "card" : "cards"}</span>
        </div>
        {orderedCards.length === 0 ? (
          <div className="library-empty-state library-empty-border"><BookOpen size={24} aria-hidden="true" /><strong>No cards in this deck</strong><p>The saved cards could not be loaded.</p></div>
        ) : (
          <div className={styles.cardList}>
            {orderedCards.map((card, index) => {
              const isRevealed = revealed.includes(card.id);
              return (
                <article className={styles.card} key={card.id}>
                  <div className={styles.cardTop}><span>Card {index + 1}</span>{card.tags.length > 0 ? <span className={styles.tag}>{card.tags[0]}</span> : null}</div>
                  <h3>{card.front}</h3>
                  <button type="button" className={`button button-soft ${styles.revealButton}`} aria-expanded={isRevealed} onClick={() => toggleAnswer(card.id)}>
                    {isRevealed ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    {isRevealed ? "Hide answer" : "Reveal answer"}
                  </button>
                  {isRevealed ? (
                    <div className={styles.answer}>
                      <p className="eyebrow">Answer</p>
                      <div className={styles.answerText}>{card.back}</div>
                      {card.explanation ? <div className={styles.explanation}><strong>Why this matters</strong><p>{card.explanation}</p></div> : null}
                      {card.sourceExcerpt ? <div className={styles.excerpt}><strong>From the source</strong><p>{card.sourceExcerpt}</p></div> : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
