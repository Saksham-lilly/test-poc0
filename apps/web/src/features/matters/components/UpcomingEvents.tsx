"use client";

import Link from "next/link";
import { Calendar, Clock, Video, CheckCircle2 } from "lucide-react";
import { Card, cn } from "@/shared/components/ui";
import { SkeletonWidget } from "@/shared/components/ui/DashboardPrimitives";
import type { DashboardHearing, DashboardMeeting, DashboardDeadline } from "@/features/matters/hooks/useDashboard";

// ── Helpers ─────────────────────────────────────────────────────────

function formatIndianDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isWithin48Hours(dateStr: string): boolean {
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < 48 * 60 * 60 * 1000;
}

// ── Component ───────────────────────────────────────────────────────

interface UpcomingEventsProps {
  hearings: DashboardHearing[];
  meetings: DashboardMeeting[];
  deadlines: DashboardDeadline[];
  isLoading: boolean;
  featHearings: boolean;
}

export default function UpcomingEvents({
  hearings,
  meetings,
  deadlines,
  isLoading,
  featHearings,
}: UpcomingEventsProps) {
  if (isLoading) {
    return <SkeletonWidget className="h-40" />;
  }

  const visibleHearings = featHearings ? hearings.slice(0, 3) : [];
  const visibleMeetings = meetings.slice(0, 3);
  const visibleDeadlines = deadlines.filter(d => d.severity !== "neutral").slice(0, 2);
  const hasAnything = visibleHearings.length > 0 || visibleMeetings.length > 0 || visibleDeadlines.length > 0;

  if (!hasAnything) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-brand-blue-dark">
              Nothing coming up this week
            </p>
            <p className="text-[11px] text-brand-blue-light/50">
              We&apos;ll notify you when something needs your attention.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-blue-light/50">
          Upcoming
        </p>
      </div>

      <div className="divide-y divide-brand-gold/8">
        {/* Deadlines (most urgent) */}
        {visibleDeadlines.map((d) => (
          <Link
            key={`dl-${d.matter_id}-${d.deadline_type}`}
            href={`/user/matters/${d.matter_id}`}
            className={cn(
              "flex items-center gap-3 px-5 py-3 transition-colors hover:bg-base-200/50",
              d.severity === "red" && "bg-red-50/40",
              d.severity === "amber" && "bg-amber-50/30",
            )}
          >
            <div className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
              d.severity === "red" ? "bg-red-100 text-red-500" : "bg-amber-100 text-amber-600",
            )}>
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-brand-blue-dark truncate">
                {d.description}
              </p>
              <p className="text-[11px] text-brand-blue-light/50">
                {d.matter_title} · {d.deadline_type}
              </p>
            </div>
            <span className={cn(
              "text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full",
              d.severity === "red" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700",
            )}>
              {d.days_remaining}d
            </span>
          </Link>
        ))}

        {/* Hearings */}
        {visibleHearings.map((h) => (
          <Link
            key={h.id}
            href={`/user/matters/${h.matter_id}`}
            className={cn(
              "flex items-center gap-3 px-5 py-3 transition-colors hover:bg-base-200/50",
              isWithin48Hours(h.hearing_date) && "bg-amber-50/20",
            )}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-gold/10 text-brand-gold">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-brand-blue-dark">
                Court hearing{h.purpose ? ` — ${h.purpose}` : ""}
              </p>
              <p className="text-[11px] text-brand-blue-light/50">
                {formatIndianDate(h.hearing_date)} at {formatTime(h.hearing_date)}
                {h.courtroom ? ` · ${h.courtroom}` : ""}
              </p>
            </div>
          </Link>
        ))}

        {/* Meetings */}
        {visibleMeetings.map((m) => (
          <Link
            key={m.id}
            href={`/user/matters/${m.matter_id}`}
            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-base-200/50"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-accent/10 text-brand-accent">
              <Video className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-brand-blue-dark">
                Meeting with your advocate
              </p>
              <p className="text-[11px] text-brand-blue-light/50">
                {formatIndianDate(m.scheduled_at)} at {formatTime(m.scheduled_at)} · {m.duration_minutes} min
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
