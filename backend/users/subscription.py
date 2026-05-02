import calendar
import os
from datetime import datetime

from django.utils import timezone


ROLE_RANK = {
    "standard": 0,
    "premium": 1,
    "enterprise": 2,
}

PAID_ROLES = {"premium", "enterprise"}
PREMIUM_ROOM_HOURS = 10.0


def _parse_price(value, default):
    try:
        num = float(value)
    except (TypeError, ValueError):
        return float(default)
    return num if num >= 0 else float(default)


def get_plan_prices():
    return {
        "standard": _parse_price(os.getenv("PLAN_PRICE_STANDARD"), 49.0),
        "premium": _parse_price(os.getenv("PLAN_PRICE_PREMIUM"), 99.0),
        "enterprise": _parse_price(os.getenv("PLAN_PRICE_ENTERPRISE"), 199.0),
    }


def add_one_month(dt: datetime) -> datetime:
    year = dt.year + (1 if dt.month == 12 else 0)
    month = 1 if dt.month == 12 else dt.month + 1
    last_day = calendar.monthrange(year, month)[1]
    day = min(dt.day, last_day)
    return dt.replace(year=year, month=month, day=day)


def role_change_type(current_role: str, next_role: str) -> str:
    current_rank = ROLE_RANK.get(current_role, 0)
    next_rank = ROLE_RANK.get(next_role, 0)
    if next_rank > current_rank:
        return "upgrade"
    if next_rank < current_rank:
        return "downgrade"
    return "none"


def is_cycle_active(user, now=None):
    now = now or timezone.now()
    end = getattr(user, "subscription_cycle_end", None)
    return bool(end and now < end)


def ensure_paid_cycle(user, now=None, persist=False):
    now = now or timezone.now()
    if getattr(user, "role", None) not in PAID_ROLES:
        return (None, None)

    start = getattr(user, "subscription_cycle_start", None)
    end = getattr(user, "subscription_cycle_end", None)
    if start and end and start < end:
        return (start, end)

    start = now
    end = add_one_month(now)

    if persist:
        user.subscription_cycle_start = start
        user.subscription_cycle_end = end
        user.save(update_fields=["subscription_cycle_start", "subscription_cycle_end"])

    return (start, end)


def compute_proration_estimate(current_role, next_role, cycle_start=None, cycle_end=None, now=None):
    now = now or timezone.now()
    prices = get_plan_prices()
    base_delta = prices.get(next_role, 0.0) - prices.get(current_role, 0.0)
    if base_delta <= 0:
        return 0.0

    if not cycle_start or not cycle_end or now >= cycle_end:
        return round(base_delta, 2)

    total_seconds = (cycle_end - cycle_start).total_seconds()
    remaining_seconds = max(0.0, (cycle_end - now).total_seconds())
    if total_seconds <= 0:
        return round(base_delta, 2)

    prorated = base_delta * (remaining_seconds / total_seconds)
    return round(max(0.0, prorated), 2)


def overlap_hours(start, end, window_start, window_end):
    overlap_start = max(start, window_start)
    overlap_end = min(end, window_end)
    if overlap_end <= overlap_start:
        return 0.0
    return (overlap_end - overlap_start).total_seconds() / 3600.0
