import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/server/supabase/config";
import { createClient } from "@/server/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (isSupabaseConfigured() && code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(new URL("/login?message=confirmation-failed", request.url));
}
