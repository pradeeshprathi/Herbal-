"""WhatsApp integration: message templates, outbox and Cloud API delivery.

If WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID are configured the message is
really sent through Meta's WhatsApp Cloud API. Otherwise the message is stored
in the outbox with status "simulated" so the whole flow is still visible in the
demo bot panel and in /api/whatsapp/outbox.
"""

from __future__ import annotations

import re
from urllib.parse import quote

import httpx
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Order, WaMessage


def normalise_phone(raw: str) -> str:
    """Strip everything except digits, default to +91 for 10 digit numbers."""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 10:
        digits = "91" + digits
    return digits


def click_to_chat(text: str, phone: str | None = None) -> str:
    number = normalise_phone(phone or settings.whatsapp_number)
    return f"https://wa.me/{number}?text={quote(text)}"


def _post_to_cloud_api(db: Session, phone: str, body: str, row: WaMessage) -> WaMessage:
    url = f"https://graph.facebook.com/{settings.whatsapp_api_version}/{settings.whatsapp_phone_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"preview_url": True, "body": body},
    }
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_token}",
        "Content-Type": "application/json",
    }
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(url, json=payload, headers=headers)
        if resp.status_code >= 400:
            row.status = "failed"
            row.error = f"HTTP {resp.status_code}: {resp.text[:400]}"
        else:
            data = resp.json()
            row.status = "sent"
            row.provider_id = (
                data.get("messages", [{}])[0].get("id", "") if isinstance(data, dict) else ""
            )
    except Exception as exc:  # network problems should never break an order
        row.status = "failed"
        row.error = str(exc)[:400]
    return row


def send_whatsapp(db: Session, phone: str, body: str, order_code: str = "") -> WaMessage:
    """Queue (and if configured, deliver) a WhatsApp message. Returns the outbox row."""
    number = normalise_phone(phone)
    row = WaMessage(phone=number, direction="out", body=body, order_code=order_code)
    db.add(row)
    db.flush()

    if settings.whatsapp_live:
        _post_to_cloud_api(db, number, body, row)
    else:
        row.status = "simulated"

    db.commit()
    db.refresh(row)
    return row


# ---------------------------------------------------------------------------
# Message templates
# ---------------------------------------------------------------------------
def order_confirmation_text(order: Order) -> str:
    lines = [
        f"🌿 *BUDDY herbal* — order confirmed!",
        "",
        f"Hello {order.customer_name}, thank you for choosing handmade.",
        f"Order code: *{order.code}*",
        "",
        "*Your items*",
    ]
    for item in order.items:
        lines.append(f"• {item.name} × {item.qty} — ₹{item.unit_price * item.qty:,.0f}")
    lines += [
        "",
        f"Subtotal: ₹{order.subtotal:,.0f}",
        f"Shipping: {'FREE' if order.shipping == 0 else '₹' + format(order.shipping, ',.0f')}",
        f"*Total: ₹{order.total:,.0f}*",
        "",
        f"Track your parcel live: {settings.public_base_url}/track.html?code={order.code}",
        "",
        "Every bar is cut, cured and packed by hand. We will message you at each step — from packed to delivered.",
        "Reply here anytime if you need anything. 🌱",
    ]
    return "\n".join(lines)


def owner_alert_text(order: Order) -> str:
    lines = [
        f"🔔 *New order {order.code}* ({order.channel})",
        f"Customer: {order.customer_name} · {order.phone}",
        "",
        "*Items*",
    ]
    for item in order.items:
        detail = ""
        if item.kind == "custom" and isinstance(item.details, dict):
            bits = [item.details.get("size", ""), f"{item.details.get('shape', '')} mould"]
            base = item.details.get("base") or {}
            if isinstance(base, dict) and base.get("name"):
                bits.append(base["name"])
            herbs = item.details.get("ingredients") or []
            if herbs:
                bits.append(", ".join(herbs))
            detail = "\n   " + " · ".join(b for b in bits if b)
        lines.append(f"• {item.name} × {item.qty} — ₹{item.unit_price * item.qty:,.0f}{detail}")
    lines += [
        "",
        f"*Total: ₹{order.total:,.0f}*  (subtotal ₹{order.subtotal:,.0f} + delivery ₹{order.shipping:,.0f})",
        f"Address: {order.address or 'shared on WhatsApp'}",
    ]
    if order.notes:
        lines.append(f"Notes: {order.notes}")
    lines += [
        "",
        f"Reply to the customer: https://wa.me/{normalise_phone(order.phone)}",
        f"Owner dashboard: {settings.public_base_url}/owner.html",
        f"Track: {settings.public_base_url}/track.html?code={order.code}",
    ]
    return "\n".join(lines)


def status_update_text(order: Order) -> str:
    label = order.status.replace("_", " ").title()
    return (
        f"🌿 *BUDDY herbal* — update on *{order.code}*\n"
        f"Your parcel is now: *{label}*.\n"
        f"Track it live: {settings.public_base_url}/track.html?code={order.code}"
    )


def welcome_text() -> str:
    return (
        "🌿 *Welcome to BUDDY herbal!*\n"
        "Handmade soap, bathing powder, face pack and hairwash powder — made with Tamil herbs, "
        "never with artificial ingredients.\n\n"
        "Here is our menu — reply with the *number* of anything you like:\n"
        "{menu}\n\n"
        "You can pick more than one (send *1,3,5*). Reply *DONE* when you are ready to order, "
        "or *CUSTOM* to build your own soap."
    )
