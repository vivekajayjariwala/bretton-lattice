"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderClosed,
  Share2,
  Sparkles,
  FileText,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LatticeMark } from "@/components/lattice-mark";

const NAV = [
  { href: "/cases", label: "Cleared cases", icon: FolderClosed },
  { href: "/analysis", label: "Run analysis", icon: Sparkles },
  { href: "/networks", label: "Networks", icon: Share2 },
  { href: "/briefs", label: "Risk briefs", icon: FileText },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-[72px] items-center justify-between px-5">
        <Link href="/cases" className="flex items-center gap-2">
          <LatticeMark className="size-6 text-brand" />
          <span className="text-[17px] font-semibold tracking-[-0.01em]">
            Bretton Lattice
          </span>
        </Link>
        <PanelLeftClose className="size-4 text-muted-foreground/60" />
      </div>

      <nav className="px-3">
        <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Cross-case layer
        </p>
        <ul className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-foreground/75 hover:bg-muted",
                  )}
                >
                  <Icon className="size-[17px] shrink-0" strokeWidth={1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto p-4">
        <div className="rounded-lg border border-hairline bg-background/60 p-3">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Lattice sits on top of closed case history. It does not re-open or
            re-decide individual cases.
          </p>
        </div>
      </div>
    </aside>
  );
}
