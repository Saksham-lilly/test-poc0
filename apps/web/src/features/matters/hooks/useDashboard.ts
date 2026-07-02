import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api/client";
import type {
  MatterStatus,
  MatterCategory,
  MatterHealthStatus,
  MatterPriority,
} from "@/entities/types";

// ── Types ────────────────────────────────────────────────────────────

export interface DashboardDeadline {
  matter_id: string;
  matter_title: string;
  category: MatterCategory;
  deadline_type: string;
  deadline_date: string;
  days_remaining: number;
  severity: "red" | "amber" | "neutral";
  description: string;
}

export interface DashboardHearing {
  id: string;
  matter_id: string;
  matter_title: string;
  hearing_date: string;
  courtroom?: string;
  judge?: string;
  purpose?: string;
}

export interface DashboardMeeting {
  id: string;
  matter_id: string;
  matter_title: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link?: string;
}

export interface DashboardEvent {
  id: string;
  matter_id: string;
  matter_title: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface DashboardMatterSummary {
  id: string;
  title: string;
  status: MatterStatus;
  category: MatterCategory;
  priority?: MatterPriority;
  matter_health: MatterHealthStatus;
  client_name?: string;
  lawyer_name?: string;
  updated_at: string;
  next_hearing_at?: string;
}

export interface PendingRequest {
  id: string;
  user_id: string;
  user_name?: string;
  matter_id?: string;
  message?: string;
  created_at: string;
}

export interface PendingConsultation {
  id: string;
  user_id?: string;
  user_name?: string;
  lawyer_name?: string;
  package: string;
  matter_id?: string;
  scheduled_at?: string;
  created_at: string;
}

export interface DashboardUpdate {
  id: string;
  matter_id: string;
  matter_title: string;
  author_name?: string;
  content: string;
  created_at: string;
}

// ── Lawyer Dashboard Response ────────────────────────────────────────

export interface LawyerDashboardSummary {
  role: "lawyer";
  matters_by_status: Partial<Record<MatterStatus, number>>;
  matters_by_health: Partial<Record<MatterHealthStatus, number>>;
  total_matters: number;
  hearings_upcoming: DashboardHearing[];
  meetings_upcoming: DashboardMeeting[];
  pending_requests: PendingRequest[];
  pending_requests_count: number;
  pending_consultations: PendingConsultation[];
  pending_consultations_count: number;
  recent_events: DashboardEvent[];
  deadlines: DashboardDeadline[];
  matters: DashboardMatterSummary[];
}

// ── User Dashboard Response ──────────────────────────────────────────

export interface UserPrimaryMatter extends DashboardMatterSummary {
  plain_status: string;
  next_action: string;
}

export interface UserDashboardSummary {
  role: "user";
  primary_matter: UserPrimaryMatter | null;
  all_matters: DashboardMatterSummary[];
  hearings_upcoming: DashboardHearing[];
  meetings_upcoming: DashboardMeeting[];
  recent_updates: DashboardUpdate[];
  pending_consultations: PendingConsultation[];
  deadlines: DashboardDeadline[];
}

export type DashboardSummary = LawyerDashboardSummary | UserDashboardSummary;

// ── Query Keys ───────────────────────────────────────────────────────

export const dashboardKeys = {
  summary: () => ["dashboard", "summary"] as const,
};

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Fetches aggregated dashboard data for the current user.
 * Returns role-specific data (lawyer vs user) from a single endpoint.
 *
 * - Lawyer dashboard: polls every 30s for real-time feel
 * - User dashboard: uses default 60s staleTime
 */
export function useDashboardSummary(options?: { role?: "lawyer" | "user" }) {
  const isLawyer = options?.role === "lawyer";

  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => apiClient.get<DashboardSummary>("/matters/dashboard-summary"),
    staleTime: isLawyer ? 15_000 : 60_000,
    refetchInterval: isLawyer ? 30_000 : false,
  });
}

// ── Type Guards ──────────────────────────────────────────────────────

export function isLawyerDashboard(
  data: DashboardSummary
): data is LawyerDashboardSummary {
  return data.role === "lawyer";
}

export function isUserDashboard(
  data: DashboardSummary
): data is UserDashboardSummary {
  return data.role === "user";
}
