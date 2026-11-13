"""BUDDY herbal - FastAPI application entry point.

Run with:  python run.py
Docs at:   http://127.0.0.1:8000/docs
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_DIR, settings
from .database import SessionLocal, init_db
from .routers import catalog, customize, orders, owner, whatsapp
from .seed import seed_catalog
from .services.tracking import tracking_worker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("buddy-herbal")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as db:
        seed_catalog(db)
    log.info("catalogue ready · %s", settings.app_name)

    task = asyncio.create_task(tracking_worker())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="BUDDY herbal API",
    description=(
        "Handmade herbal soaps, bathing powder, face pack and hairwash powder. "
        "Catalogue, custom bar pricing, WhatsApp ordering and automatic live tracking."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog.router)
app.include_router(customize.router)
app.include_router(orders.router)
app.include_router(whatsapp.router)
app.include_router(owner.router)


@app.get("/api/health", tags=["meta"])
def health() -> JSONResponse:
    return JSONResponse(
        {
            "status": "ok",
            "brand": settings.app_name,
            "whatsapp": settings.whatsapp_number,
            "whatsapp_live": settings.whatsapp_live,
            "stage_seconds": settings.stage_seconds,
        }
    )


# The frontend is served from the same app so one command runs everything.
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
