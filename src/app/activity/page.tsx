import { Filter, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { activityRows } from "@/features/activity/mock-data";

export default function ActivityPage() {
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Learning history" title="Activity" description="Review previous study sessions and practice quiz results." />
      <div className="toolbar">
        <label className="search-field"><Search size={17} /><span className="sr-only">Search activity</span><input type="search" placeholder="Search activity" /></label>
        <button className="button button-secondary" type="button"><Filter size={16} /> Filter</button>
      </div>
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Session</th><th>Mode</th><th>Subject</th><th>Result</th><th>Date</th></tr></thead>
            <tbody>
              {activityRows.map((row) => (
                <tr key={`${row.name}-${row.date}`}>
                  <td><strong>{row.name}</strong></td>
                  <td><span className="mode-badge">{row.mode}</span></td>
                  <td>{row.subject}</td>
                  <td><span className={`result result-${row.tone}`}>{row.result}</span></td>
                  <td>{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
