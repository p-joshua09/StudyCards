"use client";

import { useState } from "react";
import { BookOpen, Check, ClipboardPaste, FileQuestion, Layers3, Sparkles, Upload } from "lucide-react";

const outputs = [
  { id: "flashcards", title: "Flashcards", description: "Recall-focused cards with spaced repetition.", icon: Layers3 },
  { id: "quiz", title: "Practice quiz", description: "Multiple choice and short-answer questions.", icon: FileQuestion },
  { id: "both", title: "Both", description: "Create one reusable set for both study modes.", icon: BookOpen },
] as const;

export function CreateStudySetForm() {
  const [output, setOutput] = useState<(typeof outputs)[number]["id"]>("flashcards");
  const [count, setCount] = useState(12);
  const [notice, setNotice] = useState(false);

  return (
    <div className="create-layout">
      <div className="step-list" aria-label="Creation steps">
        <div className="step-item step-active"><span>1</span><div><strong>Source</strong><small>Choose study material</small></div></div>
        <div className="step-item"><span>2</span><div><strong>Configure</strong><small>Choose what to create</small></div></div>
        <div className="step-item"><span>3</span><div><strong>Review</strong><small>Approve generated drafts</small></div></div>
      </div>

      <div className="create-main">
        <section className="panel form-section">
          <div className="section-heading"><div><p className="eyebrow">Step 1</p><h2>Add source material</h2></div></div>
          <div className="source-options">
            <button type="button" className="source-option source-option-active"><Upload size={21} /><span><strong>Upload a file</strong><small>PDF or DOCX, up to 10 MB</small></span><Check size={18} /></button>
            <button type="button" className="source-option"><ClipboardPaste size={21} /><span><strong>Paste text</strong><small>Add notes directly</small></span></button>
          </div>
          <label className="drop-zone">
            <Upload size={24} aria-hidden="true" />
            <strong>Drop a file here or browse</strong>
            <span>Files stay private to your account.</span>
            <input type="file" accept=".pdf,.docx,.txt" />
          </label>
        </section>

        <section className="panel form-section">
          <div className="section-heading"><div><p className="eyebrow">Step 2</p><h2>Choose an output</h2></div></div>
          <div className="output-grid">
            {outputs.map(({ id, title, description, icon: Icon }) => (
              <button key={id} type="button" aria-pressed={output === id} className={`output-card${output === id ? " output-card-active" : ""}`} onClick={() => setOutput(id)}>
                <Icon size={21} /><strong>{title}</strong><span>{description}</span>{output === id ? <small><Check size={14} /> Selected</small> : null}
              </button>
            ))}
          </div>

          <div className="settings-grid">
            <label><span>Number of items <strong>{count}</strong></span><input type="range" min="5" max="30" step="1" value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>
            <label><span>Difficulty</span><select defaultValue="balanced"><option value="introductory">Introductory</option><option value="balanced">Balanced</option><option value="challenging">Challenging</option></select></label>
            <label><span>Language</span><select defaultValue="english"><option value="english">English</option><option value="filipino">Filipino</option></select></label>
            <label className="checkbox-label"><input type="checkbox" defaultChecked /><span><strong>Include explanations</strong><small>Add concise reasoning to every answer.</small></span></label>
          </div>
        </section>

        <div className="generation-footer">
          <div><Sparkles size={18} /><span><strong>AI connection comes next</strong><small>The interface is ready for Gemini, then DeepSeek.</small></span></div>
          <button className="button button-primary" type="button" onClick={() => setNotice(true)}>Preview generation step <Sparkles size={16} /></button>
        </div>
        {notice ? <p className="inline-notice" role="status">Structure complete. No API request was sent.</p> : null}
      </div>
    </div>
  );
}
