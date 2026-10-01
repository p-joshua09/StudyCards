import { Brain, CalendarDays, Flame, Target } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";

const subjects = [
  { label: "Networking", value: 90 },
  { label: "Biology", value: 84 },
  { label: "Databases", value: 78 },
  { label: "Programming", value: 73 },
  { label: "Mathematics", value: 65 },
];

export default function InsightsPage() {
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Last 30 days" title="Insights" description="See what is sticking and where your next review will help most." />
      <section className="stat-grid">
        <StatCard icon={Target} label="Retention" value="84%" detail="Up 3% this month" tone="green" />
        <StatCard icon={Brain} label="Reviews" value="186" detail="42 this week" />
        <StatCard icon={Flame} label="Study streak" value="7 days" detail="Personal best: 12" tone="orange" />
        <StatCard icon={CalendarDays} label="Next 7 days" value="63" detail="Cards scheduled" tone="purple" />
      </section>
      <div className="content-grid">
        <section className="panel">
          <div className="section-heading"><div><p className="eyebrow">Memory health</p><h2>Reviews this week</h2></div></div>
          <div className="bar-chart" aria-label="Reviews completed over the last seven days">
            {[14, 22, 18, 30, 24, 38, 28].map((value, index) => <div key={index}><span style={{ height: `${value * 2.2}px` }} /><small>{["W", "T", "F", "S", "S", "M", "T"][index]}</small></div>)}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading"><div><p className="eyebrow">By subject</p><h2>Current retention</h2></div></div>
          <div className="subject-progress">
            {subjects.map((subject) => <ProgressBar key={subject.label} {...subject} />)}
          </div>
        </section>
      </div>
      <section className="focus-callout">
        <span className="icon-tile icon-orange"><Target size={19} /></span>
        <div><p className="eyebrow">Recommended focus</p><h2>Mathematics needs a short review</h2><p>Eight cards have low retrievability. A six-minute session should bring them back on track.</p></div>
        <button className="button button-primary" type="button">Study weak cards</button>
      </section>
    </div>
  );
}
