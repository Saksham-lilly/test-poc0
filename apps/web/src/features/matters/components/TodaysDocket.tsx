"use client";

import { Calendar, Clock, MapPin, Video, CheckCircle2, ExternalLink } from "lucide-react";
import { Card, Badge, cn } from "@/shared/components/ui";
import { SkeletonWidget, TimelineEntry, CountdownBadge } from "@/shared/components/ui/DashboardPrimitives";
import type { DashboardHearing, DashboardMeeting } from "@/features/matters/hooks/useDashboard";

// ── Helpers ─────────────────────────────────────────────────────────────

/** Format a date string to Indian-style "14 Nov 2026" */
function formatDateIndian(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format a date string to "14 Nov, 10:30" (Indian day-first with time) */
function formatDateTimeIndian(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-IN", { month: "short" });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${day} ${month}, ${time}`;
}

/** Format time only as "HH:mm" */
function formatTimeOnly(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Check if a date is within the next 24 hours */
function isWithin24Hours(dateStr: string): boolean {
  const now = Date.now();
  const target = new Date(dateStr).getTime();
  const diff = target - now;
  return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
}

// ── Props ───────────────────────────────────────────────────────────────

interface TodaysDocketProps {
  hearings: DashboardHearing[];
  meetings: DashboardMeeting[];
  isLoading: boolean;
  featHearings: boolean;
}

// ── Component ───────────────────────────────────────────────────────────

function TodaysDocket({ hearings, meetings, isLoading, featHearings }: TodaysDocketProps) {
  if (isLoading) {
    return <SkeletonWidget className="min-h-[180px]" />;
  }

  const totalCount = (featHearings ? hearings.length : 0) + meetings.length;
  const hasHearings = featHearings && hearings.length > 0;
  const hasMeetings = meetings.length > 0;
  const isEmpty = !hasHearings && !hasMeetings;

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-brand-gold" />
          <h3 className="text-[13px] font-semibold text-brand-blue-dark">
            Today&apos;s Docket
          </h3>
        </div>
        {totalCount > 0 && (
          <Badge tone="muted" className="text-[9px]">
            {totalCount} event{totalCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="mt-6 flex flex-col items-center py-6 text-center">
          <div className="rounded-full border border-brand-teal/15 bg-brand-teal/5 p-3">
            <CheckCircle2 className="h-5 w-5 text-brand-teal/60" />
          </div>
          <p className="mt-3 text-[13px] text-brand-blue-light/55">
            No upcoming hearings or meetings this week
          </p>
        </div>
      )}

      {/* Court Hearings section */}
      {hasHearings && (
        <section className="mt-4" aria-label="Court hearings this week">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-blue-light/50">
            Court Hearings
          </p>
          <div className="mt-3 space-y-1">
            {hearings.map((h, idx) => {
              const imminent = isWithin24Hours(h.hearing_date);
              return (
                <div
                  key={h.id}
                  className={cn(
                    "rounded-xl px-3 py-2.5 transition-colors",
                    imminent && "bg-red-50/60 border border-red-500/10",
                    !imminent && "hover:bg-base-200/40"
                  )}
                >
                  <TimelineEntry
                    icon={<Calendar className="h-3.5 w-3.5 text-brand-gold" />}
                    title={h.matter_title}
                    subtitle={h.purpose || undefined}
                    timestamp={formatDateIndian(h.hearing_date)}
                    badge={
                      imminent ? (
                        <CountdownBadge days={0} label="Today" severity="red" />
                      ) : undefined
                    }
                    isLast={idx === hearings.length - 1}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-brand-blue-light/55">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeOnly(h.hearing_date)}
                      </span>
                      {h.courtroom && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {h.courtroom}
                        </span>
                      )}
                    </div>
                  </TimelineEntry>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Meetings section */}
      {hasMeetings && (
        <section
          className={cn("mt-4", hasHearings && "mt-5")}
          aria-label="Meetings this week"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-blue-light/50">
            Meetings
          </p>
          <div className="mt-3 space-y-1">
            {meetings.map((m, idx) => {
              const imminent = isWithin24Hours(m.scheduled_at);
              return (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-xl px-3 py-2.5 transition-colors",
                    imminent && "bg-amber-50/60 border border-amber-500/10",
                    !imminent && "hover:bg-base-200/40"
                  )}
                >
                  <TimelineEntry
                    icon={<Video className="h-3.5 w-3.5 text-brand-gold" />}
                    title={m.matter_title}
                    subtitle={`${m.duration_minutes} min`}
                    timestamp={formatDateTimeIndian(m.scheduled_at)}
                    badge={
                      imminent ? (
                        <CountdownBadge days={0} label="Soon" severity="amber" />
                      ) : undefined
                    }
                    isLast={idx === meetings.length - 1}
                  >
                    {m.meeting_link && /^https?:\/\//.test(m.meeting_link) && (
                      <a
                        href={m.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Join meeting for ${m.matter_title}`}
                        className="motion-safe:transition-colors inline-flex items-center gap-1 text-[12px] font-medium text-brand-gold hover:text-brand-gold-light"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Join Meeting
                      </a>
                    )}
                  </TimelineEntry>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </Card>
  );
}

export default TodaysDocket;
