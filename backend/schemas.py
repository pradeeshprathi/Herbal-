"""Pydantic schemas used by the API layer."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class CustomSpec(BaseModel):
    base: str = "coconut"
    ingredients: list[str] = Field(default_factory=list)
    size: str = "100 g"
    shape: str = "round"
    name: str = ""
    note: str = ""


class OrderItemIn(BaseModel):
    slug: str = ""
    qty: int = Field(default=1, ge=1, le=20)
    custom: CustomSpec | None = None


class CustomerIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=6, max_length=20)
    address: str = Field(default="", max_length=600)
    notes: str = Field(default="", max_length=600)

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        digits = "".join(ch for ch in v if ch.isdigit() or ch == "+")
        if len(digits.lstrip("+")) < 6:
            raise ValueError("Please enter a valid phone number")
        return digits


class OrderIn(BaseModel):
    customer: CustomerIn
    items: list[OrderItemIn] = Field(min_length=1)
    channel: Literal["website", "whatsapp", "customizer"] = "website"
    notify_whatsapp: bool = True


class QuoteIn(BaseModel):
    base: str = "coconut"
    ingredients: list[str] = Field(default_factory=list)
    size: str = "100 g"
    shape: str = "round"
    qty: int = Field(default=1, ge=1, le=20)
    name: str = ""


class SimulateIn(BaseModel):
    phone: str = "919999999999"
    text: str = "hi"


class OwnerLoginIn(BaseModel):
    password: str = Field(min_length=1, max_length=200)


class OwnerStatusIn(BaseModel):
    status: str
    auto_track: bool | None = None
    notify: bool = True


class ApiMessage(BaseModel):
    ok: bool = True
    message: str = ""
    data: Any | None = None
