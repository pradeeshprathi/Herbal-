"""Central configuration for the BUDDY herbal backend."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_DIR = PROJECT_DIR / "frontend"

# .env lives at the project root (one level above backend/)
load_dotenv(PROJECT_DIR / ".env")


def _int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


class Settings:
    """Small, dependency free settings object."""

    app_name: str = "BUDDY herbal"
    brand_line: str = "Handmade herbal soaps, powders & packs"

    # WhatsApp
    whatsapp_number: str = os.getenv("WHATSAPP_NUMBER", "918903247497").strip() or "918903247497"
    whatsapp_token: str = os.getenv("WHATSAPP_TOKEN", "").strip()
    whatsapp_phone_id: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    whatsapp_verify_token: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "buddy-herbal-verify").strip()
    whatsapp_api_version: str = os.getenv("WHATSAPP_API_VERSION", "v20.0").strip()

    # Tracking
    stage_seconds: int = _int("STAGE_SECONDS", 45)

    # Owner dashboard
    owner_password: str = os.getenv("OWNER_PASSWORD", "buddy-owner").strip() or "buddy-owner"
    secret_key: str = os.getenv("SECRET_KEY", "").strip()
    owner_session_hours: int = _int("OWNER_SESSION_HOURS", 12)

    # App
    public_base_url: str = os.getenv("PUBLIC_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///" + (DATA_DIR / "buddy_herbal.db").as_posix(),
    )

    # Commerce
    shipping_fee: float = 49.0
    free_shipping_above: float = 799.0
    custom_base_price: float = 129.0
    custom_sizes: dict = {"100 g": 1.0, "150 g": 1.35, "200 g": 1.7}

    @property
    def whatsapp_live(self) -> bool:
        """True when real Cloud API credentials are configured."""
        return bool(self.whatsapp_token and self.whatsapp_phone_id)

    @property
    def owner_using_default(self) -> bool:
        """Warn the dashboard while the shipped default password is in use."""
        return self.owner_password == "buddy-owner"


settings = Settings()

# Ordered tracking journey. The index of a stage decides when it happens.
TRACKING_STAGES: list[dict[str, str]] = [
    {"key": "ordered", "label": "Order placed", "icon": "receipt", "note": "We received your order at BUDDY herbal."},
    {"key": "confirmed", "label": "Confirmed", "icon": "check", "note": "Our herbalist confirmed your blend."},
    {"key": "packed", "label": "Packed", "icon": "box", "note": "Wrapped in plastic free, herb friendly packing."},
    {"key": "shipped", "label": "Shipped", "icon": "truck", "note": "Handed over to our delivery partner."},
    {"key": "out_for_delivery", "label": "Out for delivery", "icon": "pin", "note": "Your parcel is on the way to you today."},
    {"key": "delivered", "label": "Delivered", "icon": "home", "note": "Enjoy your ritual. Thank you for choosing BUDDY herbal."},
]
STAGE_KEYS = [s["key"] for s in TRACKING_STAGES]
