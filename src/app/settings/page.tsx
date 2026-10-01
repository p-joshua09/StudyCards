import { Bell, Bot, Database, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default function SettingsPage() {
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Preferences" title="Settings" description="Manage study preferences and future service connections." />
      <div className="settings-layout">
        <section className="panel setting-section">
          <div className="setting-heading"><span className="icon-tile icon-blue"><Bot size={19} /></span><div><h2>AI provider</h2><p>The application will use one provider at a time through a shared adapter.</p></div></div>
          <div className="provider-row"><div><strong>Gemini</strong><span>Planned testing provider</span></div><span className="planned-badge">Planned</span></div>
          <div className="provider-row"><div><strong>DeepSeek Flash</strong><span>Planned production candidate</span></div><span className="later-badge">Later</span></div>
          <p className="security-note"><ShieldCheck size={15} /> API keys will only be read by the server and will never be placed in browser code.</p>
        </section>
        <section className="panel setting-section">
          <div className="setting-heading"><span className="icon-tile icon-purple"><Bell size={19} /></span><div><h2>Study preferences</h2><p>Default behavior for new study sessions.</p></div></div>
          <label className="setting-row"><span><strong>Daily review goal</strong><small>Target cards per day</small></span><select defaultValue="20"><option>10</option><option>20</option><option>30</option></select></label>
          <label className="setting-row"><span><strong>Show keyboard shortcuts</strong><small>Display keys during study sessions</small></span><input type="checkbox" defaultChecked /></label>
          <label className="setting-row"><span><strong>Study reminders</strong><small>Reminder support will be added later</small></span><input type="checkbox" disabled /></label>
        </section>
        <section className="panel setting-section settings-full">
          <div className="setting-heading"><span className="icon-tile icon-green"><Database size={19} /></span><div><h2>Data</h2><p>Export and account deletion will be connected after authentication and storage are added.</p></div></div>
          <div className="settings-actions"><button className="button button-secondary" type="button" disabled>Export data</button><button className="button button-danger" type="button" disabled>Delete account</button></div>
        </section>
      </div>
    </div>
  );
}
