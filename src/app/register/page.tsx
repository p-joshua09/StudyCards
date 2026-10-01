import { AuthForm } from "@/features/auth/auth-form";
import { isSupabaseConfigured } from "@/server/supabase/config";

export default function RegisterPage() {
  return <AuthForm mode="register" configured={isSupabaseConfigured()} />;
}
