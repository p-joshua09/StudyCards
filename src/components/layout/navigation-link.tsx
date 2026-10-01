"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

type NavigationLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  compact?: boolean;
};

export function NavigationLink({ href, label, icon: Icon, compact = false }: NavigationLinkProps) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`nav-link${active ? " nav-link-active" : ""}${compact ? " nav-link-compact" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={compact ? 20 : 19} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
