import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CalendarClock,
  Flame,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";
import { recentActivity, recentDecks } from "@/features/dashboard/mock-data";

export default function TodayPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Tuesday, September 22"
        title="Good afternoon, Jamie"
        description="A short review now will keep your strongest topics fresh."
        action={<Link className="button button-secondary" href="/create"><Plus size={17} /> Create study set</Link>}
      />

      <section className="study-hero">
        <div>
          <span className="hero-kicker"><Sparkles size={15} /> Today&apos;s focus</span>
          <h2>18 cards are ready for review</h2>
          <p>About 12 minutes across Biology, Networking, and Databases.</p>
          <Link href="/study/demo" className="button button-light">Start studying <ArrowRight size={17} /></Link>
        </div>
        <div className="hero-orbit" aria-hidden="true"><Brain size={66} strokeWidth={1.5} /></div>
      </section>

      <section className="stat-grid" aria-label="Study overview">
        <StatCard icon={CalendarClock} label="Due today" value="18" detail="6 more than yesterday" />
        <StatCard icon={Target} label="Retention" value="84%" detail="Up 3% this month" tone="green" />
        <StatCard icon={BookOpenCheck} label="Cards learned" value="142" detail="Across 6 active decks" tone="purple" />
        <StatCard icon={Flame} label="Study streak" value="7 days" detail="Best streak: 12 days" tone="orange" />
      </section>

      <div className="content-grid content-grid-wide">
        <section className="panel">
          <div className="section-heading">
            <div><p className="eyebrow">Continue learning</p><h2>Recent decks</h2></div>
            <Link href="/library" className="text-link">View library <ArrowRight size={15} /></Link>
          </div>
          <div className="deck-list">
            {recentDecks.map((deck) => (
              <article className="deck-row" key={deck.title}>
                <span className="deck-icon"><Brain size={19} aria-hidden="true" /></span>
                <div className="deck-copy">
                  <strong>{deck.title}</strong>
                  <span>{deck.subject} · {deck.cards} cards</span>
                </div>
                <div className="deck-progress"><ProgressBar label={`${deck.title} mastery`} value={deck.mastery} /></div>
                <span className="due-badge">{deck.due} due</span>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel">
          <div className="section-heading"><div><p className="eyebrow">Latest</p><h2>Activity</h2></div></div>
          <div className="activity-list">
            {recentActivity.map((item) => (
              <div className="activity-item" key={item.title}>
                <span className="activity-dot" />
                <div><strong>{item.title}</strong><span>{item.detail}</span></div>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
