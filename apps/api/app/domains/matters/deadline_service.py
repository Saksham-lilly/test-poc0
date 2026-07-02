"""
Deadline computation service.

Reads matter facts and applies limitation-period logic from legal calculators
to surface approaching deadlines. Reuses the same statutory rules as the
legal_tools calculators but operates in bulk across a user's matters.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

from dateutil.relativedelta import relativedelta

from app.shared.court_calendar import next_working_day

logger = logging.getLogger(__name__)

# Fact keys used per category for deadline computation
_CHEQUE_BOUNCE_KEYS = {
    "cheque_date",
    "dishonour_date",
    "notice_date",
    "notice_receipt_date",
    "complaint_filed_date",
}
_RERA_KEYS = {"promised_possession_date", "actual_possession_date"}
_CPC_KEYS = {"due_date", "claim_amount"}

_DEADLINE_LOOKAHEAD_DAYS = 60


def compute_deadlines(
    matters: list[dict],
    facts_by_matter: dict[str, list[dict]],
    *,
    current_date: date | None = None,
) -> list[dict[str, Any]]:
    """
    Compute approaching deadlines for a list of matters based on their facts.

    Returns a list of deadline objects sorted by urgency (fewest days_remaining first).
    Only includes deadlines within _DEADLINE_LOOKAHEAD_DAYS.
    """
    now = current_date or date.today()
    deadlines: list[dict[str, Any]] = []

    for matter in matters:
        matter_id = matter["id"]
        category = matter.get("category", "other")
        title = matter.get("title", "Untitled")
        facts = facts_by_matter.get(matter_id, [])

        # Build fact lookup: key -> value
        fact_map = {f["key"]: f["value"] for f in facts if f.get("value")}

        if category == "cheque_bounce":
            deadline = _cheque_bounce_deadline(fact_map, now)
            if deadline:
                deadline["matter_id"] = matter_id
                deadline["matter_title"] = title
                deadline["category"] = category
                deadlines.append(deadline)

        elif category == "rera":
            deadline = _rera_deadline(fact_map, now)
            if deadline:
                deadline["matter_id"] = matter_id
                deadline["matter_title"] = title
                deadline["category"] = category
                deadlines.append(deadline)

        elif category in ("consumer", "property", "labour", "cyber", "other"):
            deadline = _general_limitation_deadline(fact_map, now)
            if deadline:
                deadline["matter_id"] = matter_id
                deadline["matter_title"] = title
                deadline["category"] = category
                deadlines.append(deadline)

    # Sort by days_remaining ascending (most urgent first)
    deadlines.sort(key=lambda d: d["days_remaining"])
    return deadlines


def _parse_date(value: str | None) -> date | None:
    """Safely parse a date string in ISO format."""
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def _cheque_bounce_deadline(
    fact_map: dict[str, str], now: date
) -> dict[str, Any] | None:
    """
    Section 138 NI Act deadlines:
    - 30-day notice period after dishonour
    - 15-day grace period after notice receipt
    - 30-day filing window after grace period
    """
    dishonour_date = _parse_date(fact_map.get("dishonour_date"))
    notice_date = _parse_date(fact_map.get("notice_date"))
    notice_receipt_date = _parse_date(fact_map.get("notice_receipt_date"))
    complaint_filed_date = _parse_date(fact_map.get("complaint_filed_date"))

    # Already filed — no pending deadline
    if complaint_filed_date:
        return None

    if notice_receipt_date:
        # Filing window: 15 days grace + 1 month
        wait_end = notice_receipt_date + timedelta(days=15)
        filing_deadline = next_working_day(wait_end + relativedelta(months=1))
        days_remaining = (filing_deadline - now).days

        if days_remaining < 0:
            return None  # Expired — not a "deadline", it's too late

        if days_remaining <= _DEADLINE_LOOKAHEAD_DAYS:
            severity = "red" if days_remaining <= 7 else "amber" if days_remaining <= 30 else "neutral"
            return {
                "deadline_type": "§138 Filing Window",
                "deadline_date": str(filing_deadline),
                "days_remaining": days_remaining,
                "severity": severity,
                "description": f"File complaint before {filing_deadline.strftime('%d %b %Y')}",
            }

    elif notice_date and not notice_receipt_date:
        # Waiting for receipt — soft reminder but no hard deadline for lawyer
        return None

    elif dishonour_date and not notice_date:
        # Notice must be sent within 30 days of dishonour
        notice_deadline = next_working_day(dishonour_date + timedelta(days=30))
        days_remaining = (notice_deadline - now).days

        if days_remaining < 0:
            return None  # Expired

        if days_remaining <= _DEADLINE_LOOKAHEAD_DAYS:
            severity = "red" if days_remaining <= 7 else "amber" if days_remaining <= 30 else "neutral"
            return {
                "deadline_type": "§138 Notice Deadline",
                "deadline_date": str(notice_deadline),
                "days_remaining": days_remaining,
                "severity": severity,
                "description": f"Send legal notice before {notice_deadline.strftime('%d %b %Y')}",
            }

    return None


def _rera_deadline(fact_map: dict[str, str], now: date) -> dict[str, Any] | None:
    """
    RERA Section 18 — delay interest accrues from promised possession date.
    No hard filing deadline, but flag if delay exceeds 1 year (common trigger
    for filing with RERA authority).
    """
    promised = _parse_date(fact_map.get("promised_possession_date"))
    actual = _parse_date(fact_map.get("actual_possession_date"))

    if not promised or actual:
        return None  # Either no date or already received possession

    delay_days = (now - promised).days
    if delay_days <= 0:
        return None  # Not delayed yet

    # RERA complaints should ideally be filed within 1 year of builder's failure
    one_year_deadline = promised + relativedelta(years=1)
    days_remaining = (one_year_deadline - now).days

    if days_remaining < 0:
        # Already past 1 year — flag as urgent
        return {
            "deadline_type": "RERA §18 Complaint Window",
            "deadline_date": str(one_year_deadline),
            "days_remaining": 0,
            "severity": "red",
            "description": f"Possession delayed {delay_days} days. File RERA complaint immediately.",
        }

    if days_remaining <= _DEADLINE_LOOKAHEAD_DAYS:
        severity = "red" if days_remaining <= 7 else "amber" if days_remaining <= 30 else "neutral"
        return {
            "deadline_type": "RERA §18 Complaint Window",
            "deadline_date": str(one_year_deadline),
            "days_remaining": days_remaining,
            "severity": severity,
            "description": f"Possession delayed {delay_days} days. Consider filing before {one_year_deadline.strftime('%d %b %Y')}.",
        }

    return None


def _general_limitation_deadline(
    fact_map: dict[str, str], now: date
) -> dict[str, Any] | None:
    """
    General 3-year limitation period under Limitation Act 1963, Article 137.
    Applicable to civil suits, consumer complaints, etc.
    """
    # Try common date keys that represent the cause of action
    cause_date = (
        _parse_date(fact_map.get("incident_date"))
        or _parse_date(fact_map.get("due_date"))
        or _parse_date(fact_map.get("cause_of_action_date"))
    )

    if not cause_date:
        return None

    limitation_expiry = next_working_day(cause_date + relativedelta(years=3))
    days_remaining = (limitation_expiry - now).days

    if days_remaining < 0 or days_remaining > _DEADLINE_LOOKAHEAD_DAYS:
        return None

    severity = "red" if days_remaining <= 7 else "amber" if days_remaining <= 30 else "neutral"
    return {
        "deadline_type": "Limitation Period (Art. 137)",
        "deadline_date": str(limitation_expiry),
        "days_remaining": days_remaining,
        "severity": severity,
        "description": f"File before {limitation_expiry.strftime('%d %b %Y')} to avoid time-bar.",
    }
