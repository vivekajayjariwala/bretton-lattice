import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  icon,
  pill,
  crumbs,
  actions,
  meta,
}: {
  title: string;
  icon?: React.ReactNode;
  pill?: React.ReactNode;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <header className="border-b border-hairline bg-band px-4 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-7">
      {crumbs && crumbs.length > 0 && (
        <nav className="mb-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 opacity-50" />}
              {c.href ? (
                <Link href={c.href} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon}
          {/* Generated network names run long; wrap rather than truncate so the
              headline stays readable. */}
          <h1 className="min-w-0 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-balance sm:text-[30px]">
            {title}
          </h1>
          {pill}
        </div>
        {actions && (
          <div className="flex items-center gap-2 sm:ml-auto">{actions}</div>
        )}
      </div>

      {meta && <div className="mt-5 sm:mt-6">{meta}</div>}
    </header>
  );
}
