"""Owner access: sign in, see every order, act on it.

All routes except /login and /session are guarded by the owner cookie.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..config import STAGE_KEYS, TRACKING_STAGES, settings
from ..database import get_db
from ..models import Order, WaMessage
from ..schemas import OwnerLoginIn, OwnerStatusIn
from ..services.order_flow import find_order, serialise_order, set_status
from ..services.owner_auth import COOKIE_NAME, check_password, create_token, require_owner, verify_token
from ..services.tracking import sync_order
from ..services.whatsapp import (
    click_to_chat,
    normalise_phone,
    order_confirmation_text,
    send_whatsapp,
)

router = APIRouter(prefix="/api/owner", tags=["owner"])


@router.post("/login")
def login(payload: OwnerLoginIn, response: Response) -> dict:
    if not check_password(payload.password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    hours = settings.owner_session_hours
    response.set_cookie(
        key=COOKIE_NAME,
        value=create_token(hours),
        max_age=hours * 3600,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return {"ok": True, "expires_in_hours": hours}


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/session")
def session(request: Request) -> dict:
    """Never reveals the password - only whether this browser is signed in."""
    return {
        "authenticated": verify_token(request.cookies.get(COOKIE_NAME)),
        "using_default_password": settings.owner_using_default,
        "session_hours": settings.owner_session_hours,
    }


@router.get("/overview")
def overview(
    limit: int = Query(default=60, ge=1, le=300),
    q: str = Query(default="", max_length=60),
    _: bool = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    """Dashboard feed. `q` searches every order (code, phone or name), not just this page."""
    term = (q or "").strip()
    stmt = select(Order).options(selectinload(Order.items), selectinload(Order.events))
    if term:
        needle = f"%{term}%"
        digits = "".join(ch for ch in term if ch.isdigit())
        clauses = [
            Order.code.ilike(needle),
            Order.customer_name.ilike(needle),
            Order.phone.ilike(needle),
        ]
        if digits and digits != term:
            clauses.append(Order.phone.ilike(f"%{digits}%"))
        stmt = stmt.where(or_(*clauses))
    rows = db.scalars(
        stmt.order_by(Order.id.desc()).limit(300 if term else limit)
    ).unique().all()

    # keep live statuses fresh before we show them
    changed = False
    for order in rows:
        before = order.status
        sync_order(db, order)
        changed = changed or order.status != before
    if changed:
        db.commit()

    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    naive_day_start = day_start.replace(tzinfo=None)

    total_orders = db.scalar(select(func.count(Order.id))) or 0
    revenue = float(db.scalar(select(func.coalesce(func.sum(Order.total), 0.0))) or 0.0)
    delivered = db.scalar(select(func.count(Order.id)).where(Order.status == "delivered")) or 0
    today_orders = db.scalar(
        select(func.count(Order.id)).where(Order.created_at >= naive_day_start)
    ) or 0
    today_revenue = float(
        db.scalar(
            select(func.coalesce(func.sum(Order.total), 0.0)).where(
                Order.created_at >= naive_day_start
            )
        )
        or 0.0
    )

    notifications = db.scalars(
        select(WaMessage)
        .where(
            WaMessage.phone == normalise_phone(settings.whatsapp_number),
            WaMessage.direction == "out",
        )
        .order_by(WaMessage.id.desc())
        .limit(10)
    ).all()

    return {
        "ok": True,
        "server_time": datetime.now(timezone.utc).isoformat(),
        "whatsapp_live": settings.whatsapp_live,
        "stage_seconds": settings.stage_seconds,
        "using_default_password": settings.owner_using_default,
        "stats": {
            "orders": total_orders,
            "revenue": round(revenue, 2),
            "delivered": delivered,
            "in_progress": total_orders - delivered,
            "today_orders": today_orders,
            "today_revenue": round(today_revenue, 2),
            "average_order": round(revenue / total_orders, 2) if total_orders else 0.0,
        },
        "statuses": [{"key": s["key"], "label": s["label"]} for s in TRACKING_STAGES],
        "orders": [
            {
                **serialise_order(o),
                "customer_link": click_to_chat(
                    f"Hi {o.customer_name}, this is BUDDY herbal about your order {o.code}.",
                    o.phone,
                ),
            }
            for o in rows
        ],
        "notifications": [
            {
                "body": n.body,
                "status": n.status,
                "order_code": n.order_code,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
    }


@router.post("/orders/{code}/status")
def update_status(
    code: str,
    payload: OwnerStatusIn,
    _: bool = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    order = find_order(db, code)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    try:
        set_status(
            db,
            order,
            payload.status,
            auto_track=payload.auto_track,
            notify=payload.notify,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"ok": True, "order": serialise_order(order)}


@router.post("/orders/{code}/notify")
def resend_confirmation(
    code: str,
    _: bool = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    """Send the customer their order confirmation again."""
    order = find_order(db, code)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    message = send_whatsapp(
        db, order.phone, order_confirmation_text(order), order_code=order.code
    )
    return {"ok": True, "status": message.status, "phone": order.phone}


@router.get("/stages")
def stages(_: bool = Depends(require_owner)) -> dict:
    return {"statuses": [{"key": k, "label": next(s["label"] for s in TRACKING_STAGES if s["key"] == k)} for k in STAGE_KEYS]}
