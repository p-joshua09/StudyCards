"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, FileText, Info, Plus, Search, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getDemoDecks } from "@/features/decks/demo-store";
import type { DeckSummary } from "@/features/decks/types";
import { decks as sampleDecks } from "./mock-data";
import { getDemoSources } from "./demo-store";
import type { StudySource } from "./source-types";
import styles from "./library.module.css";

type LibraryWorkspaceProps = {
  configured: boolean;
  initialSources: StudySource[];
  initialDecks: DeckSummary[];
};

function sourceTypeLabel(sourceType: StudySource["sourceType"]) {
  return sourceType === "text" ? "Text" : sourceType.toUpperCase();
}

function shortDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed);
}

export function LibraryWorkspace({ configured, initialSources, initialDecks }: LibraryWorkspaceProps) {
  const [sources, setSources] = useState(initialSources);
  const [savedDecks, setSavedDecks] = useState(initialDecks);
  const [loaded, setLoaded] = useState(configured);
  const [demoItemCount, setDemoItemCount] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const demoSources = getDemoSources();
      const demoDecks = getDemoDecks();
      if (configured) {
        setDemoItemCount(demoSources.length + demoDecks.length);
      } else {
        setSources(demoSources);
        setSavedDecks(demoDecks);
        setLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [configured]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleSources = useMemo(() => sources.filter((source) =>
    source.title.toLocaleLowerCase().includes(normalizedQuery) ||
    source.sourceText?.toLocaleLowerCase().includes(normalizedQuery),
  ), [sources, normalizedQuery]);
  const visibleSavedDecks = useMemo(() => savedDecks.filter((deck) =>
    deck.title.toLocaleLowerCase().includes(normalizedQuery),
  ), [savedDecks, normalizedQuery]);
  const visibleSampleDecks = useMemo(() => configured ? [] : sampleDecks.filter((deck) =>
    `${deck.title} ${deck.subject}`.toLocaleLowerCase().includes(normalizedQuery),
  ), [configured, normalizedQuery]);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Your workspace"
        title="Library"
        description="Keep your source material and approved flashcard decks together."
        action={<Link href="/create" className="button button-primary"><Plus size={17} /> Add source</Link>}
      />

      {configured && demoItemCount > 0 ? (
        <aside className={styles.demoNotice} role="status">
          <Info size={20} aria-hidden="true" />
          <div>
            <strong>Browser-only demo items found</strong>
            <p>{demoItemCount} {demoItemCount === 1 ? "item remains" : "items remain"} saved in this browser. They are not synced to your account or listed below. Import is not available yet, so keep this browser’s data if you want to retain them.</p>
          </div>
        </aside>
      ) : null}

      <div className="toolbar">
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search library</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sources and decks" />
        </label>
        <Link className="button button-secondary" href="/create"><Upload size={17} /> Upload source</Link>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div><p className="eyebrow">Reference material</p><h2>Your sources</h2></div>
          <span className="section-count">{loaded ? `${visibleSources.length} ${visibleSources.length === 1 ? "source" : "sources"}` : "Loading…"}</span>
        </div>
        {!loaded ? <p className="library-state" role="status">Loading sources from this browser…</p> :
          visibleSources.length > 0 ? (
            <div className="source-list">
              {visibleSources.map((source) => (
                <article className="source-row" key={source.id}>
                  <span className="source-icon"><FileText size={19} aria-hidden="true" /></span>
                  <div><strong>{source.title}</strong><span>{sourceTypeLabel(source.sourceType)} · {source.byteSize ? `${Math.max(1, Math.round(source.byteSize / 1024))} KB` : "Pasted notes"}</span></div>
                  <span className="ready-badge">{source.status === "ready" ? "Ready" : source.status}</span>
                  <time dateTime={source.updatedAt}>{shortDate(source.updatedAt)}</time>
                  <Link className="button button-secondary button-small" href={`/library/sources/${source.id}`}>Open</Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="library-empty-state">
              <FileText size={24} aria-hidden="true" />
              <strong>{normalizedQuery ? "No matching sources" : "Your sources will appear here"}</strong>
              <p>{normalizedQuery ? "Try a different search term." : "Paste notes or upload a document to start building your library."}</p>
              {!normalizedQuery ? <Link href="/create" className="button button-soft">Add your first source</Link> : null}
            </div>
          )}
      </section>

      <section>
        <div className="section-heading">
          <div><p className="eyebrow">Study sets</p><h2>Your decks</h2></div>
          <span className="section-count">{loaded ? `${visibleSavedDecks.length} ${visibleSavedDecks.length === 1 ? "deck" : "decks"}` : "Loading…"}</span>
        </div>
        {!loaded ? <p className="library-state" role="status">Loading saved decks…</p> : visibleSavedDecks.length > 0 ? (
          <div className="deck-grid">
            {visibleSavedDecks.map((deck) => (
              <article className="library-card" key={deck.id}>
                <div className="library-card-top"><span className="deck-cover deck-cover-blue"><BookOpen size={22} aria-hidden="true" /></span><span className="library-demo-tag">Saved</span></div>
                <div><span className="subject-label">Flashcards</span><h3>{deck.title}</h3></div>
                <div className="card-metadata"><span>{deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}</span><span>Updated {shortDate(deck.updatedAt)}</span></div>
                <Link href={`/library/decks/${deck.id}`} className="button button-soft button-block">Open deck</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="library-empty-state library-empty-border"><BookOpen size={24} aria-hidden="true" /><strong>{normalizedQuery ? "No matching decks" : "Your decks will appear here"}</strong><p>{normalizedQuery ? "Try a different search term." : "Generate and approve flashcards from a source to save your first deck."}</p>{!normalizedQuery ? <Link href={sources[0] ? `/library/sources/${sources[0].id}` : "/create"} className="button button-soft">{sources.length > 0 ? "Open a source" : "Add a source"}</Link> : null}</div>
        )}
      </section>

      {!configured ? <section>
        <div className="section-heading">
          <div><p className="eyebrow">Explore</p><h2>Sample decks</h2></div>
          <span className="section-count">{visibleSampleDecks.length} examples</span>
        </div>
        {visibleSampleDecks.length > 0 ? <div className="deck-grid">
          {visibleSampleDecks.map((deck) => (
            <article className="library-card" key={deck.title}>
              <div className="library-card-top"><span className={`deck-cover deck-cover-${deck.color}`}><BookOpen size={22} aria-hidden="true" /></span><span className="library-demo-tag">Example</span></div>
              <div><span className="subject-label">{deck.subject}</span><h3>{deck.title}</h3></div>
              <div className="card-metadata"><span>{deck.cards} cards</span><span>{deck.due} due</span><span>{deck.updated}</span></div>
              <Link href="/study/demo" className="button button-soft button-block">Try sample study mode</Link>
            </article>
          ))}
        </div> : <p className="library-state">No matching sample decks.</p>}
      </section> : null}
    </div>
  );
}
