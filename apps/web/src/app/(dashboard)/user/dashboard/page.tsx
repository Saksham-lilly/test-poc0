"use client";

import Link from "next/link";
import { Plus, Users, FileText, BookOpen, Scale, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api/client";
import { useFeatures } from "@/shared/hooks/useFeatures";
import {
  useDashboardSummary,
  isUserDashboard,
} from "@/features/matters/hooks/useDashboard";
import { QuickStartGuide, Badge, PageHeader } from "@/shared/components/ui";
import { SkeletonWidget } from "@/shared/components/ui/DashboardPrimitives";
import CaseHeroCard from "@/features/matters/components/CaseHeroCard";
import UpcomingEvents from "@/features/matters/components/UpcomingEvents";
import RecentUpdates from "@/features/matters/components/RecentUpdates";

// ── Health display config ───────────────────────────────────────────

const HEALTH_DOT: Record<string, string> = {
  waiting_on_client: "bg-amber-400",
  waiting_on_lawyer: "bg-blue-400",
  waiting_on_court: "bg-slate-400",
  in_progress: "bg-brand-teal",
};

const HEALTH_LABEL: Record<string, string> = {
  waiting_on_client: "Needs your attention",
  waiting_on_lawyer: "Advocate is working",
  waiting_on_court: "Waiting on court",
  in_progress: "In progress",
};

// ── Page ────────────────────────────────────────────────────────────

export default function UserDashboard() {
  // Identity for greeting + lawyer verification banner
  const { data: me, isLoading: loadingUser } = useQuery({
    queryKey: ["identity", "me"],
    queryFn: () =>
      apiClient.get<{ full_name?: string; lawyer_profile?: { is_verified: boolean } | null }>(
        "/identity/me"
      ),
  });

  // Dashboard aggregation (single endpoint)
  const dashboard = useDashboardSummary({ role: "user" });
  const { features } = useFeatures();

  const name = (me?.full_name ?? "there").split(" ")[0];
  const lawyerProfile = me?.lawyer_profile;
  const isLoading = dashboard.isLoading || loadingUser;
  const data = dashboard.data && isUserDashboard(dashboard.data) ? dashboard.data : null;

  return (
    <>
      <QuickStartGuide />

      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <PageHeader
          eyebrow="Welcome back"
          title={`Hello, ${name}.`}
          subtitle="Here's what's happening with your case."
        />

        {/* Lawyer verification pending banner */}
        {lawyerProfile && !lawyerProfile.is_verified && (
          <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/8 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-gold/15 text-brand-gold">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <p className="font-serif text-base font-bold text-brand-blue-dark">
                  Advocate Application Pending Verification
                </p>
                <p className="mt-1 text-xs leading-5 text-brand-blue-light/70">
                  Your request to register as a lawyer is being reviewed. You can browse and use the platform as a petitioner in the meantime.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero: Your case right now */}
        <section aria-label="Your primary case">
          <CaseHeroCard
            matter={data?.primary_matter ?? null}
            isLoading={isLoading}
          />
        </section>

        {/* Two-column on desktop: Upcoming & Updates */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Upcoming events */}
          <section aria-label="Upcoming events and deadlines">
            <UpcomingEvents
              hearings={data?.hearings_upcoming ?? []}
              meetings={data?.meetings_upcoming ?? []}
              deadlines={data?.deadlines ?? []}
              isLoading={isLoading}
              featHearings={features.hearings}
            />
          </section>

          {/* Recent updates */}
          <section aria-label="Recent updates from your advocates">
            <RecentUpdates
              updates={data?.recent_updates ?? []}
              isLoading={isLoading}
            />
          </section>
        </div>

        {/* Other cases (if multiple) */}
        {data && data.all_matters.length > 0 && (
          <section aria-label="Your other cases">
            <div className="rounded-xl border border-brand-gold/12 bg-base-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-brand-gold/8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-blue-light/50">
                  Your Other Cases
                </p>
                <Link
                  href="/user/matters"
                  className="text-[11px] font-semibold text-brand-gold hover:text-brand-gold-light transition-colors"
                >
                  View all →
                </Link>
              </div>
              <div className="divide-y divide-brand-gold/8">
                {data.all_matters.slice(0, 4).map((m) => {
                  const health = m.matter_health ?? "in_progress";
                  return (
                    <Link
                      key={m.id}
                      href={`/user/matters/${m.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-base-200/50 group"
                      aria-label={`View case: ${m.title}`}
                    >
                      <span
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${HEALTH_DOT[health] ?? "bg-brand-teal"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-brand-blue-dark truncate">
                          {m.title}
                        </p>
                        <p className="text-[11px] text-brand-blue-light/45">
                          {HEALTH_LABEL[health] ?? "In progress"}
                          {m.lawyer_name ? ` · Adv. ${m.lawyer_name}` : ""}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-brand-blue-light/20 group-hover:text-brand-gold transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Pending consultations */}
        {data && data.pending_consultations.length > 0 && (
          <section aria-label="Pending consultations">
            <div className="rounded-xl border border-brand-gold/12 bg-base-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-brand-gold/8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-blue-light/50">
                  Pending Consultations
                </p>
                <p className="text-[11px] text-brand-blue-light/40 mt-0.5">
                  Waiting for the lawyer to confirm
                </p>
              </div>
              <div className="divide-y divide-brand-gold/8">
                {data.pending_consultations.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-[13px] font-medium text-brand-blue-dark">
                        {c.lawyer_name ?? "Platform Assigned Lawyer"}
                      </p>
                      <p className="text-[11px] text-brand-blue-light/45 capitalize">
                        {c.package} package · Requested{" "}
                        {new Date(c.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <Badge tone="gold">Pending</Badge>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Quick actions — now secondary, below the main dashboard content */}
        <section aria-label="Quick actions">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/user/matters", icon: Plus, label: "New case", desc: "Describe what happened" },
              { href: "/user/lawyers", icon: Users, label: "Find a lawyer", desc: "Browse verified advocates" },
              { href: "/user/legal-notice", icon: FileText, label: "Draft notice", desc: "Generate a legal notice" },
              { href: "/user/matters", icon: BookOpen, label: "All cases", desc: "View all your matters" },
            ].map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={label}
                href={href}
                className="group flex items-center gap-3 rounded-xl border border-brand-gold/10 bg-base-100 px-4 py-3 transition-all hover:border-brand-gold/25 hover:shadow-sm"
                aria-label={label}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-gold/8 text-brand-gold group-hover:bg-brand-gold/15 transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-brand-blue-dark">{label}</p>
                  <p className="text-[10px] text-brand-blue-light/45">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Loading fallback */}
        {isLoading && !data && (
          <div className="space-y-5">
            <SkeletonWidget className="h-52" />
            <div className="grid gap-5 md:grid-cols-2">
              <SkeletonWidget className="h-40" />
              <SkeletonWidget className="h-40" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
