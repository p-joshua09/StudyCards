"use client";

import Link from "next/link";
import { FileWarning } from "lucide-react";

export default function LibraryError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="page-stack">
      <div><p className="eyebrow">Your workspace</p><h1>Library</h1></div>
      <div className="panel source-detail-state" role="alert">
        <FileWarning size={28} />
        <h2>Could not load your sources</h2>
        <p>Please try again. Your saved material has not been changed.</p>
        <div className="source-detail-actions"><button className="button button-primary" type="button" onClick={retry}>Try again</button><Link href="/" className="button button-secondary">Go home</Link></div>
      </div>
    </div>
  );
}
