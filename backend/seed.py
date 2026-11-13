"""Seed the SQLite database with the BUDDY herbal catalogue (idempotent)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .catalog_data import INGREDIENTS, PRODUCTS
from .models import Ingredient, Product, ProductBenefit, ProductIngredient


def seed_catalog(db: Session) -> None:
    for data in INGREDIENTS:
        row = db.scalar(select(Ingredient).where(Ingredient.slug == data["slug"]))
        if row is None:
            row = Ingredient(slug=data["slug"])
            db.add(row)
        row.name = data["name"]
        row.tamil_name = data["tamil_name"]
        row.kind = data["kind"]
        row.benefit = data["benefit"]
        row.note = data["note"]
        row.color = data["color"]
        row.price_add = data["price_add"]
        row.customizable = True

    for data in PRODUCTS:
        row = db.scalar(select(Product).where(Product.slug == data["slug"]))
        if row is None:
            row = Product(slug=data["slug"])
            db.add(row)

        row.name = data["name"]
        row.tamil_name = data["tamil_name"]
        row.category = data["category"]
        row.shape = data.get("shape", "round")
        row.tagline = data["tagline"]
        row.description = data["description"]
        row.base_price = data["base_price"]
        row.mrp = data["mrp"]
        row.weight = data["weight"]
        row.badge = data["badge"]
        row.color_from = data["color_from"]
        row.color_to = data["color_to"]
        row.accent = data["accent"]
        row.base_layer = data["base_layer"]
        row.is_featured = data["is_featured"]
        row.sort_order = data["sort_order"]

        row.ingredients.clear()
        for pos, ing in enumerate(data["ingredients"]):
            row.ingredients.append(
                ProductIngredient(
                    ingredient_slug=ing["ingredient_slug"],
                    name=ing["name"],
                    tamil_name=ing["tamil_name"],
                    role=ing["role"],
                    color=ing["color"],
                    sort_order=pos,
                )
            )

        row.benefits.clear()
        for pos, ben in enumerate(data["benefits"]):
            row.benefits.append(
                ProductBenefit(title=ben["title"], detail=ben["detail"], sort_order=pos)
            )

    db.commit()
