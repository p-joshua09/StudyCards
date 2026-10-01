import { PageHeader } from "@/components/ui/page-header";
import { CreateStudySetForm } from "@/features/generation/create-study-set-form";

export default function CreatePage() {
  return (
    <div className="page-stack">
      <PageHeader eyebrow="AI workspace" title="Create a study set" description="Turn trusted source material into editable flashcards and practice questions." />
      <CreateStudySetForm />
    </div>
  );
}
