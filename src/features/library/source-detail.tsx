"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, ArrowRight, FileText, LoaderCircle, Pencil, Save, X } from "lucide-react";
import { archiveSourceAction, renameSourceAction } from "./server/actions";
import { archiveDemoSource, getDemoSource, renameDemoSource } from "./demo-store";
import type { StudySource } from "./source-types";

type SourceDetailProps = {
  id: string;
  configured: boolean;
  initialSource: StudySource | null;
};

function describeType(sourceType: StudySource["sourceType"]) {
  return sourceType === "text" ? "Text notes" : `${sourceType.toUpperCase()} document`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function SourceDetail({ id, configured, initialSource }: SourceDetailProps) {
  const router = useRouter();
  const [source, setSource] = useState(initialSource);
  const [loaded, setLoaded] = useState(configured);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialSource?.title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (configured) return;
    const timer = window.setTimeout(() => {
      const current = getDemoSource(id);
      setSource(current);
      setTitle(current?.title ?? "");
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [configured, id]);

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!source || busy) return;
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle.length > 240) {
      setError("Give this source a title of 1 to 240 characters.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      if (configured) {
        const result = await renameSourceAction(source.id, nextTitle);
        if (!result.ok) {
          setError(result.error ?? "Could not rename this source.");
          return;
        }
        setSource({ ...source, title: nextTitle, updatedAt: new Date().toISOString() });
      } else {
        const result = renameDemoSource(source.id, nextTitle);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSource(result.source);
      }
      setEditing(false);
    } catch {
      setError("Could not rename this source. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!source || busy) return;
    if (!window.confirm(`Archive “${source.title}”? It will no longer appear in your library.`)) return;
    setError("");
    setBusy(true);
    try {
      const result = configured ? await archiveSourceAction(source.id) : archiveDemoSource(source.id);
      if (!result.ok) {
        setError(result.error ?? "Could not archive this source.");
        return;
      }
      router.push("/library");
    } catch {
      setError("Could not archive this source. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return <div className="panel source-detail-state" role="status"><LoaderCircle size={22} className="spinner" /> Loading source…</div>;
  }

  if (!source) {
    return (
      <div className="page-stack">
        <Link href="/library" className="text-link source-back-link"><ArrowLeft size={16} /> Back to library</Link>
        <div className="panel source-detail-state"><FileText size={28} /><h1>Source not found</h1><p>This source may have been archived, or it is saved in another browser.</p><Link href="/library" className="button button-primary">Go to library</Link></div>
      </div>
    );
  }

  const canGenerate = (source.sourceText?.trim().length ?? 0) >= 100;

  return (
    <div className="page-stack">
      <Link href="/library" className="text-link source-back-link"><ArrowLeft size={16} /> Back to library</Link>
      <header className="source-detail-header">
        <div className="source-detail-icon"><FileText size={28} aria-hidden="true" /></div>
        <div className="source-detail-heading">
          <p className="eyebrow">Study source</p>
          {editing ? (
            <form className="source-rename-form" onSubmit={handleRename}>
              <label className="sr-only" htmlFor="source-rename">Source title</label>
              <input id="source-rename" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} required autoFocus />
              <button className="button button-primary button-small" type="submit" disabled={busy}><Save size={15} /> Save</button>
              <button className="button button-secondary button-small" type="button" onClick={() => { setEditing(false); setTitle(source.title); setError(""); }} disabled={busy}><X size={15} /> Cancel</button>
            </form>
          ) : <h1>{source.title}</h1>}
          <p className="source-detail-meta">{describeType(source.sourceType)} · Added {formatDate(source.createdAt)} · Updated {formatDate(source.updatedAt)}</p>
        </div>
        {!editing ? <div className="source-detail-actions"><button className="button button-secondary" type="button" onClick={() => setEditing(true)} disabled={busy}><Pencil size={16} /> Rename</button><button className="button button-secondary source-archive-button" type="button" onClick={handleArchive} disabled={busy}><Archive size={16} /> Archive</button></div> : null}
      </header>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <section className="panel source-content-panel">
        <div className="section-heading"><div><p className="eyebrow">Reference material</p><h2>Source text</h2></div><span className="section-count">{source.sourceText ? `${source.sourceText.length.toLocaleString()} characters` : source.status}</span></div>
        {source.sourceText ? <div className="source-text-preview">{source.sourceText}</div> : <div className="library-empty-state"><FileText size={24} aria-hidden="true" /><strong>Text is not available yet</strong><p>{source.status === "failed" ? "This file could not be read. Try uploading another copy." : "The original document is saved, but its text has not been extracted yet."}</p></div>}
      </section>

      <section className="source-next-step">
        <div><p className="eyebrow">Next step</p><h2>Turn this into flashcards</h2><p>{canGenerate ? "Generate a draft with Gemini, then check and edit each card before saving your deck." : "Gemini needs at least 100 characters of readable source text. Add longer notes or another document to generate cards."}</p></div>
        {canGenerate ? <Link href={`/library/sources/${source.id}/generate`} className="button button-primary">Generate flashcards <ArrowRight size={16} /></Link> : <span className="ready-badge">More text needed</span>}
      </section>
    </div>
  );
}
