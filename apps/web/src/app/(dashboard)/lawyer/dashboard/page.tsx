"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api/client";
import { useFeatures } from "@/shared/hooks/useFeatures";
import {
  useDashboardSummary,
  isLawyerDashboard,
} from "@/features/matters/hooks/useDashboard";
import type { MatterStatus } from "@/entities/types";
import { QuickStartGuide, PageHeader } from "@/shared/components/ui";
import { SkeletonWidget } from "@/shared/components/ui/DashboardPrimitives";
import TodaysDocket from "@/features/matters/components/TodaysDocket";
import DeadlineAlerts from "@/features/matters/components/DeadlineAlerts";
import PipelineSummary from "@/features/matters/components/PipelineSummary";
import UnifiedInbox from "@/features/matters/components/UnifiedInbox";
import CaseDocketSheet from "@/features/matters/components/CaseDocketSheet";

export default function LawyerDashboard() {
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);

  // Fetch identity for greeting
  const identity = useQuery({
    queryKey: ["identity", "me"],
    queryFn: () => apiClient.get<{ full_name: string }>("/identity/me"),
  });

  // Dashboard aggregation
  const dashboard = useDashboardSummary({ role: "lawyer" });

  // Feature flags
  const { features } = useFeatures();

  const name = identity.data?.full_name?.split(" ")[0] ?? "Advocate";
  const isLoading = dashboard.isLoading;
  const data = dashboard.data && isLawyerDashboard(dashboard.data)
    ? dashboard.data
    : null;

  const handleStatusClick = (status: MatterStatus) => {
    // Navigate to lawyer matters with filter
    window.location.href = `/lawyer/matters?status=${status}`;
  };

  return (
    <>
      <QuickStartGuide />

      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <PageHeader
          eyebrow="Advocate workspace"
          title={`Welcome, ${name}.`}
          subtitle="Your case command center — hearings, deadlines, and incoming work at a glance."
        />

        {/* Pipeline Summary — always visible, shows matter distribution */}
        <section aria-label="Case pipeline">
          <PipelineSummary
            mattersByStatus={data?.matters_by_status ?? {}}
            totalMatters={data?.total_matters ?? 0}
            isLoading={isLoading}
            onStatusClick={handleStatusClick}
          />
        </section>

        {/* Main grid: 2-column on desktop */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-5">
            {/* Today's Docket — hearings and meetings */}
            <TodaysDocket
              hearings={data?.hearings_upcoming ?? []}
              meetings={data?.meetings_upcoming ?? []}
              isLoading={isLoading}
              featHearings={features.hearings}
            />

            {/* Deadline Alerts */}
            <DeadlineAlerts
              deadlines={data?.deadlines ?? []}
              isLoading={isLoading}
            />
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Unified Inbox — requests + consultations + activity */}
            <UnifiedInbox
              requests={data?.pending_requests ?? []}
              consultations={data?.pending_consultations ?? []}
              events={data?.recent_events ?? []}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Matters quick-access list */}
        {data && data.matters.length > 0 && (
          <section aria-label="All assigned matters">
            <div className="rounded-xl border border-brand-gold/12 bg-base-100 overflow-hidden">
              <div className="px-5 pt-4 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-blue-light/50">
                  All Matters ({data.total_matters})
                </p>
              </div>
              <div className="divide-y divide-brand-gold/8">
                {data.matters.map((matter) => (
                  <button
                    key={matter.id}
                    onClick={() => setSelectedMatterId(matter.id)}
                    className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-base-200/50 transition-colors"
                    aria-label={`View details for ${matter.title}`}
                  >
                    {/* Health indicator dot */}
                    <span
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        matter.matter_health === "waiting_on_client"
                          ? "bg-amber-500"
                          : matter.matter_health === "waiting_on_court"
                            ? "bg-brand-blue-light/30"
                            : matter.matter_health === "waiting_on_lawyer"
                              ? "bg-red-400"
                              : "bg-brand-teal"
                      }`}
                    />
                    {/* Title + category */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-brand-blue-dark truncate">
                        {matter.title}
                      </p>
                      <p className="text-[11px] text-brand-blue-light/45">
                        {matter.client_name ?? "—"} · {matter.category.replace("_", " ")}
                      </p>
                    </div>
                    {/* Status */}
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        matter.status === "active"
                          ? "bg-brand-teal/10 text-brand-teal"
                          : matter.status === "matching"
                            ? "bg-brand-gold/10 text-brand-gold"
                            : "bg-base-300/50 text-brand-blue-light/40"
                      }`}
                    >
                      {matter.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Loading fallback for matters list */}
        {isLoading && (
          <SkeletonWidget className="h-40" />
        )}
      </div>

      {/* Case Docket Sheet — slides in from right on matter click */}
      <CaseDocketSheet
        matterId={selectedMatterId}
        onClose={() => setSelectedMatterId(null)}
      />
    </>
  );
}
