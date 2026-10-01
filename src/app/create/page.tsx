import { PageHeader } from "@/components/ui/page-header";
import { CreateStudySetForm } from "@/features/generation/create-study-set-form";
import { isSupabaseConfigured } from "@/server/supabase/config";

export default function CreatePage() {
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Source library" title="Add study material" description="Upload a document or paste notes to prepare your source library." />
      <CreateStudySetForm configured={isSupabaseConfigured()} />
    </div>
  );
}
