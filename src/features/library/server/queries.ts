import "server-only";

import type { StudySource, SourceStatus, SourceType } from "@/features/library/source-types";
import { isSupabaseConfigured } from "@/server/supabase/config";
import { getCurrentUser } from "@/server/supabase/current-user";
import { createClient } from "@/server/supabase/server";

type SourceRow = {
  id: string;
  title: string;
  source_type: SourceType;
  status: SourceStatus;
  source_text?: string | null;
  byte_size: number | null;
  created_at: string;
  updated_at: string;
  storage_path: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSourceId(value: string): boolean {
  return typeof value === "string" && uuidPattern.test(value);
}

function toStudySource(row: SourceRow): StudySource {
  return {
    id: row.id,
    title: row.title,
    sourceType: row.source_type,
    status: row.status,
    sourceText: row.source_text ?? null,
    byteSize: row.byte_size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    storagePath: row.storage_path,
  };
}

export async function getSources(): Promise<StudySource[]> {
  if (!isSupabaseConfigured()) return [];

  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .select("id,title,source_type,status,byte_size,created_at,updated_at,storage_path")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Could not load sources", error);
    throw new Error("Could not load your sources. Please try again.");
  }

  return (data as SourceRow[]).map(toStudySource);
}

export async function getSource(id: string): Promise<StudySource | null> {
  if (!isSupabaseConfigured() || !isSourceId(id)) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .select("id,title,source_type,status,source_text,byte_size,created_at,updated_at,storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .neq("status", "archived")
    .maybeSingle();

  if (error) {
    console.error("Could not load source", error);
    throw new Error("Could not load this source. Please try again.");
  }

  return data ? toStudySource(data as SourceRow) : null;
}
