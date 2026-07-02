"""
Dashboard aggregation service.

Provides a single consolidated response for both lawyer and user dashboards,
avoiding N+1 queries from the frontend. Queries are scoped by role:
- Lawyers see their assigned matters + incoming requests + consultations.
- Users see their own matters + consultations + recent updates.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from app.shared.dependencies import CurrentUser, UserRole
from app.domains.matters.deadline_service import compute_deadlines

logger = logging.getLogger(__name__)

_HEARINGS_LOOKAHEAD_DAYS = 7
_MEETINGS_LOOKAHEAD_DAYS = 7
_RECENT_UPDATES_LIMIT = 5
_RECENT_EVENTS_HOURS = 48


class DashboardService:
    __test__ = False

    def __init__(self, db: Any):
        self.db = db

    async def get_summary(self, user: CurrentUser) -> dict[str, Any]:
        """Single aggregated dashboard query for any role."""
        if user.role == UserRole.LAWYER:
            return await self._lawyer_summary(user)
        return await self._user_summary(user)

    # ─── Lawyer Dashboard ──────────────────────────────────────────────

    async def _lawyer_summary(self, user: CurrentUser) -> dict[str, Any]:
        db = self.db

        # 1. All assigned matters (not deleted)
        matters_res = (
            db.table("matters")
            .select("id, title, status, category, priority, matter_health, user_id, created_at, updated_at, next_hearing_at, client_email, up:profiles!user_id(full_name)")
            .eq("lawyer_id", user.id)
            .is_("deleted_at", "null")
            .execute()
        )
        matters = matters_res.data or []

        # Enrich with client name
        for m in matters:
            m["client_name"] = (m.pop("up", None) or {}).get("full_name")

        matter_ids = [m["id"] for m in matters]

        # 2. Counts by status and health
        matters_by_status: dict[str, int] = {}
        matters_by_health: dict[str, int] = {}
        for m in matters:
            s = m.get("status", "active")
            matters_by_status[s] = matters_by_status.get(s, 0) + 1
            h = m.get("matter_health", "in_progress")
            matters_by_health[h] = matters_by_health.get(h, 0) + 1

        # 3. Upcoming hearings (next 7 days)
        hearings_upcoming: list[dict] = []
        if matter_ids:
            now = datetime.utcnow()
            end = now + timedelta(days=_HEARINGS_LOOKAHEAD_DAYS)
            h_res = (
                db.table("hearings")
                .select("id, matter_id, hearing_date, courtroom, judge, purpose, status")
                .in_("matter_id", matter_ids)
                .eq("status", "scheduled")
                .gte("hearing_date", now.isoformat())
                .lte("hearing_date", end.isoformat())
                .order("hearing_date")
                .limit(10)
                .execute()
            )
            hearings_raw = h_res.data or []
            # Attach matter title
            matter_title_map = {m["id"]: m["title"] for m in matters}
            for h in hearings_raw:
                hearings_upcoming.append({
                    "id": h["id"],
                    "matter_id": h["matter_id"],
                    "matter_title": matter_title_map.get(h["matter_id"], ""),
                    "hearing_date": h["hearing_date"],
                    "courtroom": h.get("courtroom"),
                    "judge": h.get("judge"),
                    "purpose": h.get("purpose"),
                })

        # 4. Upcoming meetings (next 7 days)
        meetings_upcoming: list[dict] = []
        if matter_ids:
            now = datetime.utcnow()
            end = now + timedelta(days=_MEETINGS_LOOKAHEAD_DAYS)
            meet_res = (
                db.table("meetings")
                .select("id, matter_id, scheduled_at, duration_minutes, status, meeting_link, notes")
                .in_("matter_id", matter_ids)
                .eq("status", "scheduled")
                .gte("scheduled_at", now.isoformat())
                .lte("scheduled_at", end.isoformat())
                .order("scheduled_at")
                .limit(10)
                .execute()
            )
            meetings_raw = meet_res.data or []
            matter_title_map = {m["id"]: m["title"] for m in matters}
            for mt in meetings_raw:
                meetings_upcoming.append({
                    "id": mt["id"],
                    "matter_id": mt["matter_id"],
                    "matter_title": matter_title_map.get(mt["matter_id"], ""),
                    "scheduled_at": mt["scheduled_at"],
                    "duration_minutes": mt["duration_minutes"],
                    "meeting_link": mt.get("meeting_link"),
                })

        # 5. Pending lawyer_requests
        req_res = (
            db.table("lawyer_requests")
            .select("id, user_id, matter_id, message, status, created_at, up:profiles!user_id(full_name)")
            .eq("lawyer_id", user.id)
            .eq("status", "pending")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        pending_requests = []
        for r in (req_res.data or []):
            pending_requests.append({
                "id": r["id"],
                "user_id": r["user_id"],
                "user_name": (r.pop("up", None) or {}).get("full_name"),
                "matter_id": r.get("matter_id"),
                "message": r.get("message"),
                "created_at": r["created_at"],
            })

        # 6. Pending consultations
        consult_res = (
            db.table("consultations")
            .select("id, user_id, package, sessions_total, sessions_used, status, matter_id, scheduled_at, created_at, up:profiles!user_id(full_name)")
            .eq("lawyer_id", user.id)
            .eq("status", "pending")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        pending_consultations = []
        for c in (consult_res.data or []):
            pending_consultations.append({
                "id": c["id"],
                "user_id": c["user_id"],
                "user_name": (c.pop("up", None) or {}).get("full_name"),
                "package": c["package"],
                "matter_id": c.get("matter_id"),
                "scheduled_at": c.get("scheduled_at"),
                "created_at": c["created_at"],
            })

        # 7. Recent events across all matters (last 48h)
        recent_events: list[dict] = []
        if matter_ids:
            cutoff = (datetime.utcnow() - timedelta(hours=_RECENT_EVENTS_HOURS)).isoformat()
            ev_res = (
                db.table("events")
                .select("id, matter_id, actor_id, event_type, payload, created_at")
                .in_("matter_id", matter_ids)
                .gte("created_at", cutoff)
                .order("created_at", desc=True)
                .limit(15)
                .execute()
            )
            matter_title_map = {m["id"]: m["title"] for m in matters}
            for ev in (ev_res.data or []):
                recent_events.append({
                    "id": ev["id"],
                    "matter_id": ev["matter_id"],
                    "matter_title": matter_title_map.get(ev["matter_id"], ""),
                    "event_type": ev["event_type"],
                    "payload": ev.get("payload", {}),
                    "created_at": ev["created_at"],
                })

        # 8. Deadline alerts
        facts_by_matter: dict[str, list[dict]] = {}
        active_matters = [m for m in matters if m["status"] in ("active", "matching", "assessment")]
        if active_matters:
            active_ids = [m["id"] for m in active_matters]
            facts_res = (
                db.table("facts")
                .select("id, matter_id, key, value, value_type")
                .in_("matter_id", active_ids)
                .execute()
            )
            for f in (facts_res.data or []):
                mid = f["matter_id"]
                if mid not in facts_by_matter:
                    facts_by_matter[mid] = []
                facts_by_matter[mid].append(f)

        deadlines = compute_deadlines(active_matters, facts_by_matter)

        return {
            "role": "lawyer",
            "matters_by_status": matters_by_status,
            "matters_by_health": matters_by_health,
            "total_matters": len(matters),
            "hearings_upcoming": hearings_upcoming,
            "meetings_upcoming": meetings_upcoming,
            "pending_requests": pending_requests,
            "pending_requests_count": len(pending_requests),
            "pending_consultations": pending_consultations,
            "pending_consultations_count": len(pending_consultations),
            "recent_events": recent_events,
            "deadlines": deadlines,
            "matters": [
                {
                    "id": m["id"],
                    "title": m["title"],
                    "status": m["status"],
                    "category": m["category"],
                    "priority": m["priority"],
                    "matter_health": m.get("matter_health", "in_progress"),
                    "client_name": m.get("client_name"),
                    "updated_at": m.get("updated_at"),
                    "next_hearing_at": m.get("next_hearing_at"),
                }
                for m in matters
            ],
        }

    # ─── User Dashboard ────────────────────────────────────────────────

    async def _user_summary(self, user: CurrentUser) -> dict[str, Any]:
        db = self.db

        # 1. All user's matters (not deleted)
        matters_res = (
            db.table("matters")
            .select("id, title, status, category, priority, matter_health, lawyer_id, created_at, updated_at, next_hearing_at, lp:profiles!lawyer_id(full_name)")
            .eq("user_id", user.id)
            .is_("deleted_at", "null")
            .order("updated_at", desc=True)
            .execute()
        )
        matters = matters_res.data or []

        for m in matters:
            m["lawyer_name"] = (m.pop("lp", None) or {}).get("full_name")

        matter_ids = [m["id"] for m in matters]

        # 2. Primary matter (most recent active, or most recent overall)
        primary = None
        active_matters = [m for m in matters if m["status"] == "active"]
        if active_matters:
            primary = active_matters[0]
        elif matters:
            primary = matters[0]

        # 3. Plain-language status mapping for primary matter
        primary_enriched = None
        if primary:
            primary_enriched = {
                **primary,
                "plain_status": _plain_status(primary),
                "next_action": _next_action(primary),
            }

        # 4. Upcoming hearings
        hearings_upcoming: list[dict] = []
        if matter_ids:
            now = datetime.utcnow()
            end = now + timedelta(days=_HEARINGS_LOOKAHEAD_DAYS)
            h_res = (
                db.table("hearings")
                .select("id, matter_id, hearing_date, courtroom, purpose, status")
                .in_("matter_id", matter_ids)
                .eq("status", "scheduled")
                .gte("hearing_date", now.isoformat())
                .lte("hearing_date", end.isoformat())
                .order("hearing_date")
                .limit(5)
                .execute()
            )
            matter_title_map = {m["id"]: m["title"] for m in matters}
            for h in (h_res.data or []):
                hearings_upcoming.append({
                    "id": h["id"],
                    "matter_id": h["matter_id"],
                    "matter_title": matter_title_map.get(h["matter_id"], ""),
                    "hearing_date": h["hearing_date"],
                    "courtroom": h.get("courtroom"),
                    "purpose": h.get("purpose"),
                })

        # 5. Upcoming meetings
        meetings_upcoming: list[dict] = []
        if matter_ids:
            now = datetime.utcnow()
            end = now + timedelta(days=_MEETINGS_LOOKAHEAD_DAYS)
            meet_res = (
                db.table("meetings")
                .select("id, matter_id, scheduled_at, duration_minutes, status, meeting_link")
                .in_("matter_id", matter_ids)
                .eq("status", "scheduled")
                .gte("scheduled_at", now.isoformat())
                .lte("scheduled_at", end.isoformat())
                .order("scheduled_at")
                .limit(5)
                .execute()
            )
            matter_title_map = {m["id"]: m["title"] for m in matters}
            for mt in (meet_res.data or []):
                meetings_upcoming.append({
                    "id": mt["id"],
                    "matter_id": mt["matter_id"],
                    "matter_title": matter_title_map.get(mt["matter_id"], ""),
                    "scheduled_at": mt["scheduled_at"],
                    "duration_minutes": mt["duration_minutes"],
                    "meeting_link": mt.get("meeting_link"),
                })

        # 6. Recent timeline updates across all matters
        recent_updates: list[dict] = []
        if matter_ids:
            upd_res = (
                db.table("matter_updates")
                .select("id, matter_id, author_id, content, is_internal, created_at, ap:profiles!author_id(full_name)")
                .in_("matter_id", matter_ids)
                .eq("is_internal", False)
                .order("created_at", desc=True)
                .limit(_RECENT_UPDATES_LIMIT)
                .execute()
            )
            matter_title_map = {m["id"]: m["title"] for m in matters}
            for u in (upd_res.data or []):
                recent_updates.append({
                    "id": u["id"],
                    "matter_id": u["matter_id"],
                    "matter_title": matter_title_map.get(u["matter_id"], ""),
                    "author_name": (u.pop("ap", None) or {}).get("full_name"),
                    "content": u["content"][:200],  # Truncate for dashboard
                    "created_at": u["created_at"],
                })

        # 7. Pending consultations
        consult_res = (
            db.table("consultations")
            .select("id, lawyer_id, package, status, scheduled_at, created_at, lp:profiles!lawyer_id(full_name)")
            .eq("user_id", user.id)
            .eq("status", "pending")
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        pending_consultations = []
        for c in (consult_res.data or []):
            pending_consultations.append({
                "id": c["id"],
                "lawyer_name": (c.pop("lp", None) or {}).get("full_name"),
                "package": c["package"],
                "scheduled_at": c.get("scheduled_at"),
                "created_at": c["created_at"],
            })

        # 8. Deadlines
        facts_by_matter: dict[str, list[dict]] = {}
        active_for_deadlines = [m for m in matters if m["status"] in ("active", "matching", "assessment")]
        if active_for_deadlines:
            active_ids = [m["id"] for m in active_for_deadlines]
            facts_res = (
                db.table("facts")
                .select("id, matter_id, key, value, value_type")
                .in_("matter_id", active_ids)
                .execute()
            )
            for f in (facts_res.data or []):
                mid = f["matter_id"]
                if mid not in facts_by_matter:
                    facts_by_matter[mid] = []
                facts_by_matter[mid].append(f)

        deadlines = compute_deadlines(active_for_deadlines, facts_by_matter)

        return {
            "role": "user",
            "primary_matter": primary_enriched,
            "all_matters": [
                {
                    "id": m["id"],
                    "title": m["title"],
                    "status": m["status"],
                    "category": m["category"],
                    "matter_health": m.get("matter_health", "in_progress"),
                    "lawyer_name": m.get("lawyer_name"),
                    "updated_at": m.get("updated_at"),
                }
                for m in matters
                if primary is None or m["id"] != primary["id"]
            ],
            "hearings_upcoming": hearings_upcoming,
            "meetings_upcoming": meetings_upcoming,
            "recent_updates": recent_updates,
            "pending_consultations": pending_consultations,
            "deadlines": deadlines,
        }


# ─── Plain-language helpers ────────────────────────────────────────────────

_STATUS_LABELS: dict[str, str] = {
    "draft": "Your case is being set up",
    "intake": "We're gathering your case details",
    "assessment": "Your case is being assessed",
    "matching": "We're finding you a legal advisor",
    "active": "Your case is being actively worked on",
    "resolved": "Your matter has been resolved",
    "archived": "This case is closed and archived",
}

_HEALTH_LABELS: dict[str, str] = {
    "waiting_on_client": "Your advocate needs something from you",
    "waiting_on_lawyer": "Your advocate is reviewing your case",
    "waiting_on_court": "Waiting for the court's next date",
    "in_progress": "Your case is progressing",
}


def _plain_status(matter: dict) -> str:
    """Generate plain-language status for a user's matter."""
    status = matter.get("status", "active")
    health = matter.get("matter_health", "in_progress")

    if status == "active":
        return _HEALTH_LABELS.get(health, "Your case is being actively worked on")
    return _STATUS_LABELS.get(status, "Your case is being processed")


def _next_action(matter: dict) -> str:
    """Generate plain-language next action for the user."""
    status = matter.get("status", "active")
    health = matter.get("matter_health", "in_progress")

    if status == "matching":
        return "Sit tight — we'll notify you when a lawyer is assigned"
    if status == "active" and health == "waiting_on_client":
        return "Check your messages — your advocate may need documents or information"
    if status == "active" and health == "waiting_on_court":
        return "No action needed — we'll notify you when the court date is set"
    if status == "resolved":
        return "Review the resolution summary in your case file"
    return "No action needed from you right now"
