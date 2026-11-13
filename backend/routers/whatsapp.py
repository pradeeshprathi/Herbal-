"""WhatsApp routes: Cloud API webhook, demo simulator and outbox."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import WaMessage
from ..schemas import SimulateIn
from ..services.bot import handle_incoming
from ..services.whatsapp import click_to_chat, normalise_phone

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


@router.get("/webhook", response_class=PlainTextResponse)
def verify(
    hub_mode: str = Query(default="", alias="hub.mode"),
    hub_challenge: str = Query(default="", alias="hub.challenge"),
    hub_verify_token: str = Query(default="", alias="hub.verify_token"),
) -> str:
    """Meta webhook verification handshake."""
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_verify_token:
        return hub_challenge
    return "verification failed"


@router.post("/webhook")
async def inbound(request: Request, db: Session = Depends(get_db)) -> dict:
    """Receive messages from the WhatsApp Cloud API."""
    body = await request.json()
    handled = 0
    try:
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                for message in value.get("messages", []):
                    phone = message.get("from", "")
                    text = (
                        message.get("text", {}).get("body")
                        or message.get("button", {}).get("text")
                        or ""
                    )
                    if phone and text:
                        handle_incoming(db, phone, text)
                        handled += 1
    except Exception as exc:  # never 500 to Meta, they retry forever
        return {"ok": False, "error": str(exc), "handled": handled}
    return {"ok": True, "handled": handled}


@router.post("/simulate")
def simulate(payload: SimulateIn, db: Session = Depends(get_db)) -> dict:
    """Try the bot locally without Meta credentials (used by the demo panel)."""
    replies = handle_incoming(db, payload.phone, payload.text)
    rows = db.scalars(
        select(WaMessage)
        .where(WaMessage.phone == normalise_phone(payload.phone), WaMessage.direction == "out")
        .order_by(WaMessage.id.desc())
        .limit(len(replies))
    ).all()
    return {
        "ok": True,
        "replies": replies,
        "simulated": not settings.whatsapp_live,
        "messages": [
            {"body": r.body, "status": r.status, "created_at": r.created_at.isoformat()}
            for r in reversed(rows)
        ],
    }


@router.get("/outbox")
def outbox(limit: int = Query(default=20, ge=1, le=100), db: Session = Depends(get_db)) -> dict:
    """Demo panel feed. Owner alerts are skipped — they carry customer details."""
    rows = db.scalars(
        select(WaMessage)
        .where(WaMessage.phone != normalise_phone(settings.whatsapp_number))
        .order_by(WaMessage.id.desc())
        .limit(limit)
    ).all()
    return {
        "live": settings.whatsapp_live,
        "messages": [
            {
                "phone": r.phone,
                "direction": r.direction,
                "body": r.body,
                "status": r.status,
                "error": r.error,
                "order_code": r.order_code,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


@router.get("/link")
def link(text: str = "Hi BUDDY herbal, I would like to order.", phone: str = "") -> dict:
    return {"url": click_to_chat(text, phone or settings.whatsapp_number)}
