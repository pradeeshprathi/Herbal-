"""The WhatsApp conversation bot.

Handles the flow the customer asked for:
    "hi"  ->  welcome message + product menu
    "1,3" ->  adds the products, shows the basket
    "done" -> asks for name, then address, then places the order
           -> sends the confirmation message with a live tracking link
"""

from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Order, Product, WaMessage, WaSession
from .order_flow import find_order, place_order
from .whatsapp import normalise_phone, order_confirmation_text, welcome_text

GREETINGS = {"hi", "hii", "hello", "hey", "start", "menu", "namaste", "vanakkam", "hai"}


def _menu(db: Session) -> tuple[str, list[Product]]:
    products = db.scalars(select(Product).order_by(Product.sort_order)).all()
    lines = []
    for idx, p in enumerate(products, start=1):
        lines.append(f"{idx}. {p.name} — ₹{p.base_price:,.0f} ({p.weight})")
    return "\n".join(lines), products


def _cart_summary(session: WaSession, products: dict[str, Product]) -> str:
    if not session.cart:
        return "Your basket is empty."
    lines = ["🧺 *Your basket*"]
    total = 0.0
    for row in session.cart:
        product = products.get(row["slug"])
        if not product:
            continue
        amount = product.base_price * row["qty"]
        total += amount
        lines.append(f"• {product.name} × {row['qty']} — ₹{amount:,.0f}")
    lines.append(f"\nSubtotal: ₹{total:,.0f}")
    lines.append("\nReply *DONE* to place the order, or send more numbers to add.")
    return "\n".join(lines)


def handle_incoming(db: Session, phone: str, text: str) -> list[str]:
    """Process one inbound message and return the replies to send."""
    number = normalise_phone(phone)
    body = (text or "").strip()
    lower = body.lower()

    db.add(WaMessage(phone=number, direction="in", body=body, status="received"))
    session = db.get(WaSession, number)
    if session is None:
        session = WaSession(phone=number, step="menu", cart=[])
        db.add(session)
        db.flush()
    if not isinstance(session.cart, list):
        session.cart = []

    menu_text, products = _menu(db)
    by_slug = {p.slug: p for p in products}
    replies: list[str] = []

    # ---- tracking lookup: "track BH123ABC" or just the code ----------------
    # Only a standalone code that contains a digit — so a word like "BHARATHI"
    # inside an address is never mistaken for an order code.
    code_match = re.search(
        r"(?<![A-Z0-9])BH(?=[A-Z0-9]{0,5}\d)[A-Z0-9]{6}(?![A-Z0-9])", body.upper()
    )
    if code_match:
        order = find_order(db, code_match.group(0))
        if order:
            label = order.status.replace("_", " ")
            replies.append(
                f"📦 Order *{order.code}* is currently *{label}*.\n"
                f"Live tracking: {settings.public_base_url}/track.html?code={order.code}"
            )
        else:
            replies.append("I could not find that order code. Could you check and resend it?")
        _save(db, session, replies)
        return replies

    if lower in GREETINGS:
        session.step = "menu"
        session.cart = []
        replies.append(welcome_text().format(menu=menu_text))
        _save(db, session, replies)
        return replies

    if lower in {"custom", "customise", "customize", "my soap"}:
        replies.append(
            "🧪 *Build your own bar*\n"
            "Choose a base (coconut, goat milk, glycerin or charcoal), pick up to 8 herbs "
            "and see your soap in 3D before you buy.\n"
            f"Open the Custom Studio: {settings.public_base_url}/index.html#studio\n"
            "Reply *MENU* to go back to the list."
        )
        _save(db, session, replies)
        return replies

    if lower in {"menu", "list", "products"}:
        session.step = "menu"
        replies.append(welcome_text().format(menu=menu_text))
        _save(db, session, replies)
        return replies

    if lower in {"clear", "reset", "cancel"}:
        session.step = "menu"
        session.cart = []
        session.order_code = ""
        replies.append("Done — basket cleared. Reply *MENU* to see the products again.")
        _save(db, session, replies)
        return replies

    # ---- choosing products by number --------------------------------------
    numbers = [int(n) for n in re.findall(r"\d+", body)]
    if numbers and session.step in {"menu", "cart"} and not (len(body) == 10 and numbers[0] > len(products)):
        valid = []
        for n in numbers:
            if 1 <= n <= len(products):
                product = products[n - 1]
                valid.append(product)
                existing = next((r for r in session.cart if r["slug"] == product.slug), None)
                if existing:
                    existing["qty"] = min(existing["qty"] + 1, 10)
                else:
                    session.cart.append({"slug": product.slug, "qty": 1, "name": product.name})
        if valid:
            added = ", ".join(p.name for p in valid)
            replies.append(f"Added {added} 🧺\n\n" + _cart_summary(session, by_slug))
            session.step = "cart"
            _save(db, session, replies)
            return replies

    # ---- checkout flow ----------------------------------------------------
    if lower in {"done", "order", "checkout", "yes", "confirm"}:
        if not session.cart:
            replies.append("Your basket is empty — reply *MENU* and pick a number first. 🌿")
        else:
            session.step = "name"
            replies.append(
                _cart_summary(session, by_slug)
                + "\n\nWhat name should I put on the parcel?"
            )
        _save(db, session, replies)
        return replies

    if session.step == "name" and len(body) >= 2:
        session.customer_name = body[:120]
        session.step = "address"
        replies.append(
            f"Lovely to meet you, {session.customer_name}! 🌼\n"
            "Now send your full delivery address with pincode."
        )
        _save(db, session, replies)
        return replies

    if session.step == "address" and len(body) >= 6:
        session.address = body[:400]
        try:
            order = place_order(
                db,
                customer={
                    "name": session.customer_name or "WhatsApp customer",
                    "phone": number,
                    "address": session.address,
                },
                items=[{"slug": row["slug"], "qty": row["qty"]} for row in session.cart],
                channel="whatsapp",
                notify_whatsapp=False,
            )
        except Exception as exc:  # pragma: no cover - defensive
            replies.append(f"Something went wrong placing the order ({exc}). Please reply *DONE* and try again.")
            _save(db, session, replies)
            return replies

        session.step = "menu"
        session.cart = []
        session.order_code = order.code
        replies.append(order_confirmation_text(order))
        replies.append(
            f"💚 Tracking code *{order.code}* — you can follow every step here:\n"
            f"{settings.public_base_url}/track.html?code={order.code}"
        )
        _save(db, session, replies)
        return replies

    if session.step in {"name", "address"}:
        replies.append("That looks too short — could you send it again with a little more detail?")
        _save(db, session, replies)
        return replies

    replies.append(
        "🌿 I did not quite catch that.\nReply *MENU* to see the products, "
        "*CUSTOM* to build your own bar, or send a number like *1*."
    )
    _save(db, session, replies)
    return replies


def _save(db: Session, session: WaSession, replies: list[str]) -> None:
    from .whatsapp import send_whatsapp

    for reply in replies:
        send_whatsapp(db, session.phone, reply)
    db.commit()
