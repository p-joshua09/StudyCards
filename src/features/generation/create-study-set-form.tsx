"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardPaste, FileText, LoaderCircle, Upload } from "lucide-react";
import { extractSourcePreviewAction, saveSourceAction } from "@/features/library/server/actions";
import { saveDemoSource } from "@/features/library/demo-store";
import type { StudySource } from "@/features/library/source-types";

type SourceMode = "upload" | "paste";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_LENGTH = 200_000;

function fileSourceType(file: File): StudySource["sourceType"] | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || extension === "docx") return extension;
  if (extension === "txt") return "text";
  return null;
}

export function CreateStudySetForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<SourceMode>("upload");
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function selectFile(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    if (!title.trim()) setTitle(selected.name.replace(/\.[^.]+$/, ""));
    setError("");
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    selectFile(event.dataTransfer.files[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");

    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length > 240) {
      setError("Give this source a title of 1 to 240 characters.");
      return;
    }

    const formData = new FormData();
    formData.set("title", cleanTitle);
    let sourceType: StudySource["sourceType"] = "text";
    let byteSize: number | null = null;

    if (mode === "paste") {
      const cleanText = sourceText.trim();
      if (!cleanText || cleanText.length > MAX_TEXT_LENGTH) {
        setError("Paste between 1 and 200,000 characters of study material.");
        return;
      }
      formData.set("sourceType", "text");
      formData.set("sourceText", cleanText);
    } else {
      if (!file) {
        setError("Choose a PDF, DOCX, or TXT file to upload.");
        return;
      }
      const selectedType = fileSourceType(file);
      if (!selectedType) {
        setError("Choose a PDF, DOCX, or TXT file.");
        return;
      }
      if (file.size === 0 || file.size > MAX_FILE_BYTES) {
        setError("Choose a file between 1 byte and 10 MB.");
        return;
      }
      sourceType = selectedType;
      byteSize = file.size;
      formData.set("sourceType", selectedType);
      formData.set("file", file);
    }

    setBusy(true);
    try {
      if (configured) {
        const result = await saveSourceAction(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/library/sources/${result.id}`);
      } else {
        let savedText = sourceText.trim();
        if (mode === "upload") {
          const preview = await extractSourcePreviewAction(formData);
          if (!preview.ok) {
            setError(preview.error ?? "Could not read this file.");
            return;
          }
          savedText = preview.text;
          sourceType = preview.sourceType;
        }
        const result = saveDemoSource({ title: cleanTitle, sourceType, sourceText: savedText, byteSize });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/library/sources/${result.source.id}`);
      }
    } catch {
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="create-layout">
      <div className="step-list" aria-label="Creation steps">
        <div className="step-item step-active"><span>1</span><div><strong>Source</strong><small>Add study material</small></div></div>
        <div className="step-item"><span>2</span><div><strong>Generate</strong><small>Create draft cards</small></div></div>
        <div className="step-item"><span>3</span><div><strong>Review</strong><small>Approve the cards</small></div></div>
      </div>

      <form className="create-main" onSubmit={handleSubmit}>
        <section className="panel form-section">
          <div className="section-heading"><div><p className="eyebrow">Step 1</p><h2>Add source material</h2></div></div>
          <p className="source-intro">Save a source, then generate and review AI flashcards from its text. At least 100 readable characters are needed for generation.</p>
          <div className="source-options" role="group" aria-label="Source type">
            <button type="button" className={`source-option${mode === "upload" ? " source-option-active" : ""}`} aria-pressed={mode === "upload"} onClick={() => { setMode("upload"); setError(""); }}><Upload size={21} /><span><strong>Upload a file</strong><small>PDF, DOCX, or TXT · up to 10 MB</small></span>{mode === "upload" ? <Check size={18} /> : null}</button>
            <button type="button" className={`source-option${mode === "paste" ? " source-option-active" : ""}`} aria-pressed={mode === "paste"} onClick={() => { setMode("paste"); setError(""); }}><ClipboardPaste size={21} /><span><strong>Paste text</strong><small>Add notes directly</small></span>{mode === "paste" ? <Check size={18} /> : null}</button>
          </div>

          <label className="source-field">
            <span>Source title</span>
            <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} placeholder={mode === "paste" ? "e.g. Biology chapter 3 notes" : "e.g. Photosynthesis lecture notes"} required />
          </label>

          {mode === "upload" ? (
            <label className="drop-zone source-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
              {file ? <FileText size={24} aria-hidden="true" /> : <Upload size={24} aria-hidden="true" />}
              <strong>{file ? file.name : "Drop a file here or browse"}</strong>
              <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB · Choose another file to replace it` : "PDF, DOCX, or TXT · 10 MB maximum"}</span>
              <input type="file" accept=".pdf,.docx,.txt" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} aria-label="Choose source file" />
            </label>
          ) : (
            <label className="source-field source-text-field">
              <span>Study notes</span>
              <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} maxLength={MAX_TEXT_LENGTH} placeholder="Paste your lecture notes, textbook excerpt, or study guide here…" rows={12} required />
              <small>{sourceText.length.toLocaleString()} / 200,000 characters</small>
            </label>
          )}
          {!configured ? <p className="source-storage-note">Demo mode saves extracted text in this browser. Original uploaded files are not kept.</p> : null}
        </section>

        <div className="generation-footer source-save-footer">
          <div><FileText size={18} /><span><strong>Source library</strong><small>After saving, open the source to generate flashcards or manage it in your library.</small></span></div>
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spinner" /> : null}{busy ? "Saving source…" : "Save source"}</button>
        </div>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
      </form>
    </div>
  );
}
