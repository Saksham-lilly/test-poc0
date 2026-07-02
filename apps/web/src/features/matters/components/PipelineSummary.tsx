"use client";

import { ArrowRight } from "lucide-react";
import { StatCard, Skeleton } from "@/shared/components/ui/DashboardPrimitives";
import type { MatterStatus } from "@/entities/types";

// ── Types ─────────────────────────────────────────────────────────────

interface PipelineSummaryProps {
  mattersByStatus: Partial<Record<MatterStatus, number>>;
  totalMatters: number;
  isLoading: boolean;
  onStatusClick?: (status: MatterStatus) => void;
}

// ── Pipeline stage configuration ──────────────────────────────────────

const PIPELINE_STAGES: {
  status: MatterStatus;
  label: string;
  tone: "gold" | "teal" | "neutral" | "amber";
}[] = [
  { status: "matching", label: "Awaiting", tone: "gold" },
  { status: "active", label: "Active", tone: "teal" },
  { status: "resolved", label: "Resolved", tone: "neutral" },
  { status: "archived", label: "Archived", tone: "neutral" },
];

// ── Component ─────────────────────────────────────────────────────────

function PipelineSummary({
  mattersByStatus,
  totalMatters,
  isLoading,
  onStatusClick,
}: PipelineSummaryProps) {
  if (isLoading) {
    return (
      <section aria-label="Case pipeline">
        <div className="mb-2">
          <Skeleton variant="line" className="h-3 w-32" />
        </div>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} variant="card" className="h-[76px] flex-1 min-w-[120px]" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Case pipeline">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-brand-blue-light/40">
        {totalMatters} {totalMatters === 1 ? "matter" : "matters"} total
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {PIPELINE_STAGES.map((stage, index) => (
          <div key={stage.status} className="flex flex-1 min-w-[120px] items-center gap-3">
            <StatCard
              label={stage.label}
              value={mattersByStatus[stage.status] ?? 0}
              tone={stage.status === "archived" ? "neutral" : stage.tone}
              onClick={onStatusClick ? () => onStatusClick(stage.status) : undefined}
              className="w-full"
            />
            {index < PIPELINE_STAGES.length - 1 && (
              <ArrowRight
                size={16}
                className="hidden flex-shrink-0 text-brand-blue-light/20 md:block"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default PipelineSummary;
