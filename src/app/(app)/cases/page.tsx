import Link from "next/link";
import { Building2, ListFilter, MoreVertical, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AssigneeChip, ClearedBadge, StatusPill } from "@/components/badges";
import { getCases } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const cases = await getCases();

  return (
    <>
      <PageHeader
        title="Cleared cases"
        icon={
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Building2 className="size-5" strokeWidth={1.75} />
          </span>
        }
        pill={
          <span className="rounded-full bg-brand-soft px-3 py-1 text-[12px] font-medium text-brand">
            {cases.length} cases ingested
          </span>
        }
        meta={
          <p className="max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
            Every case below was investigated individually and closed as cleared.
            Nothing in any single file was missed. Lattice reads them as a corpus
            to find structure that is only visible across cases.
          </p>
        }
        actions={
          <Link
            href="/analysis"
            className="rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Run cross-case analysis
          </Link>
        }
      />

      <div className="flex-1 px-8 py-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search"
              aria-label="Search cases"
              className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-[14px] outline-none placeholder:text-muted-foreground focus:border-ring"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-hairline text-left">
                  <Th className="w-auto">Case</Th>
                  <Th className="w-[80px]">Type</Th>
                  <Th className="w-[125px]">Opened</Th>
                  <Th className="w-[125px]">Closed</Th>
                  <Th className="w-[180px]">Analyst</Th>
                  <Th className="w-[130px]">Disposition</Th>
                  <Th className="w-[105px]">Status</Th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-hairline last:border-0 hover:bg-band/60"
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/cases/${c.case_ref}`}
                        className="flex items-center gap-3 group"
                      >
                        <Building2
                          className="size-4 shrink-0 text-muted-foreground"
                          strokeWidth={1.75}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium group-hover:underline">
                            {c.business_name}
                          </span>
                          <span className="block text-[12px] text-muted-foreground">
                            {c.case_ref}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                      {c.case_type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                      {formatDate(c.opened_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                      {formatDate(c.closed_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <AssigneeChip name={c.assignee} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <ClearedBadge />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <StatusPill>Closed</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {cases.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="text-[15px] font-medium">No cases ingested yet</p>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                Run{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">
                  npm run seed
                </code>{" "}
                to load the synthetic closed-case corpus.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-[13px] font-medium text-muted-foreground ${className ?? ""}`}
    >
      <span className="flex items-center gap-1.5">
        {children}
        <ListFilter className="size-3 opacity-35" />
        <MoreVertical className="size-3 opacity-35" />
      </span>
    </th>
  );
}
