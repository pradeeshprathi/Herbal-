"""Automatic, time based order tracking.

Each order walks through TRACKING_STAGES. The stage of an order is derived from
how long ago it was placed and settings.stage_seconds, then written back to the
database with a timestamped event so the customer timeline stays complete even
after a restart.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import STAGE_KEYS, TRACKING_STAGES, settings
from ..models import Order, OrderEvent

log = logging.getLogger("buddy-herbal.tracking")

STAGE_LABELS = {s["key"]: s["label"] for s in TRACKING_STAGES}
STAGE_NOTES = {s["key"]: s["note"] for s in TRACKING_STAGES}


def as_aware(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def stage_index_for(order: Order) -> int:
    """How far along the journey this order should be right now."""
    if order.status == "delivered" or not order.auto_track:
        idx = STAGE_KEYS.index(order.status) if order.status in STAGE_KEYS else 0
        return idx
    if settings.stage_seconds <= 0:
        return STAGE_KEYS.index("ordered")

    elapsed = (datetime.now(timezone.utc) - as_aware(order.created_at)).total_seconds()
    idx = int(elapsed // settings.stage_seconds)
    return max(0, min(idx, len(STAGE_KEYS) - 1))


def sync_order(db: Session, order: Order) -> Order:
    """Advance an order's status if its time has come. Caller commits."""
    target = stage_index_for(order)
    current = STAGE_KEYS.index(order.status) if order.status in STAGE_KEYS else 0
    if target > current:
        for idx in range(current + 1, target + 1):
            key = STAGE_KEYS[idx]
            order.status = key
            db.add(
                OrderEvent(
                    order_id=order.id,
                    status=key,
                    note=STAGE_NOTES[key],
                    created_at=datetime.now(timezone.utc),
                )
            )
        order.updated_at = datetime.now(timezone.utc)
    return order


def serialise_timeline(order: Order) -> list[dict]:
    """Full journey with reached flags and timestamps."""
    events = {e.status: e.created_at for e in order.events}
    current = STAGE_KEYS.index(order.status) if order.status in STAGE_KEYS else 0
    timeline = []
    for idx, stage in enumerate(TRACKING_STAGES):
        at = events.get(stage["key"])
        timeline.append(
            {
                "key": stage["key"],
                "label": stage["label"],
                "note": stage["note"],
                "icon": stage["icon"],
                "reached": idx <= current,
                "active": idx == current,
                "at": as_aware(at).isoformat() if at else None,
                "eta_seconds": max(0, (idx - current)) * settings.stage_seconds,
            }
        )
    return timeline


def next_stage_in(order: Order) -> int:
    current = STAGE_KEYS.index(order.status) if order.status in STAGE_KEYS else 0
    if current >= len(STAGE_KEYS) - 1:
        return 0
    elapsed = (datetime.now(timezone.utc) - as_aware(order.created_at)).total_seconds()
    target_at = (current + 1) * settings.stage_seconds
    return max(0, int(target_at - elapsed))


async def tracking_worker(interval: float = 5.0) -> None:
    """Background loop that moves every live order forward."""
    from ..database import SessionLocal

    log.info("order tracking worker started (stage=%ss)", settings.stage_seconds)
    while True:
        try:
            await asyncio.sleep(interval)
            if settings.stage_seconds <= 0:
                continue
            with SessionLocal() as db:
                live = db.scalars(
                    select(Order).where(Order.status != "delivered", Order.auto_track.is_(True))
                ).all()
                changed = False
                for order in live:
                    before = order.status
                    sync_order(db, order)
                    if order.status != before:
                        changed = True
                        log.info("order %s advanced to %s", order.code, order.status)
                if changed:
                    db.commit()
        except asyncio.CancelledError:
            log.info("order tracking worker stopped")
            raise
        except Exception as exc:  # keep the loop alive no matter what
            log.warning("tracking worker error: %s", exc)
