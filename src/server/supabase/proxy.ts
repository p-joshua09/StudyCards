import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";

function copyAuthResponse(source: NextResponse, destination: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    destination.cookies.set(cookie);
  }

  for (const name of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(name);
    if (value) destination.headers.set(name, value);
  }

  return destination;
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  const { url, publishableKey } = getSupabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        for (const [name, value] of Object.entries(headers ?? {})) {
          response.headers.set(name, value);
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const isSignedIn = !error && typeof data?.claims?.sub === "string";
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isAuthCallback = pathname.startsWith("/auth/");

  if (!isSignedIn && !isAuthPage && !isAuthCallback) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return copyAuthResponse(response, NextResponse.redirect(loginUrl));
  }

  if (isSignedIn && isAuthPage) {
    return copyAuthResponse(response, NextResponse.redirect(new URL("/", request.url)));
  }

  return response;
}
