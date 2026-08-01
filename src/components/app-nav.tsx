"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  FileText,
  FolderClosed,
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

const STORAGE_KEY = "lattice:nav-collapsed";

export function AppNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

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

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
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
          {NAV.map(({ href, label, icon: Icon }) => {
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
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <button
            type="button"
            onClick={() => setAboutOpen((v) => !v)}
            aria-expanded={aboutOpen}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:bg-muted"
          >
            About this project
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                aboutOpen && "rotate-180",
              )}
            />
          </button>

          {aboutOpen && <AboutPanel />}
        </div>
      )}
    </aside>
  );
}

function AboutPanel() {
  return (
    <div className="space-y-5 px-3 pb-2 pt-3 text-[12.5px] leading-[1.65] text-muted-foreground">
      <section>
        <h3 className="mb-1.5 text-[12px] font-semibold text-foreground">
          What it is
        </h3>
        <p>
          Lattice reads a bank&apos;s closed case files as one body of evidence
          instead of one file at a time.
        </p>
      </section>

      <section>
        <h3 className="mb-1.5 text-[12px] font-semibold text-foreground">
          The problem
        </h3>
        <p>
          An investigation can only see what sits inside the case it was opened
          for. Six shell companies, each with its own clean file, each cleared
          on its own merits, stay invisible to a process that never compares
          them against each other. Proof of a ring lives in the gaps between
          cases, not inside any single one.
        </p>
      </section>

      <section>
        <h3 className="mb-1.5 text-[12px] font-semibold text-foreground">
          How it works
        </h3>
        <p>
          Claude pulls structured attributes out of every closed narrative:
          addresses, phone numbers, registered agents, beneficial owners,
          formation dates. Mechanical rules settle whatever canonicalization can
          settle, so &ldquo;Ste. 84&rdquo; and &ldquo;Suite 84&rdquo; collapse
          into one value with no model call at all.
        </p>
        <p className="mt-2.5">
          Only the genuinely ambiguous pairs reach Claude for a judgement call.
          That split keeps the strongest findings reproducible and cheap to
          audit, and it leaves the model to do the work it is actually better
          at: deciding whether &ldquo;Harborline&rdquo; and
          &ldquo;Harbourline&rdquo; filed a day apart mean something. Cases that
          link up, directly or through a chain, group into networks. Each
          network gets a written brief.
        </p>
      </section>

      <section>
        <h3 className="mb-1.5 text-[12px] font-semibold text-foreground">
          Where it fits
        </h3>
        <p>
          This layer never re-opens a case or argues with a disposition.
          Bretton&apos;s agent already handles per-case investigation and
          handles it well. Lattice takes that finished output as its raw
          material, so the value of every completed case compounds rather than
          ending the moment the case closes.
        </p>
      </section>

      <section>
        <h3 className="mb-1.5 text-[12px] font-semibold text-foreground">
          Built with
        </h3>
        <p>
          Next.js and TypeScript on Vercel, Tailwind and shadcn/ui for the
          interface, Supabase Postgres for storage, the Anthropic API for
          extraction and reasoning, and a canvas force-directed graph for the
          network view.
        </p>
      </section>

      <p className="border-t border-hairline pt-4 text-[12px]">
        Every case in this demo is synthetic and fictional.
      </p>
    </div>
  );
}
