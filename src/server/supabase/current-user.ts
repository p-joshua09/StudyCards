import "server-only";

import { createClient } from "./server";
import { isSupabaseConfigured } from "./config";

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string") return null;

  const claims = data?.claims as Record<string, unknown>;
  const email = typeof claims.email === "string" ? claims.email : null;
  const metadata = claims.user_metadata;
  const userMetadata = metadata && typeof metadata === "object"
    ? metadata as Record<string, unknown>
    : {};
  const displayName = typeof userMetadata.display_name === "string"
    ? userMetadata.display_name
    : email?.split("@")[0] ?? "Student";

  return { id: subject, email, displayName };
}
