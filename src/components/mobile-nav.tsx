"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LatticeMark } from "@/components/lattice-mark";
import { NAV, SECONDARY, isActive, type NavItem } from "@/components/nav-items";
import { cn } from "@/lib/utils";

/**
 * The top bar and drawer that stand in for the sidebar below md. Without this
 * there is no route to any page on a phone: the rail is display:none there.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // A tap that navigates should also dismiss the drawer.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const item = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(pathname, href);
    return (
      <li key={href}>
        <Link
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] transition-colors",
            active
              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              : "text-foreground/80 active:bg-muted",
          )}
        >
          <Icon
            className={cn(
              "size-[18px] shrink-0",
              active ? "text-brand" : "text-brand/70",
            )}
            strokeWidth={1.75}
          />
          {label}
        </Link>
      </li>
    );
  };

  return (
    <header
      className="sticky top-0 z-40 flex min-h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 md:hidden"
      // Under viewport-fit=cover this bar starts at the physical top edge, so
      // it has to clear the status bar itself. The side insets are non-zero
      // only in landscape.
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Open navigation"
          className="-ml-2 rounded-md p-2 text-muted-foreground transition-colors active:bg-muted"
        >
          <Menu className="size-5" />
        </SheetTrigger>

        <SheetContent
          side="left"
          className="flex w-[280px] flex-col gap-0 p-0"
          // The sheet ships data-[side=left]:h-full. On iOS a fixed element's
          // 100% resolves against the small viewport, so with Safari's collapsed
          // toolbar the panel stopped short of the visible bottom. 100dvh tracks
          // the viewport as the chrome expands and collapses; setting it inline
          // beats the variant class, which out-specifies a utility.
          style={{ height: "100dvh" }}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Links to each section of Bretton Lattice.
          </SheetDescription>

          <div
            className="flex min-h-14 shrink-0 items-center gap-2.5 border-b border-hairline px-5"
            // The panel spans the full screen height, so its own header sits
            // under the status bar without this.
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <LatticeMark className="size-6 shrink-0 text-brand" />
            <span className="text-[16px] font-semibold tracking-[-0.01em]">
              Bretton Lattice
            </span>
          </div>

          <nav
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3"
            // Keep the last link clear of the home indicator.
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Cross-case layer
            </p>
            <ul className="space-y-0.5">{NAV.map(item)}</ul>

            <ul className="mt-auto space-y-0.5 border-t border-hairline pt-3">
              {SECONDARY.map(item)}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>

      <Link href="/cases" className="flex min-w-0 items-center gap-2">
        <LatticeMark className="size-5 shrink-0 text-brand" />
        <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">
          Bretton Lattice
        </span>
      </Link>
    </header>
  );
}
