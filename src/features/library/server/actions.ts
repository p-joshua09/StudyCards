"use server";

import { revalidatePath } from "next/cache";
import { extractSourceFile } from "@/features/library/server/extract-source";
import { isSourceId } from "@/features/library/server/queries";
import type { SourceType } from "@/features/library/source-types";
import { isSupabaseConfigured } from "@/server/supabase/config";
import { getCurrentUser } from "@/server/supabase/current-user";
import { createClient } from "@/server/supabase/server";

const maxSourceCharacters = 200_000;
const sourceBucket = "source-files";

type ActionResult = { ok: true; id: string } | { ok: false; error: string };
type PreviewResult =
  | { ok: true; text: string; sourceType: SourceType }
  | { ok: false; error: string };

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validateTitle(value: string): string | null {
  if (value.length < 1 || value.length > 240) {
    return "Give this source a title between 1 and 240 characters.";
  }
  return null;
}

function validateText(value: string): string | null {
  if (value.length < 1) return "Add some source text before saving.";
  if (value.length > maxSourceCharacters) {
    return "Source text is too long. Keep it under 200,000 characters.";
  }
  return null;
}

function contentTypeFor(sourceType: SourceType): string {
  if (sourceType === "pdf") return "application/pdf";
  if (sourceType === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "text/plain";
}

function safeExtractionError(error: unknown): string {
  return error instanceof Error ? error.message : "Could not read this file. Try another PDF, DOCX, or TXT file.";
}

export async function extractSourcePreviewAction(formData: FormData): Promise<PreviewResult> {
  // Configured accounts use saveSourceAction directly; this preview is for local demo storage.
  if (isSupabaseConfigured()) {
    return { ok: false, error: "Use your account to save this source." };
  }
  if (!(formData instanceof FormData)) {
    return { ok: false, error: "Choose a PDF, DOCX, or TXT file." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a non-empty PDF, DOCX, or TXT file." };
  }

  try {
    const extracted = await extractSourceFile(file);
    const text = extracted.text.trim();
    const textError = validateText(text);
    if (textError) return { ok: false, error: textError };
    return { ok: true, sourceType: extracted.sourceType, text };
  } catch (error) {
    return { ok: false, error: safeExtractionError(error) };
  }
}

export async function saveSourceAction(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Sources are stored in this browser while demo mode is on." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to save a source." };
  if (!(formData instanceof FormData)) {
    return { ok: false, error: "Add source material before saving." };
  }

  const title = readString(formData, "title").replace(/\s+/g, " ");
  const titleError = validateTitle(title);
  if (titleError) return { ok: false, error: titleError };

  const fileValue = formData.get("file");
  const hasFile = fileValue instanceof File && fileValue.size > 0;
  const requestedType = readString(formData, "sourceType");
  let sourceType: SourceType = "text";
  let sourceText: string;
  let byteSize: number;
  let file: File | null = null;

  if (hasFile) {
    file = fileValue;
    try {
      const extracted = await extractSourceFile(file);
      sourceType = extracted.sourceType;
      sourceText = extracted.text.trim();
    } catch (error) {
      return { ok: false, error: safeExtractionError(error) };
    }
    if (requestedType && requestedType !== sourceType) {
      return { ok: false, error: "The selected file type does not match the file." };
    }
    byteSize = file.size;
  } else {
    if (requestedType && requestedType !== "text") {
      return { ok: false, error: "Choose a file to upload." };
    }
    sourceText = readString(formData, "sourceText");
    byteSize = new TextEncoder().encode(sourceText).byteLength;
  }

  const textError = validateText(sourceText);
  if (textError) return { ok: false, error: textError };

  const supabase = await createClient();
  const id = crypto.randomUUID();
  const storagePath = file ? `${user.id}/${id}/source.${sourceType === "text" ? "txt" : sourceType}` : null;

  if (file && storagePath) {
    try {
      const { error } = await supabase.storage.from(sourceBucket).upload(storagePath, file, {
        contentType: contentTypeFor(sourceType),
        upsert: false,
      });
      if (error) {
        console.error("Could not upload source file", error);
        return { ok: false, error: "Could not upload the file. Check that the source-files storage migration is applied, then try again." };
      }
    } catch (error) {
      console.error("Could not upload source file", error);
      return { ok: false, error: "Could not upload the file. Please try again." };
    }
  }

  try {
    const { error } = await supabase.from("sources").insert({
      id,
      user_id: user.id,
      title,
      source_type: sourceType,
      status: "ready",
      source_text: sourceText,
      storage_path: storagePath,
      byte_size: byteSize,
    });
    if (error) throw error;
  } catch (error) {
    console.error("Could not save source", error);
    if (storagePath) {
      try {
        const { error: cleanupError } = await supabase.storage.from(sourceBucket).remove([storagePath]);
        if (cleanupError) console.error("Could not clean up source upload", cleanupError);
      } catch (cleanupError) {
        console.error("Could not clean up source upload", cleanupError);
      }
    }
    return { ok: false, error: "Could not save this source. Please try again." };
  }

  revalidatePath("/library");
  return { ok: true, id };
}

export async function renameSourceAction(id: string, titleInput: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Rename this source in demo mode." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to rename a source." };
  if (!isSourceId(id)) return { ok: false, error: "Invalid source." };
  if (typeof titleInput !== "string") {
    return { ok: false, error: "Give this source a valid title." };
  }

  const title = titleInput.trim().replace(/\s+/g, " ");
  const titleError = validateTitle(title);
  if (titleError) return { ok: false, error: titleError };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .update({ title })
    .eq("id", id)
    .eq("user_id", user.id)
    .neq("status", "archived")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not rename source", error);
    return { ok: false, error: "Could not rename this source. Please try again." };
  }
  if (!data) return { ok: false, error: "Source not found." };

  revalidatePath("/library");
  revalidatePath(`/library/sources/${id}`);
  return { ok: true, id };
}

export async function archiveSourceAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Archive this source in demo mode." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to archive a source." };
  if (!isSourceId(id)) return { ok: false, error: "Invalid source." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("user_id", user.id)
    .neq("status", "archived")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not archive source", error);
    return { ok: false, error: "Could not archive this source. Please try again." };
  }
  if (!data) return { ok: false, error: "Source not found." };

  revalidatePath("/library");
  revalidatePath(`/library/sources/${id}`);
  return { ok: true, id };
}
