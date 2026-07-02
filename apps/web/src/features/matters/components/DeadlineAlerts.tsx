"use client";

import { useMemo } from "react";
import { AlertTriangle, Clock, Shield } from "lucide-react";
import { Card, Badge, cn } from "@/shared/components/ui";
import { CountdownBadge, SkeletonWidget } from "@/shared/components/ui/DashboardPrimitives";
import type { DashboardDeadline } from "@/features/matters/hooks/useDashboard";
import type { MatterCategory } from "@/entities/types";

// ── Constants ───────────────────────────────────────────────────────────

const MAX_VISIBLE = 5;

const SEVERITY_ORDER: Record<DashboardDeadline["severity"], number> = {
  red: 0,
  amber: 1,
  neutral: 2,
};

const CATEGORY_TONE: Record<MatterCategory, "gold" | "teal" | "blue" | "red" | "muted"> = {
  cheque_bounce: "gold",
  rera: "blue",
  consumer: "teal",
  property: "muted",
  family: "muted",
  labour: "gold",
  criminal: "red",
  cyber: "blue",
  motor_vehicles: "gold",
  other: "muted",
};

const CATEGORY_LABEL: Record<MatterCategory, string> = {
  cheque_bounce: "Cheque Bounce",
  rera: "RERA",
  consumer: "Consumer",
  property: "Property",
  family: "Family",
  labour: "Labour",
  criminal: "Criminal",
  cyber: "Cyber",
  motor_vehicles: "Motor Vehicle",
  other: "Other",
};

// ── Helpers ─────────────────────────────────────────────────────────────

function formatIndianDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Props ───────────────────────────────────────────────────────────────

interface DeadlineAlertsProps {
  deadlines: DashboardDeadline[];
  isLoading: boolean;
}

// ── Component ───────────────────────────────────────────────────────────

function DeadlineAlerts({ deadlines, isLoading }: DeadlineAlertsProps) {
  const sorted = useMemo(
    () =>
      [...deadlines].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      ),
    [deadlines]
  );

  const visible = sorted.slice(0, MAX_VISIBLE);
  const hasMore = sorted.length > MAX_VISIBLE;

  if (isLoading) {
    return <SkeletonWidget className="min-h-[180px]" />;
  }

  return (
    <Card className="p-5" aria-label="Deadline alerts">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-blue-light/50">
          Deadline Alerts
        </h3>
      </div>

      {/* Empty state */}
      {deadlines.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-3">
            <Shield className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="mt-3 text-[13px] font-medium text-brand-blue-dark">
            No approaching deadlines
          </p>
          <p className="mt-1 text-[11px] text-brand-blue-light/45">
            All limitation periods are well within safe margins
          </p>
        </div>
      )}

      {/* Deadline list */}
      {visible.length > 0 && (
        <ul className="space-y-0" role="list">
          {visible.map((deadline) => (
            <li
              key={`${deadline.matter_id}-${deadline.deadline_type}`}
              className={cn(
                "border-b border-brand-gold/8 px-2 py-3 last:border-0",
                deadline.severity === "red" && "rounded-lg bg-red-50/60",
                deadline.severity === "amber" && "rounded-lg bg-amber-50/60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-brand-blue-dark">
                      {deadline.matter_title}
                    </span>
                    <Badge
                      tone={CATEGORY_TONE[deadline.category]}
                      className="flex-shrink-0 px-2 py-0.5 text-[8px]"
                    >
                      {CATEGORY_LABEL[deadline.category]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-brand-blue-light/50">
                    <Clock className="h-3 w-3" />
                    {deadline.deadline_type}
                    <span className="text-brand-blue-light/30">·</span>
                    <span className="tabular-nums">
                      {formatIndianDate(deadline.deadline_date)}
                    </span>
                  </p>
                  {deadline.description && (
                    <p className="mt-1 text-[12px] leading-relaxed text-brand-blue-light/55">
                      {deadline.description}
                    </p>
                  )}
                </div>

                {/* Countdown badge */}
                <div className="flex-shrink-0 pt-0.5">
                  <CountdownBadge
                    days={deadline.days_remaining}
                    severity={deadline.severity}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* View all link */}
      {hasMore && (
        <div className="mt-3 text-center">
          <button
            type="button"
            className="text-[11px] font-medium text-brand-gold hover:text-brand-gold-light transition-colors"
            aria-label={`View all ${sorted.length} deadline alerts`}
          >
            View all ({sorted.length})
          </button>
        </div>
      )}
    </Card>
  );
}

export default DeadlineAlerts;
