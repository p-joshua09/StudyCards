import Link from "next/link";
import { BookOpen, FileText, MoreHorizontal, Plus, Search, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { decks, sources } from "@/features/library/mock-data";

export default function LibraryPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Your workspace"
        title="Library"
        description="Keep source material and study decks organized in one place."
        action={<Link href="/create" className="button button-primary"><Plus size={17} /> New study set</Link>}
      />

      <div className="toolbar">
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search library</span>
          <input type="search" placeholder="Search decks and sources" />
        </label>
        <button className="button button-secondary" type="button"><Upload size={17} /> Upload source</button>
      </div>

      <section>
        <div className="section-heading">
          <div><p className="eyebrow">Study sets</p><h2>Your decks</h2></div>
          <span className="section-count">{decks.length} decks</span>
        </div>
        <div className="deck-grid">
          {decks.map((deck) => (
            <article className="library-card" key={deck.title}>
              <div className="library-card-top">
                <span className={`deck-cover deck-cover-${deck.color}`}><BookOpen size={22} aria-hidden="true" /></span>
                <button className="icon-button" type="button" aria-label={`More actions for ${deck.title}`}><MoreHorizontal size={18} /></button>
              </div>
              <div><span className="subject-label">{deck.subject}</span><h3>{deck.title}</h3></div>
              <div className="card-metadata"><span>{deck.cards} cards</span><span>{deck.due} due</span><span>{deck.updated}</span></div>
              <Link href="/study/demo" className="button button-soft button-block">Study deck</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div><p className="eyebrow">Reference material</p><h2>Recent sources</h2></div>
          <button className="text-link" type="button">View all sources</button>
        </div>
        <div className="source-list">
          {sources.map((source) => (
            <article className="source-row" key={source.title}>
              <span className="source-icon"><FileText size={19} aria-hidden="true" /></span>
              <div><strong>{source.title}</strong><span>{source.type} · {source.subject}</span></div>
              <span className="ready-badge">{source.status}</span>
              <time>{source.updated}</time>
              <button className="button button-secondary button-small" type="button">Open</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
