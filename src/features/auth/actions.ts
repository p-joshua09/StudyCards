"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/server/supabase/config";
import { createClient } from "@/server/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function readString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readPassword(formData: FormData) {
  const value = formData.get("password");
  return typeof value === "string" ? value : "";
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function signInAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Connect a Supabase project to enable sign in. The prototype is still available in demo mode." };
  }

  const email = readString(formData, "email").toLowerCase();
  const password = readPassword(formData);

  if (!validEmail(email) || password.length < 8) {
    return { error: "Enter a valid email and a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "We could not sign you in. Check your details and try again." };

  redirect("/");
}

export async function signUpAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Connect a Supabase project to create an account. The prototype is still available in demo mode." };
  }

  const displayName = readString(formData, "displayName");
  const email = readString(formData, "email").toLowerCase();
  const password = readPassword(formData);

  if (displayName.length < 2 || displayName.length > 80) {
    return { error: "Enter a name between 2 and 80 characters." };
  }
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Choose a password with at least 8 characters." };

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: new URL("/auth/confirm", appUrl).toString(),
    },
  });

  if (error) return { error: "We could not create your account. Check your details and try again." };
  if (data.session) redirect("/");

  return { success: "Check your email for a confirmation link, then sign in." };
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
