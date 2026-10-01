import {
  BarChart3,
  Clock3,
  Home,
  Library,
  PlusCircle,
  Settings,
} from "lucide-react";

export const primaryNavigation = [
  { href: "/", label: "Today", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  { href: "/create", label: "Create", icon: PlusCircle },
  { href: "/activity", label: "Activity", icon: Clock3 },
  { href: "/insights", label: "Insights", icon: BarChart3 },
] as const;

export const secondaryNavigation = [
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
