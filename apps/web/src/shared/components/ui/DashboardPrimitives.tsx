"use client";

import { type ReactNode } from "react";
import { cn } from "./index";

/**
 * StatCard — Compact KPI/metric display.
 * Uses tabular numerals for financial data alignment.
 */
export function StatCard({
  label,
  value,
  subtitle,
  tone = "neutral",
  onClick,
  className,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: "neutral" | "gold" | "teal" | "red" | "amber";
  onClick?: () => void;
  className?: string;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      aria-label={onClick ? `${label}: ${value}` : undefined}
      className={cn(
        "rounded-xl border bg-base-100 px-4 py-3.5 text-left transition-all duration-200",
        onClick && "cursor-pointer hover:border-brand-gold/30 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98]",
        tone === "neutral" && "border-brand-gold/12",
        tone === "gold" && "border-brand-gold/25 bg-brand-gold/5",
        tone === "teal" && "border-brand-teal/25 bg-brand-teal/5",
        tone === "red" && "border-red-500/20 bg-red-50/50",
        tone === "amber" && "border-amber-500/20 bg-amber-50/50",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-blue-light/50">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-serif text-2xl font-bold tabular-nums",
          tone === "red" && "text-red-600",
          tone === "amber" && "text-amber-600",
          tone === "teal" && "text-brand-teal",
          tone === "gold" && "text-brand-gold",
          (tone === "neutral") && "text-brand-blue-dark",
        )}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-[11px] text-brand-blue-light/45">
          {subtitle}
        </p>
      )}
    </Wrapper>
  );
}

/**
 * Skeleton — Shimmer loading placeholder.
 * Matches the warm-neutral palette for loading states.
 */
export function Skeleton({
  variant = "line",
  width,
  height,
  className,
}: {
  variant?: "line" | "card" | "circle";
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-base-300/50",
        variant === "line" && "h-3 rounded-md",
        variant === "card" && "h-24 rounded-xl",
        variant === "circle" && "h-10 w-10 rounded-full",
        className,
      )}
      style={{ width, height }}
    />
  );
}

/** Multiple skeleton lines for text blocks */
export function SkeletonLines({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          variant="line"
          className={i === count - 1 ? "w-3/4" : undefined}
        />
      ))}
    </div>
  );
}

/** Skeleton card widget for dashboard loading states */
export function SkeletonWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-brand-gold/12 bg-base-100 p-5",
        className,
      )}
      aria-hidden="true"
    >
      <Skeleton variant="line" className="mb-4 h-3.5 w-24" />
      <div className="space-y-3">
        <Skeleton variant="line" />
        <Skeleton variant="line" className="w-5/6" />
        <Skeleton variant="line" className="w-4/6" />
      </div>
    </div>
  );
}

/**
 * CountdownBadge — Displays days remaining with severity-driven coloring.
 * Red < 7 days, amber < 30 days, neutral otherwise.
 */
export function CountdownBadge({
  days,
  label,
  severity,
  className,
}: {
  days: number;
  label?: string;
  severity?: "red" | "amber" | "neutral";
  className?: string;
}) {
  const resolvedSeverity = severity ?? (days <= 7 ? "red" : days <= 30 ? "amber" : "neutral");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide tabular-nums",
        resolvedSeverity === "red" && "border-red-500/25 bg-red-50 text-red-600",
        resolvedSeverity === "amber" && "border-amber-500/25 bg-amber-50 text-amber-700",
        resolvedSeverity === "neutral" && "border-brand-gold/15 bg-base-200 text-brand-blue-light/60",
        className,
      )}
      aria-label={`${days} days remaining${label ? ` — ${label}` : ""}`}
    >
      {resolvedSeverity === "red" && (
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      )}
      {days}d{label ? ` · ${label}` : ""}
    </span>
  );
}

/**
 * SheetPanel — Slide-in detail panel from the right.
 * Used for the case docket sheet on the lawyer dashboard.
 */
export function SheetPanel({
  open,
  onClose,
  title,
  children,
  width = "w-[420px]",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-brand-blue-dark/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title || "Detail panel"}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full flex-col border-l border-brand-gold/12 bg-base-100 shadow-2xl animate-slide-in-right",
          width,
        )}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-brand-gold/12 px-5 py-4">
            <h2 className="font-serif text-lg font-semibold text-brand-blue-dark">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="rounded-lg p-1.5 text-brand-blue-light/40 hover:bg-base-200 hover:text-brand-blue-dark transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </aside>
    </>
  );
}

/**
 * TimelineEntry — Reusable timeline item for activity feeds.
 */
export function TimelineEntry({
  icon,
  title,
  subtitle,
  timestamp,
  badge,
  children,
  isLast = false,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  timestamp: string;
  badge?: ReactNode;
  children?: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-brand-gold/15 bg-base-200 text-brand-blue-light/40">
          {icon || (
            <div className="h-2 w-2 rounded-full bg-brand-gold/40" />
          )}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-brand-gold/10 my-1" />
        )}
      </div>
      {/* Content */}
      <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-brand-blue-dark leading-snug">
              {title}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-brand-blue-light/50">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {badge}
            <time className="text-[10px] text-brand-blue-light/40 tabular-nums whitespace-nowrap">
              {timestamp}
            </time>
          </div>
        </div>
        {children && (
          <div className="mt-1.5 text-[12px] text-brand-blue-light/55 leading-relaxed">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
