"use client";

import Link from "next/link";
import { MessageSquare, ChevronRight } from "lucide-react";
import { Card, EmptyState } from "@/shared/components/ui";
import { SkeletonLines } from "@/shared/components/ui/DashboardPrimitives";
import type { DashboardUpdate } from "@/features/matters/hooks/useDashboard";

// ── Helpers ─────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

// ── Component ───────────────────────────────────────────────────────

interface RecentUpdatesProps {
  updates: DashboardUpdate[];
  isLoading: boolean;
}

export default function RecentUpdates({ updates, isLoading }: RecentUpdatesProps) {
  if (isLoading) {
    return (
      <Card className="p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-blue-light/50 mb-3">
          Recent Updates
        </p>
        <SkeletonLines count={3} />
      </Card>
    );
  }

  if (updates.length === 0) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={MessageSquare}
          title="No updates yet"
          body="We'll notify you when your advocate posts an update on your case."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-blue-light/50">
          Recent Updates
        </p>
      </div>

      <div className="divide-y divide-brand-gold/8">
        {updates.map((update) => (
          <Link
            key={update.id}
            href={`/user/matters/${update.matter_id}`}
            className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-base-200/50 group"
            aria-label={`Update on ${update.matter_title} from ${update.author_name}`}
          >
            {/* Author avatar */}
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-[10px] font-bold text-brand-accent mt-0.5">
              {(update.author_name ?? "?").charAt(0).toUpperCase()}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-brand-blue-dark">
                  {update.author_name ?? "Your advocate"}
                </span>
                <span className="text-[10px] text-brand-blue-light/40 tabular-nums">
                  {timeAgo(update.created_at)}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-brand-blue-light/60 leading-relaxed line-clamp-2">
                {update.content}
              </p>
              <p className="mt-1 text-[10px] text-brand-blue-light/40">
                on {update.matter_title}
              </p>
            </div>

            <ChevronRight className="h-4 w-4 flex-shrink-0 text-brand-blue-light/15 group-hover:text-brand-gold mt-1 transition-colors" />
          </Link>
        ))}
      </div>
    </Card>
  );
}
