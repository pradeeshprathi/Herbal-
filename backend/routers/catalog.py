"""Catalogue endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..catalog_data import base_payload, ingredient_payload
from ..config import settings
from ..database import get_db
from ..models import Product
from ..services.pricing import catalogue_for_quote

router = APIRouter(prefix="/api", tags=["catalogue"])


def _product_dict(p: Product) -> dict:
    return {
        "slug": p.slug,
        "name": p.name,
        "tamil_name": p.tamil_name,
        "category": p.category,
        "shape": p.shape,
        "tagline": p.tagline,
        "description": p.description,
        "price": p.base_price,
        "mrp": p.mrp,
        "weight": p.weight,
        "badge": p.badge,
        "colors": {"from": p.color_from, "to": p.color_to, "accent": p.accent},
        "ingredients": [
            {
                "slug": i.ingredient_slug,
                "name": i.name,
                "tamil_name": i.tamil_name,
                "role": i.role,
                "color": i.color,
            }
            for i in p.ingredients
        ],
        "benefits": [{"title": b.title, "detail": b.detail} for b in p.benefits],
    }


@router.get("/catalog")
def catalog(db: Session = Depends(get_db)) -> dict:
    products = db.scalars(
        select(Product).options(
            selectinload(Product.ingredients), selectinload(Product.benefits)
        ).order_by(Product.sort_order)
    ).unique().all()
    return {
        "brand": {
            "name": "BUDDY herbal",
            "tagline": "Handmade herbal soaps, powders & packs",
            "whatsapp": settings.whatsapp_number,
            "whatsapp_live": settings.whatsapp_live,
            "free_shipping_above": settings.free_shipping_above,
            "shipping_fee": settings.shipping_fee,
            "stage_seconds": settings.stage_seconds,
        },
        "products": [_product_dict(p) for p in products],
        "ingredients": ingredient_payload(),
        "bases": base_payload(),
        "customizer": catalogue_for_quote(),
    }


@router.get("/products")
def products(db: Session = Depends(get_db)) -> dict:
    rows = db.scalars(
        select(Product).options(selectinload(Product.ingredients), selectinload(Product.benefits))
        .order_by(Product.sort_order)
    ).unique().all()
    return {"products": [_product_dict(p) for p in rows]}


@router.get("/products/{slug}")
def product(slug: str, db: Session = Depends(get_db)) -> dict:
    row = db.scalar(
        select(Product)
        .options(selectinload(Product.ingredients), selectinload(Product.benefits))
        .where(Product.slug == slug)
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"product": _product_dict(row)}


@router.get("/ingredients")
def ingredients() -> dict:
    return {"ingredients": ingredient_payload(), "bases": base_payload()}
