"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Scale } from "lucide-react";
import { Card, Badge } from "@/shared/components/ui";
import { SkeletonWidget } from "@/shared/components/ui/DashboardPrimitives";
import type { UserPrimaryMatter } from "@/features/matters/hooks/useDashboard";

// ── Category display names ──────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  cheque_bounce: "Cheque Bounce",
  consumer: "Consumer",
  rera: "RERA",
  property: "Property",
  family: "Family",
  labour: "Labour",
  criminal: "Criminal",
  cyber: "Cyber",
  motor_vehicles: "Motor Vehicle",
  other: "Legal Matter",
};

const CATEGORY_TONE: Record<string, "gold" | "teal" | "blue" | "red" | "muted"> = {
  cheque_bounce: "gold",
  consumer: "teal",
  rera: "blue",
  property: "gold",
  family: "muted",
  criminal: "red",
  labour: "muted",
  cyber: "blue",
  motor_vehicles: "gold",
  other: "muted",
};

// ── Status progress mapping ─────────────────────────────────────────

const STATUS_STEPS = ["intake", "assessment", "matching", "active", "resolved"] as const;

function getProgressPercent(status: string): number {
  const idx = STATUS_STEPS.indexOf(status as typeof STATUS_STEPS[number]);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / STATUS_STEPS.length) * 100);
}

// ── Component ───────────────────────────────────────────────────────

interface CaseHeroCardProps {
  matter: UserPrimaryMatter | null;
  isLoading: boolean;
}

export default function CaseHeroCard({ matter, isLoading }: CaseHeroCardProps) {
  if (isLoading) {
    return <SkeletonWidget className="h-52" />;
  }

  if (!matter) {
    // No cases yet — show welcoming CTA
    return (
      <div className="rounded-xl border border-brand-gold/15 bg-gradient-to-br from-base-100 to-brand-gold/5 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-gold/10 text-brand-gold">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-brand-blue-dark">
              Ready to get started?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-blue-light/60">
              Tell us about your legal situation in plain language — no legal jargon needed.
              Our AI will extract the key facts and give you a free assessment.
            </p>
            <Link
              href="/user/matters"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-2.5 text-sm font-semibold text-brand-gold transition-all hover:bg-brand-gold/20 hover:border-brand-gold/40"
              aria-label="Start a new case"
            >
              Start your first case <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progress = getProgressPercent(matter.status);
  const categoryLabel = CATEGORY_LABELS[matter.category] ?? "Legal Matter";
  const categoryTone = CATEGORY_TONE[matter.category] ?? "muted";

  return (
    <Card className="overflow-hidden">
      {/* Progress bar at top */}
      <div className="h-1 w-full bg-base-300/50">
        <div
          className="h-full bg-brand-teal transition-all duration-500"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Case progress: ${progress}%`}
        />
      </div>

      <div className="p-5 sm:p-6">
        {/* Top row: category + status */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={categoryTone}>{categoryLabel}</Badge>
          {matter.status === "active" && (
            <Badge tone="teal">Active</Badge>
          )}
          {matter.status === "matching" && (
            <Badge tone="gold">Finding Lawyer</Badge>
          )}
          {matter.status === "resolved" && (
            <Badge tone="muted">Resolved</Badge>
          )}
        </div>

        {/* Title */}
        <h2 className="mt-3 font-serif text-xl font-bold text-brand-blue-dark leading-snug">
          {matter.title}
        </h2>

        {/* Plain-language status — the key UX differentiator */}
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-base-200/60 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-brand-teal mt-0.5" />
          <div>
            <p className="text-[13px] font-medium text-brand-blue-dark">
              {matter.plain_status}
            </p>
            <p className="mt-1 text-[12px] text-brand-blue-light/55">
              {matter.next_action}
            </p>
          </div>
        </div>

        {/* Bottom row: lawyer + next event */}
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          {matter.lawyer_name && (
            <div className="flex items-center gap-2 text-[12px] text-brand-blue-light/55">
              <span className="h-6 w-6 rounded-full bg-brand-blue-light/10 flex items-center justify-center text-[10px] font-bold text-brand-blue-light/60">
                {matter.lawyer_name.charAt(0).toUpperCase()}
              </span>
              <span>Adv. {matter.lawyer_name}</span>
            </div>
          )}

          {matter.next_hearing_at && (
            <div className="flex items-center gap-1.5 text-[12px] text-brand-blue-light/55">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Next hearing:{" "}
                {new Date(matter.next_hearing_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {/* View full case link */}
        <Link
          href={`/user/matters/${matter.id}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-gold hover:text-brand-gold-light transition-colors"
          aria-label={`View full details for ${matter.title}`}
        >
          View case details <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}
