"""Order endpoints: place, track, list."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Order
from ..schemas import OrderIn
from ..services.order_flow import find_order, place_order, serialise_order, sync_and_serialise
from ..services.owner_auth import require_owner
from ..services.pricing import QuoteError
from ..services.whatsapp import click_to_chat

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("")
def create_order(payload: OrderIn, db: Session = Depends(get_db)) -> dict:
    try:
        order = place_order(
            db,
            customer={
                "name": payload.customer.name,
                "phone": payload.customer.phone,
                "address": payload.customer.address,
                "notes": payload.customer.notes,
            },
            items=[item.model_dump() for item in payload.items],
            channel=payload.channel,
            notify_whatsapp=payload.notify_whatsapp,
        )
    except QuoteError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    data = serialise_order(order)
    data["whatsapp_link"] = click_to_chat(data["confirmation_message"], order.phone)
    data["tracking_url"] = f"/track.html?code={order.code}"
    return {"ok": True, "order": data}


@router.get("/{code}")
def get_order(code: str, db: Session = Depends(get_db)) -> dict:
    order = find_order(db, code)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    # public page: the customer's phone and address stay masked here
    return {"ok": True, "order": sync_and_serialise(db, order, public=True)}


@router.get("")
def list_orders(
    limit: int = Query(default=25, ge=1, le=100),
    _: bool = Depends(require_owner),
    db: Session = Depends(get_db),
) -> dict:
    """Owner only — customer details must never be listed publicly."""
    rows = db.scalars(
        select(Order).options(selectinload(Order.items), selectinload(Order.events))
        .order_by(Order.id.desc())
        .limit(limit)
    ).unique().all()
    return {"ok": True, "orders": [serialise_order(o) for o in rows]}
