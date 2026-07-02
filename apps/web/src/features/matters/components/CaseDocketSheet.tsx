"use client";

import { Badge } from "@/shared/components/ui";
import { SheetPanel, SkeletonLines } from "@/shared/components/ui/DashboardPrimitives";
import { useMatter } from "@/features/matters/hooks/useMatters";
import { useFeatures } from "@/shared/hooks/useFeatures";
import type { MatterStatus } from "@/entities/types";
import { FileText, Calendar, CheckCircle2, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

// ── Props ───────────────────────────────────────────────────────────────────

interface CaseDocketSheetProps {
  matterId: string | null;
  onClose: () => void;
}

// ── Tone Mappings ───────────────────────────────────────────────────────────

const CATEGORY_TONE: Record<string, "gold" | "teal" | "blue" | "red" | "muted"> = {
  cheque_bounce: "gold",
  consumer: "teal",
  rera: "blue",
  property: "gold",
  family: "muted",
  criminal: "red",
  cyber: "blue",
  labour: "muted",
  motor_vehicles: "gold",
  other: "muted",
};

const STATUS_TONE: Record<MatterStatus, "gold" | "teal" | "blue" | "red" | "muted"> = {
  draft: "muted",
  intake: "muted",
  assessment: "muted",
  matching: "gold",
  active: "teal",
  resolved: "muted",
  archived: "muted",
};

const PRIORITY_TONE: Record<string, "gold" | "teal" | "blue" | "red" | "muted"> = {
  low: "muted",
  medium: "blue",
  high: "gold",
  urgent: "red",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, " ");
}

function formatDateIndian(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CaseDocketSheet({ matterId, onClose }: CaseDocketSheetProps) {
  const { data: matter, isLoading, isError, refetch } = useMatter(matterId ?? "");
  const { features } = useFeatures();

  return (
    <SheetPanel
      open={matterId !== null}
      onClose={onClose}
      title="Case Docket"
      width="w-[400px]"
    >
      {isLoading && (
        <div className="space-y-6">
          <SkeletonLines count={2} />
          <SkeletonLines count={4} />
          <SkeletonLines count={3} />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center py-10 text-center">
          <p className="text-[13px] text-red-600">
            Failed to load matter details.
          </p>
          <button
            onClick={() => refetch()}
            aria-label="Retry loading matter"
            className="mt-3 text-sm font-medium text-brand-gold hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {matter && !isLoading && !isError && (
        <div className="space-y-0">
          {/* Section: Badges + Title */}
          <div className="py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={CATEGORY_TONE[matter.category] ?? "muted"}>
                {formatCategoryLabel(matter.category)}
              </Badge>
              <Badge tone={STATUS_TONE[matter.status] ?? "muted"}>
                {matter.status}
              </Badge>
            </div>
            <h3 className="mt-3 font-serif text-xl font-semibold text-brand-blue-dark leading-snug">
              {matter.title}
            </h3>
          </div>

          <div className="border-b border-brand-gold/8" />

          {/* Section: Client Info */}
          <div className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-brand-blue-light/40" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-brand-blue-light/50 font-semibold">
                Client
              </span>
            </div>
            <p className="text-[13px] text-brand-blue-dark font-medium">
              {matter.user_name || "—"}
            </p>
            {(matter.client_email || matter.client_phone) && (
              <div className="mt-1 space-y-0.5">
                {matter.client_email && (
                  <p className="text-[12px] text-brand-blue-light/55">
                    {matter.client_email}
                  </p>
                )}
                {matter.client_phone && (
                  <p className="text-[12px] text-brand-blue-light/55">
                    {matter.client_phone}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border-b border-brand-gold/8" />

          {/* Section: Priority */}
          <div className="py-4">
            <span className="text-[10px] uppercase tracking-[0.18em] text-brand-blue-light/50 font-semibold">
              Priority
            </span>
            <div className="mt-1.5">
              <Badge tone={PRIORITY_TONE[matter.priority] ?? "muted"}>
                {matter.priority}
              </Badge>
            </div>
          </div>

          <div className="border-b border-brand-gold/8" />

          {/* Section: Next Hearing */}
          <div className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-3.5 w-3.5 text-brand-blue-light/40" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-brand-blue-light/50 font-semibold">
                Next Hearing
              </span>
            </div>
            <p className="text-[13px] text-brand-blue-dark">
              {matter.next_hearing_at
                ? formatDateIndian(matter.next_hearing_at)
                : "None scheduled"}
            </p>
          </div>

          <div className="border-b border-brand-gold/8" />

          {/* Section: Milestones (feature-flagged) */}
          {features.milestones && (
            <>
              <div className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-blue-light/40" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-brand-blue-light/50 font-semibold">
                    Milestones
                  </span>
                </div>
                {matter.milestones && matter.milestones.length > 0 ? (
                  <p className="text-[13px] text-brand-blue-dark">
                    {matter.milestones.filter((m) => m.status === "completed").length}
                    /{matter.milestones.length} completed
                  </p>
                ) : (
                  <p className="text-[13px] text-brand-blue-light/50">
                    No milestones defined
                  </p>
                )}
              </div>
              <div className="border-b border-brand-gold/8" />
            </>
          )}

          {/* Section: Recent Timeline */}
          {matter.hearings && matter.hearings.length > 0 && (
            <>
              <div className="py-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-3.5 w-3.5 text-brand-blue-light/40" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-brand-blue-light/50 font-semibold">
                    Recent Timeline
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {matter.hearings.slice(0, 3).map((hearing) => (
                    <li key={hearing.id} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-gold/40" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-brand-blue-dark leading-snug">
                          {hearing.purpose || "Hearing"}
                        </p>
                        <p className="text-[11px] text-brand-blue-light/45">
                          {formatDateIndian(hearing.hearing_date)}
                          {hearing.courtroom && ` — ${hearing.courtroom}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-b border-brand-gold/8" />
            </>
          )}

          {/* Section: Open Full Case Link */}
          <div className="py-4">
            <Link
              href="/lawyer/matters"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-gold hover:underline transition-colors"
              aria-label="Open full case view"
            >
              Open full case
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </SheetPanel>
  );
}
