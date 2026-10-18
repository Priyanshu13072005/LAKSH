"""
LAKSH - Datetime utilities.
"""

from datetime import datetime, date, timedelta, timezone


def utc_now() -> datetime:
    """Current UTC datetime."""
    return datetime.now(timezone.utc)


def today_utc() -> date:
    """Current UTC date."""
    return datetime.now(timezone.utc).date()


def start_of_week(d: date) -> date:
    """Return Monday of the week containing the given date."""
    return d - timedelta(days=d.weekday())


def date_range(start: date, end: date):
    """Yield dates from start to end inclusive."""
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)
