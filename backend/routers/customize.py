"""Custom soap studio endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..schemas import QuoteIn
from ..services.pricing import QuoteError, build_quote

router = APIRouter(prefix="/api/customize", tags=["customizer"])


@router.post("/quote")
def quote(payload: QuoteIn) -> dict:
    try:
        result = build_quote(
            base=payload.base,
            ingredients=payload.ingredients,
            size=payload.size,
            qty=payload.qty,
            name=payload.name,
            shape=payload.shape,
        )
    except QuoteError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"ok": True, "quote": result}
