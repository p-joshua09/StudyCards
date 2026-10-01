"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";

const demoCard = {
  question: "What is the primary purpose of chlorophyll during photosynthesis?",
  answer: "Chlorophyll absorbs light energy, mainly in the blue and red wavelengths, and uses it to drive the light-dependent reactions.",
  source: "Photosynthesis Notes · page 3",
};

export function StudySession() {
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState<string | null>(null);

  return (
    <div className="study-session">
      <header className="study-header">
        <Link href="/" className="button button-secondary"><ArrowLeft size={16} /> Exit</Link>
        <div><strong>Photosynthesis</strong><span>Card 4 of 12</span></div>
        <span className="session-progress">33%</span>
      </header>
      <div className="study-progress"><span style={{ width: "33%" }} /></div>

      <main className="study-stage">
        <article className={`flashcard${revealed ? " flashcard-revealed" : ""}`}>
          <p className="eyebrow">{revealed ? "Answer" : "Question"}</p>
          <h1>{revealed ? demoCard.answer : demoCard.question}</h1>
          {revealed ? <p className="card-source">{demoCard.source}</p> : <p className="card-hint">Think of light-dependent reactions.</p>}
        </article>

        {!revealed ? (
          <button className="button button-primary reveal-button" type="button" onClick={() => setRevealed(true)}><RotateCcw size={17} /> Reveal answer <kbd>Space</kbd></button>
        ) : (
          <div className="rating-area">
            <p>How well did you remember?</p>
            <div className="rating-grid">
              {[
                ["Again", "< 1 min", "again"],
                ["Hard", "2 days", "hard"],
                ["Good", "5 days", "good"],
                ["Easy", "9 days", "easy"],
              ].map(([label, interval, id]) => <button key={id} type="button" className={`rating-button rating-${id}`} onClick={() => setRated(label)}><strong>{label}</strong><span>{interval}</span></button>)}
            </div>
          </div>
        )}
        {rated ? <p className="inline-notice" role="status">Rated “{rated}”. Scheduling will be connected in the study-engine phase.</p> : null}
      </main>
    </div>
  );
}
