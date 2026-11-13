"""Order creation, serialisation and lookups."""

from __future__ import annotations

import secrets
import string
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import STAGE_KEYS, TRACKING_STAGES, settings
from ..models import Order, OrderEvent, OrderItem, Product
from .pricing import QuoteError, build_quote
from .tracking import next_stage_in, serialise_timeline, sync_order
from .whatsapp import (
    click_to_chat,
    order_confirmation_text,
    owner_alert_text,
    send_whatsapp,
)

CODE_ALPHABET = string.ascii_uppercase + string.digits


def new_code() -> str:
    return "BH" + "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))


def _unique_code(db: Session) -> str:
    for _ in range(12):
        code = new_code()
        if db.scalar(select(Order.id).where(Order.code == code)) is None:
            return code
    return new_code() + secrets.token_hex(1).upper()


def find_order(db: Session, code: str) -> Order | None:
    return db.scalar(select(Order).where(Order.code == (code or "").strip().upper()))


def place_order(db: Session, customer: dict, items: list[dict], channel: str = "website",
                notify_whatsapp: bool = True) -> Order:
    """Create a real order. Prices always come from the server side catalogue."""
    order = Order(
        code=_unique_code(db),
        customer_name=customer["name"].strip(),
        phone=customer["phone"],
        address=(customer.get("address") or "").strip(),
        notes=(customer.get("notes") or "").strip(),
        channel=channel,
        status="ordered",
        auto_track=True,
    )
    db.add(order)
    db.flush()

    subtotal = 0.0
    for raw in items:
        qty = max(1, min(int(raw.get("qty") or 1), 20))
        custom = raw.get("custom")
        if custom:
            quote = build_quote(
                base=custom.get("base", "coconut"),
                ingredients=custom.get("ingredients", []),
                size=custom.get("size", "100 g"),
                qty=qty,
                name=custom.get("name", ""),
                shape=custom.get("shape", "round"),
            )
            details = {
                "size": quote["size"],
                "shape": quote["shape"],
                "shape_label": quote["shape_label"],
                "base": quote["base"],
                "ingredients": [h["name"] for h in quote["ingredients"]],
                "breakdown": quote["breakdown"],
                "palette": quote["palette"],
                "custom": True,
            }
            item = OrderItem(
                order_id=order.id,
                product_slug="custom-bar",
                name=f"Custom Bar · {quote['name']}",
                kind="custom",
                qty=qty,
                unit_price=quote["unit_price"],
                details=details,
            )
        else:
            slug = (raw.get("slug") or "").strip()
            product = db.scalar(select(Product).where(Product.slug == slug))
            if product is None:
                raise QuoteError(f"Unknown product: {slug}")
            item = OrderItem(
                order_id=order.id,
                product_slug=product.slug,
                name=product.name,
                kind="product",
                qty=qty,
                unit_price=product.base_price,
                details={"weight": product.weight, "category": product.category},
            )
        subtotal += item.unit_price * qty
        db.add(item)

    shipping = 0.0 if subtotal >= settings.free_shipping_above else settings.shipping_fee
    order.subtotal = round(subtotal, 2)
    order.shipping = round(shipping, 2) if subtotal > 0 else 0.0
    order.total = round(order.subtotal + order.shipping, 2)
    order.auto_track = settings.stage_seconds > 0
    db.add(
        OrderEvent(
            order_id=order.id,
            status="ordered",
            note=TRACKING_STAGES[0]["note"],
        )
    )
    db.flush()
    db.refresh(order)

    if notify_whatsapp:
        confirm = order_confirmation_text(order)
        send_whatsapp(db, order.phone, confirm, order_code=order.code)
        send_whatsapp(db, settings.whatsapp_number, owner_alert_text(order), order_code=order.code)

    db.commit()
    db.refresh(order)
    return order


def set_status(
    db: Session,
    order: Order,
    status: str,
    auto_track: bool | None = None,
    notify: bool = True,
) -> Order:
    """Owner action: move an order to any stage (and optionally stop auto tracking)."""
    if status not in STAGE_KEYS:
        raise ValueError(f"Unknown status: {status}")

    note = next((s["note"] for s in TRACKING_STAGES if s["key"] == status), "")
    order.status = status
    if auto_track is not None:
        order.auto_track = bool(auto_track)
    db.add(
        OrderEvent(
            order_id=order.id,
            status=status,
            note=f"Updated by the owner — {note}" if note else "Updated by the owner",
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.refresh(order)

    if notify:
        from .whatsapp import send_whatsapp, status_update_text

        send_whatsapp(db, order.phone, status_update_text(order), order_code=order.code)
    return order


BULLET = "\u2022"


def mask_phone(phone: str) -> str:
    """98••••0011 — enough for the customer to recognise, not enough to reuse."""
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if not digits:
        return BULLET * 8
    if len(digits) <= 4:
        return BULLET * len(digits)
    head = digits[:2] if len(digits) >= 8 else ""
    middle = BULLET * max(2, len(digits) - len(head) - 4)
    return f"{head}{middle}{digits[-4:]}"


def mask_address(address: str) -> str:
    """Keep only the locality — house number and street stay with the owner."""
    text = (address or "").strip()
    if not text:
        return ""
    parts = [p.strip() for p in text.split(",") if p.strip()]
    tail = parts[-1]
    words = tail.split()
    if len(words) > 3:
        # a single-line address: keep just the locality and the PIN
        tail = " ".join(words[-2:])
    return f"{BULLET * 4} {tail}"


def serialise_order(order: Order, public: bool = False) -> dict:
    """`public=True` hides the phone number, address and notes of the customer."""
    current_idx = STAGE_KEYS.index(order.status) if order.status in STAGE_KEYS else 0
    progress = round((current_idx / (len(STAGE_KEYS) - 1)) * 100)
    confirmation = order_confirmation_text(order)
    return {
        "code": order.code,
        "status": order.status,
        "status_label": TRACKING_STAGES[current_idx]["label"],
        "progress": progress,
        "next_in_seconds": next_stage_in(order),
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "channel": order.channel,
        "auto_track": order.auto_track,
        "customer": {
            "name": order.customer_name,
            "phone": mask_phone(order.phone) if public else order.phone,
            "address": mask_address(order.address) if public else order.address,
            "notes": "" if public else order.notes,
            "masked": public,
        },
        "subtotal": order.subtotal,
        "shipping": order.shipping,
        "total": order.total,
        "items": [
            {
                "name": i.name,
                "kind": i.kind,
                "qty": i.qty,
                "unit_price": i.unit_price,
                "line_total": round(i.unit_price * i.qty, 2),
                "details": i.details or {},
                "product_slug": i.product_slug,
            }
            for i in order.items
        ],
        "timeline": serialise_timeline(order),
        "confirmation_message": confirmation,
        "support_link": click_to_chat(
            f"Hi BUDDY herbal! I need help with my order {order.code}.", settings.whatsapp_number
        ),
    }


def sync_and_serialise(db: Session, order: Order, public: bool = False) -> dict:
    before = order.status
    sync_order(db, order)
    if order.status != before:
        db.commit()
        db.refresh(order)
    return serialise_order(order, public=public)
