import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { isSupabaseConfigured } from "@/server/supabase/config";
import { getCurrentUser } from "@/server/supabase/current-user";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyCards",
  description: "AI-assisted flashcards and focused study sessions.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authEnabled = isSupabaseConfigured();
  const currentUser = authEnabled ? await getCurrentUser() : null;

  return (
    <html lang="en">
      <body>
        <AppShell
          authEnabled={authEnabled}
          profileName={currentUser?.displayName}
          profileEmail={currentUser?.email}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
