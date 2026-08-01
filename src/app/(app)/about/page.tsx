import Link from "next/link";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "About · Bretton Lattice",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About this project"
        icon={
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Info className="size-5" strokeWidth={1.75} />
          </span>
        }
        meta={
          <p className="max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
            A working demo of a cross-case intelligence layer for financial
            crime investigations, built to sit on top of a bank&apos;s completed
            case history.
          </p>
        }
      />

      <div className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <Section title="What it is">
            <p>
              Lattice reads a bank&apos;s closed case files as one body of
              evidence instead of one file at a time.
            </p>
            <p>
              Feed it a batch of investigations that have already been worked
              and signed off. It pulls out the identifying details, compares
              every case against every other case, and reports back on the
              structure it finds sitting between them.
            </p>
          </Section>

          <Section title="The problem">
            <p>
              An investigation can only see what sits inside the case it was
              opened for. That constraint is reasonable and it is also the
              blind spot.
            </p>
            <p>
              Picture six shell companies. Each one has its own clean file. Each
              one was cleared on its own merits by an analyst who did nothing
              wrong. They quietly share a registered agent address, or an
              owner&apos;s phone number, or a run of incorporation dates a few
              days apart. No single review would catch any of that, since no
              single review has any reason to look at the other five. Proof of a
              ring lives in the gaps between cases, never inside one of them.
            </p>
          </Section>

          <Section title="How it works">
            <p>
              Claude reads every closed narrative and pulls out structured
              attributes: addresses, phone numbers, registered agents,
              beneficial owners, formation dates. The original strings get
              stored untouched, since an auditor needs to trace a finding back
              to the exact words in the source file.
            </p>
            <p>
              Matching then splits in two. Mechanical rules settle whatever
              canonicalization can settle, so &ldquo;2810 West Charleston
              Boulevard, Ste. 84&rdquo; and &ldquo;2810 W Charleston Blvd, Suite
              84&rdquo; collapse into one value with no model call at all. Those
              findings are reproducible byte for byte and cost nothing to
              defend.
            </p>
            <p>
              Only genuinely ambiguous pairs reach Claude for a judgement call.
              That leaves the model doing what it is actually better at:
              deciding whether &ldquo;Harborline Logistics&rdquo; and
              &ldquo;Harbourline Logistics&rdquo;, filed a day apart in the same
              state, mean something. Cases that link up, directly or through a
              chain of other cases, group into networks by connected components.
              Each network gets a written brief.
            </p>
          </Section>

          <Section title="What the demo shows">
            <p>
              The corpus holds 18 fictional businesses that all passed enhanced
              due diligence. Eleven are genuine controls with nothing in common.
              Seven carry planted structure across two rings.
            </p>
            <p>
              The pipeline recovers both rings exactly, at five cases and two
              cases, and links none of the eleven controls to anything. That
              second number matters more than the first. A false connection
              sends an analyst chasing a network that was never there, which is
              a faster way to lose a compliance team&apos;s trust than missing a
              real one.
            </p>
            <p>
              The five-case brief makes the point better than any summary of it
              can: two independent attribute chains converge on the same
              entities, and either chain on its own would be unremarkable.
            </p>
          </Section>

          <Section title="Where it fits">
            <p>
              This layer never re-opens a case or argues with a disposition.
              Bretton&apos;s agent already handles per-case investigation,
              applies the bank&apos;s written policy, and produces the cited
              narrative. It does that job well.
            </p>
            <p>
              Lattice takes that finished output as its raw material. Every
              investigation a bank completes becomes an input to the next
              question rather than a document that stops being useful the moment
              the case closes. The more case history a bank has worked, the more
              this layer has to work with.
            </p>
          </Section>

          <Section title="Built with">
            <p>
              Next.js and TypeScript on Vercel, Tailwind and shadcn/ui for the
              interface, Supabase Postgres for storage, the Anthropic API for
              extraction and reasoning, and a canvas force-directed graph for
              the network view.
            </p>
            <p>
              The pipeline runs as a batch job over the whole corpus and writes
              its results to Postgres. The screens read from that stored output,
              so a demo never waits on a model call. The scripts and the
              in-app&nbsp;
              <Link
                href="/analysis"
                className="font-medium text-brand underline underline-offset-2"
              >
                run button
              </Link>{" "}
              call the same library functions.
            </p>
          </Section>

          <div className="rounded-xl border border-hairline bg-band px-5 py-5 sm:px-6">
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Every business, person, address and phone number in this demo is
              synthetic and fictional. Nothing here reflects a real customer or
              a real investigation.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-[1.75]">{children}</div>
    </section>
  );
}
