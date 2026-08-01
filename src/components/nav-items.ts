import {
  FileText,
  FolderClosed,
  Info,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Shared by the desktop rail and the mobile drawer so the two cannot drift. */
export const NAV: NavItem[] = [
  { href: "/cases", label: "Cleared cases", icon: FolderClosed },
  { href: "/analysis", label: "Run analysis", icon: Sparkles },
  { href: "/networks", label: "Networks", icon: Share2 },
  { href: "/briefs", label: "Risk briefs", icon: FileText },
];

export const SECONDARY: NavItem[] = [
  { href: "/about", label: "About this project", icon: Info },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
