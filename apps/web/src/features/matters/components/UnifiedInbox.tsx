"use client";

import { useState } from "react";
import { Card, Badge, Button, cn, EmptyState } from "@/shared/components/ui";
import {
  TimelineEntry,
  SkeletonLines,
} from "@/shared/components/ui/DashboardPrimitives";
import type {
  PendingRequest,
  PendingConsultation,
  DashboardEvent,
} from "@/features/matters/hooks/useDashboard";
import { Inbox, Users, MessageSquare, Activity, Check, X } from "lucide-react";
import { useRespondToRequest } from "@/features/matching/hooks/useLawyers";
import {
  useConfirmConsultation,
  useDeclineConsultation,
} from "@/features/consultations/hooks/useConsultations";

interface UnifiedInboxProps {
  requests: PendingRequest[];
  consultations: PendingConsultation[];
  events: DashboardEvent[];
  isLoading: boolean;
}

type TabKey = "requests" | "consultations" | "activity";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

const EVENT_LABELS: Record<string, string> = {
  "matter.created": "New matter created",
  "fact.verified": "Fact verified",
  "document.uploaded": "Document uploaded",
  "consultation.scheduled": "Consultation scheduled",
  "consultation.completed": "Consultation completed",
  "request.accepted": "Request accepted",
  "request.declined": "Request declined",
  "matter.closed": "Matter closed",
  "note.added": "Note added",
  "status.changed": "Status changed",
};

const MAX_ITEMS = 5;

function UnifiedInbox({
  requests,
  consultations,
  events,
  isLoading,
}: UnifiedInboxProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("requests");

  const respondToRequest = useRespondToRequest();
  const confirmConsultation = useConfirmConsultation();
  const declineConsultation = useDeclineConsultation();

  const tabs: { key: TabKey; label: string; count?: number; icon: React.ReactNode }[] = [
    {
      key: "requests",
      label: "Requests",
      count: requests.length,
      icon: <Inbox className="h-3.5 w-3.5" />,
    },
    {
      key: "consultations",
      label: "Consultations",
      count: consultations.length,
      icon: <Users className="h-3.5 w-3.5" />,
    },
    {
      key: "activity",
      label: "Activity",
      icon: <Activity className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <Card className="overflow-hidden">
      {/* Tab bar */}
      <div className="border-b border-brand-gold/12 flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "relative px-4 py-3 text-[12px] font-semibold flex items-center gap-1.5 transition-colors",
              activeTab === tab.key
                ? "text-brand-gold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-brand-gold/15 text-brand-gold text-[10px] font-semibold">
                {tab.count}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {isLoading ? (
          <div className="px-4 py-4">
            <SkeletonLines />
          </div>
        ) : (
          <>
            {activeTab === "requests" && (
              <RequestsTab
                requests={requests.slice(0, MAX_ITEMS)}
                respondToRequest={respondToRequest}
              />
            )}
            {activeTab === "consultations" && (
              <ConsultationsTab
                consultations={consultations.slice(0, MAX_ITEMS)}
                confirmConsultation={confirmConsultation}
                declineConsultation={declineConsultation}
              />
            )}
            {activeTab === "activity" && (
              <ActivityTab events={events.slice(0, MAX_ITEMS)} />
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function RequestsTab({
  requests,
  respondToRequest,
}: {
  requests: PendingRequest[];
  respondToRequest: ReturnType<typeof useRespondToRequest>;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No pending requests"
        body="New client requests will appear here"
      />
    );
  }

  return (
    <div>
      {requests.map((request) => (
        <div
          key={request.id}
          className="px-4 py-3.5 hover:bg-base-200/50 transition border-b border-brand-gold/8 last:border-0 flex items-center justify-between gap-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {request.user_name}
              </span>
              <span className="text-[11px] text-muted-foreground flex-shrink-0">
                {timeAgo(request.created_at)}
              </span>
            </div>
            {request.message && (
              <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                {request.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant="gold"
              disabled={respondToRequest.isPending}
              onClick={() =>
                respondToRequest.mutate({
                  requestId: request.id,
                  accept: true,
                })
              }
              aria-label={`Accept request from ${request.user_name}`}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={respondToRequest.isPending}
              onClick={() =>
                respondToRequest.mutate({
                  requestId: request.id,
                  accept: false,
                })
              }
              aria-label={`Decline request from ${request.user_name}`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsultationsTab({
  consultations,
  confirmConsultation,
  declineConsultation,
}: {
  consultations: PendingConsultation[];
  confirmConsultation: ReturnType<typeof useConfirmConsultation>;
  declineConsultation: ReturnType<typeof useDeclineConsultation>;
}) {
  if (consultations.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No pending consultations"
        body="Consultation requests will appear here"
      />
    );
  }

  return (
    <div>
      {consultations.map((consultation) => (
        <div
          key={consultation.id}
          className="px-4 py-3.5 hover:bg-base-200/50 transition border-b border-brand-gold/8 last:border-0 flex items-center justify-between gap-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">
                {consultation.user_name}
              </span>
              <Badge tone="gold" className="text-[10px] px-1.5 py-0">
                {consultation.package}
              </Badge>
              <span className="text-[11px] text-muted-foreground flex-shrink-0">
                {timeAgo(consultation.created_at)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant="gold"
              disabled={confirmConsultation.isPending}
              onClick={() =>
                confirmConsultation.mutate(consultation.id)
              }
              aria-label={`Confirm consultation from ${consultation.user_name}`}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={declineConsultation.isPending}
              onClick={() =>
                declineConsultation.mutate(consultation.id)
              }
              aria-label={`Decline consultation from ${consultation.user_name}`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityTab({ events }: { events: DashboardEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No recent activity"
        body="Activity events will appear here as matters progress"
      />
    );
  }

  return (
    <div className="px-4 py-3">
      {events.map((event) => (
        <TimelineEntry
          key={event.id}
          title={EVENT_LABELS[event.event_type] ?? event.event_type}
          subtitle={event.matter_title}
          timestamp={timeAgo(event.created_at)}
        />
      ))}
    </div>
  );
}

export default UnifiedInbox;
