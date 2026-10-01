"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Sparkles } from "lucide-react";
import { signOutAction } from "@/features/auth/actions";
import { primaryNavigation, secondaryNavigation } from "@/config/navigation";
import { NavigationLink } from "./navigation-link";

type AppShellProps = {
  children: React.ReactNode;
  profileName?: string;
  profileEmail?: string | null;
  authEnabled?: boolean;
};

export function AppShell({ children, profileName = "Jamie Davis", profileEmail, authEnabled = false }: AppShellProps) {
  const pathname = usePathname();
  const focusMode = pathname.startsWith("/study/");
  const authPage = pathname === "/login" || pathname === "/register";
  const initials = profileName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  if (authPage) return <div className="auth-page-shell">{children}</div>;

  return (
    <div className={`app-shell${focusMode ? " app-shell-focus" : ""}`}>
      <aside className="sidebar" aria-label="Primary navigation">
        <Link href="/" className="brand">
          <span className="brand-mark"><BrainCircuit size={21} aria-hidden="true" /></span>
          <span><strong>StudyCards</strong><small>Learn with intention</small></span>
        </Link>

        <nav className="sidebar-nav">
          <p className="nav-kicker">Workspace</p>
          {primaryNavigation.map((item) => <NavigationLink key={item.href} {...item} />)}
        </nav>

        <div className="sidebar-bottom">
          {secondaryNavigation.map((item) => <NavigationLink key={item.href} {...item} />)}
          <div className="profile-card">
            <span className="avatar">{initials}</span>
            <span><strong>{profileName}</strong><small>{profileEmail ?? "College student"}</small></span>
            {authEnabled ? <form action={signOutAction}><button className="signout-button" type="submit">Sign out</button></form> : null}
          </div>
        </div>
      </aside>

      <div className="app-frame">
        <header className="mobile-header">
          <Link href="/" className="mobile-brand">
            <span className="brand-mark"><BrainCircuit size={18} aria-hidden="true" /></span>
            <strong>StudyCards</strong>
          </Link>
          <span className="status-pill"><Sparkles size={14} aria-hidden="true" /> Prototype</span>
        </header>
        <main className="main-content">{children}</main>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {primaryNavigation.map((item) => <NavigationLink key={item.href} {...item} compact />)}
        </nav>
      </div>
    </div>
  );
}
