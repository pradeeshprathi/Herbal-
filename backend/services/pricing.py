"""Custom soap pricing engine.

The price of a custom bar is:
    base price + soap base surcharge + every herb surcharge, scaled by size.
"""

from __future__ import annotations

from ..catalog_data import BASES, find_base, find_ingredient
from ..config import settings

MAX_HERBS = 8

# The mould a bar is pressed in. Shape is a presentation choice, never a charge.
SHAPES: tuple[tuple[str, str], ...] = (
    ("round", "Round"),
    ("oval", "Oval"),
    ("square", "Square"),
    ("leaf", "Leaf"),
    ("hex", "Hexagon"),
    ("flower", "Flower"),
    ("rose", "Rose"),
)
SHAPE_LABELS = dict(SHAPES)


class QuoteError(ValueError):
    pass


def _clean(slugs: list[str]) -> list[str]:
    seen: list[str] = []
    for slug in slugs or []:
        if slug and slug not in seen:
            if find_ingredient(slug) is None:
                raise QuoteError(f"Unknown ingredient: {slug}")
            seen.append(slug)
    if not seen:
        raise QuoteError("Pick at least one herb for your custom bar")
    if len(seen) > MAX_HERBS:
        raise QuoteError(f"A bar can hold up to {MAX_HERBS} herbs")
    return seen


def build_quote(
    base: str,
    ingredients: list[str],
    size: str,
    qty: int = 1,
    name: str = "",
    shape: str = "round",
) -> dict:
    base_row = find_base(base) or find_base("glycerin")
    herb_slugs = _clean(ingredients)
    if size not in settings.custom_sizes:
        size = "100 g"
    if shape not in SHAPE_LABELS:
        shape = "round"
    multiplier = float(settings.custom_sizes[size])

    breakdown = [{"label": "Handmade base bar", "amount": round(settings.custom_base_price, 2)}]
    herb_total = 0.0
    herbs = []
    for slug in herb_slugs:
        row = find_ingredient(slug)
        herb_total += float(row["price_add"])
        herbs.append(
            {
                "slug": slug,
                "name": row["name"],
                "tamil_name": row["tamil_name"],
                "benefit": row["benefit"],
                "color": row["color"],
                "price_add": row["price_add"],
            }
        )
        breakdown.append({"label": row["name"], "amount": float(row["price_add"])})

    base_add = float(base_row["price_add"])
    breakdown.append({"label": base_row["name"], "amount": base_add})

    pre_size = settings.custom_base_price + herb_total + base_add
    if multiplier != 1.0:
        breakdown.append({"label": f"Size {size}", "amount": round(pre_size * (multiplier - 1), 2)})

    unit_price = float(round(pre_size * multiplier))
    qty = max(1, min(int(qty or 1), 20))

    custom_name = (name or "").strip() or _auto_name(base_row, herbs)
    speckles = [h["color"] for h in herbs][:6]

    return {
        "name": custom_name,
        "size": size,
        "shape": shape,
        "shape_label": SHAPE_LABELS[shape],
        "qty": qty,
        "unit_price": unit_price,
        "line_total": round(unit_price * qty, 2),
        "breakdown": breakdown,
        "ingredients": herbs,
        "base": {
            "slug": base_row["slug"],
            "name": base_row["name"],
            "benefit": base_row["benefit"],
            "price_add": base_add,
        },
        "palette": {
            "from": base_row["swatch_from"],
            "to": base_row["swatch_to"],
            "speckles": speckles,
        },
        "herb_count": len(herbs),
        "note": "Hand cut, hand stamped and cured for 4 weeks.",
    }


def _auto_name(base_row: dict, herbs: list[dict]) -> str:
    if not herbs:
        return f"{base_row['name']} Bar"
    first = herbs[0]["name"]
    if len(herbs) == 1:
        return f"{first} {base_row['name']}"
    return f"{first} + {len(herbs) - 1} herb blend"


def catalogue_for_quote() -> dict:
    return {
        "bases": BASES,
        "base_price": settings.custom_base_price,
        "sizes": [{"label": k, "multiplier": v} for k, v in settings.custom_sizes.items()],
        "shapes": [{"slug": slug, "label": label} for slug, label in SHAPES],
        "max_herbs": MAX_HERBS,
    }
