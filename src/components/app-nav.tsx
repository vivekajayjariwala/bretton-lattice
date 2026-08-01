"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FileText,
  FolderClosed,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LatticeMark } from "@/components/lattice-mark";

const NAV = [
  { href: "/cases", label: "Cleared cases", icon: FolderClosed },
  { href: "/analysis", label: "Run analysis", icon: Sparkles },
  { href: "/networks", label: "Networks", icon: Share2 },
  { href: "/briefs", label: "Risk briefs", icon: FileText },
];

const SECONDARY = [{ href: "/about", label: "About this project", icon: Info }];

const STORAGE_KEY = "lattice:nav-collapsed";

export function AppNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Restore the last state after mount so the server render stays stable.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const renderItem = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: typeof Info;
  }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <li key={href}>
        <Link
          href={href}
          title={collapsed ? label : undefined}
          className={cn(
            "flex items-center rounded-lg text-[14px] transition-colors",
            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
            active
              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              : "text-foreground/75 hover:bg-muted",
          )}
        >
          <Icon
            className={cn(
              "size-[17px] shrink-0",
              active ? "text-brand" : "text-brand/70",
            )}
            strokeWidth={1.75}
          />
          {!collapsed && label}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={cn(
        // self-start stops the flex parent stretching the nav to the full page
        // height, which on long pages pushed the footer links off screen.
        "sticky top-0 hidden h-screen shrink-0 flex-col self-start overflow-y-auto",
        "border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-[272px]",
      )}
    >
      <div
        className={cn(
          "flex h-[72px] shrink-0 items-center",
          collapsed ? "justify-center px-2" : "justify-between px-5",
        )}
      >
        {!collapsed && (
          <Link href="/cases" className="flex min-w-0 items-center gap-2.5">
            <LatticeMark className="size-6 shrink-0 text-brand" />
            <span className="truncate text-[17px] font-semibold tracking-[-0.01em]">
              Bretton Lattice
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      <nav className={collapsed ? "px-2" : "px-3"}>
        {!collapsed && (
          <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Cross-case layer
          </p>
        )}
        <ul className={cn("space-y-0.5", collapsed && "pt-3")}>
          {NAV.map(renderItem)}
        </ul>
      </nav>

      <div className={cn("mt-auto", collapsed ? "px-2 pb-4" : "px-3 pb-4")}>
        <ul className="space-y-0.5 border-t border-hairline pt-3">
          {SECONDARY.map(renderItem)}
        </ul>
      </div>
    </aside>
  );
}
