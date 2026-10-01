import { SourceDetail } from "@/features/library/source-detail";
import { getSource } from "@/features/library/server/queries";
import { isSupabaseConfigured } from "@/server/supabase/config";

export default async function SourcePage({ params }: PageProps<"/library/sources/[id]">) {
  const { id } = await params;
  const configured = isSupabaseConfigured();
  const source = configured ? await getSource(id) : null;

  return <SourceDetail id={id} configured={configured} initialSource={source} />;
}
