import { GenerationWorkspace } from "@/features/generation/generation-workspace";
import { getSource } from "@/features/library/server/queries";
import { isStudyAIConfigured } from "@/server/ai/provider";
import { isSupabaseConfigured } from "@/server/supabase/config";

export default async function GeneratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const configured = isSupabaseConfigured();
  const source = configured ? await getSource(id) : null;
  const aiConfigured = isStudyAIConfigured() && (configured || process.env.NODE_ENV === "development");

  return (
    <GenerationWorkspace
      sourceId={id}
      configured={configured}
      aiConfigured={aiConfigured}
      initialSource={source}
    />
  );
}
