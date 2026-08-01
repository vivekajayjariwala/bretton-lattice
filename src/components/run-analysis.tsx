"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, Play, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PipelineEvent, PipelineStats } from "@/lib/pipeline/run";

const STAGES = [
  {
    key: "extract",
    label: "Extract entities",
    detail:
      "Claude reads each closed case file and pulls out structured attributes.",
  },
  {
    key: "detect",
    label: "Detect connections",
    detail:
      "Canonical values are matched by rule; only genuinely ambiguous pairs go to Claude.",
  },
  {
    key: "cluster",
    label: "Cluster & write briefs",
    detail:
      "Connected cases are grouped into networks and each gets a written risk brief.",
  },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

export function RunAnalysis({ hasRun }: { hasRun: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<StageKey | null>(null);
  const [completed, setCompleted] = useState<Set<StageKey>>(new Set());
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PipelineStats | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setStats(null);
    setCompleted(new Set());
    setMessages({});

    try {
      const response = await fetch("/api/analysis/run", { method: "POST" });
      if (!response.ok || !response.body) {
        throw new Error(`Pipeline failed to start (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as PipelineEvent;

          if (event.stage === "error") {
            setError(event.message);
            toast.error("Analysis failed", { description: event.message });
            continue;
          }

          if (event.stage === "complete") {
            setCompleted(new Set(STAGES.map((s) => s.key)));
            setCurrent(null);
            setStats(event.stats);
            toast.success(event.message);
            router.refresh();
            continue;
          }

          setCurrent(event.stage);
          setMessages((m) => ({ ...m, [event.stage]: event.message }));
          setCompleted((prev) => {
            const next = new Set(prev);
            const index = STAGES.findIndex((s) => s.key === event.stage);
            for (let i = 0; i < index; i++) next.add(STAGES[i].key);
            return next;
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error("Analysis failed", { description: message });
    } finally {
      setRunning(false);
      setCurrent(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-[17px] font-semibold">Cross-case analysis</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
              Reads every ingested case file, extracts identifying attributes,
              compares them across the whole corpus, and clusters whatever links
              up into networks. Takes about a minute.
            </p>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {running ? "Running…" : hasRun ? "Re-run analysis" : "Run analysis"}
          </button>
        </div>

        <ol className="mt-7 space-y-1">
          {STAGES.map((stage, i) => {
            const isDone = completed.has(stage.key);
            const isCurrent = current === stage.key;
            return (
              <li
                key={stage.key}
                className={cn(
                  "flex gap-4 rounded-lg px-3 py-3.5 transition-colors",
                  isCurrent && "bg-band",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-medium",
                    isDone
                      ? "border-brand bg-brand text-white"
                      : isCurrent
                        ? "border-brand text-brand"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {isDone ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : isCurrent ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-medium">
                    {stage.label}
                  </span>
                  <span className="block text-[13.5px] leading-relaxed text-muted-foreground">
                    {messages[stage.key] ?? stage.detail}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        {error && (
          <div className="mt-5 flex gap-3 rounded-lg border border-danger/25 bg-danger-soft px-4 py-3.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
            <div className="min-w-0 text-[13.5px] leading-relaxed">
              <p className="font-medium text-danger">Analysis failed</p>
              <p className="mt-0.5 break-words text-foreground/80">{error}</p>
            </div>
          </div>
        )}
      </div>

      {stats && <StatsGrid stats={stats} />}
    </div>
  );
}

function StatsGrid({ stats }: { stats: PipelineStats }) {
  const tiles = [
    { label: "Cases read", value: stats.cases },
    { label: "Entities extracted", value: stats.entities },
    { label: "Connections found", value: stats.connections },
    { label: "Rule-based", value: stats.deterministicConnections },
    { label: "Claude-adjudicated", value: stats.claudeConnections },
    { label: "Networks", value: stats.networks },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div key={t.label} className="bg-card px-4 py-5">
          <p className="tnum text-[22px] font-semibold leading-none sm:text-[26px]">
            {t.value}
          </p>
          <p className="mt-2 text-[12.5px] leading-tight text-muted-foreground">
            {t.label}
          </p>
        </div>
      ))}
    </div>
  );
}
