import { cn } from "@/lib/utils";
import type {
  ConnectionType,
  DetectedBy,
  EntityType,
  RiskLevel,
} from "@/lib/database.types";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium leading-none whitespace-nowrap";

/** Every seeded case carries this — it is the premise of the demo. */
export function ClearedBadge() {
  return (
    <span className={cn(PILL, "bg-brand text-white")}>
      <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
        <path
          d="M3.5 8.5 6.5 11.5 12.5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Cleared
    </span>
  );
}

export function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        PILL,
        "border border-border bg-card text-[12px] text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

const RISK_STYLES: Record<RiskLevel, string> = {
  informational: "bg-secondary text-secondary-foreground",
  review: "bg-warn text-white",
  high_priority: "bg-danger text-white",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  informational: "Informational",
  review: "Worth reviewing",
  high_priority: "High priority",
};

export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  return (
    <span className={cn(PILL, RISK_STYLES[level], className)}>
      {RISK_LABELS[level]}
    </span>
  );
}

export const CONNECTION_LABELS: Record<ConnectionType, string> = {
  exact_match: "Exact match",
  normalized_match: "Same value, written differently",
  fuzzy_match: "Near-identical",
  semantic_match: "Judged equivalent",
};

export const ENTITY_LABELS: Record<EntityType, string> = {
  business: "Business name",
  person: "Person",
  address: "Address",
  phone: "Phone number",
  registered_agent: "Registered agent",
  ip: "IP address",
  incorporation_date: "Incorporation date",
};

export function DetectionBadge({ by }: { by: DetectedBy }) {
  return (
    <span
      className={cn(
        PILL,
        by === "deterministic"
          ? "bg-secondary text-secondary-foreground"
          : "bg-accent text-accent-foreground",
      )}
    >
      {by === "deterministic" ? "Rule-based" : "Claude-adjudicated"}
    </span>
  );
}

export function AssigneeChip({ name }: { name: string | null }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Stable per-name hue so the same analyst keeps the same colour across views.
  const hues = ["bg-net-1", "bg-net-2", "bg-net-3", "bg-net-4", "bg-danger"];
  const hue =
    hues[
      [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % hues.length
    ];

  return (
    <span className="flex items-center gap-2">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
          hue,
        )}
      >
        {initials}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}
