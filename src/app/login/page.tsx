import { AuthForm } from "@/features/auth/auth-form";
import { isSupabaseConfigured } from "@/server/supabase/config";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message: code } = await searchParams;
  const message = code === "confirmation-failed"
    ? "That confirmation link could not be verified. Try registering again or request a new email link."
    : undefined;
  return <AuthForm mode="login" configured={isSupabaseConfigured()} message={message} />;
}
