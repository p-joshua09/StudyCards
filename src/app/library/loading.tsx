import { LoaderCircle } from "lucide-react";

export default function LibraryLoading() {
  return (
    <div className="page-stack">
      <div><p className="eyebrow">Your workspace</p><h1>Library</h1></div>
      <div className="panel source-detail-state" role="status"><LoaderCircle size={23} className="spinner" /> Loading your sources…</div>
    </div>
  );
}
