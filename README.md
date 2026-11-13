# BUDDY herbal — website

A complete, premium storefront for **BUDDY herbal**: handmade herbal soaps, bathing powder,
face pack and hairwash powder.

* Full product catalogue with the ingredients and benefits of every soap
* A custom studio where customers choose the base, the herbs **and the mould** (round, oval,
square, leaf, hexagon, flower, rose) and see the exact bar before ordering
* A **3D custom soap studio** — pick a base, pick your herbs, see the bar change live
* Ordering through **WhatsApp** with an **automatic confirmation message** to the customer
* **Live order tracking** that advances on its own from *ordered* to *delivered* —
  the public page shows the customer's phone as `98••••0011` and only the locality of
  the address; the full details live behind the owner sign-in
* An **owner dashboard** (`/owner.html`) with every order, the customer's details, the
  WhatsApp alerts you received, and manual control over each order's stage
* Heavy on animation: 3D draggable soap, scroll reveals, tilt cards, magnetic buttons,
  floating leaves, flipping herb cards, animated cart and timeline

Stack: **HTML · CSS · JavaScript (ES modules) · Python · FastAPI · SQL (SQLite via SQLAlchemy)**

---

## 1. Run it

```bash
cd buddy-herbal

# create a virtual environment (once)
python -m venv .venv

# activate it
# Windows (PowerShell / Git Bash):
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# install dependencies
pip install -r requirements.txt

# start the site
python run.py
```

Open **http://127.0.0.1:8000** — the API docs are at `/docs`.

Everything is served by one FastAPI process: the API under `/api/*` and the website
from `frontend/`. Do not open `index.html` directly from the file system — the catalogue
comes from the API, so the page must be served by the app.

Useful flags:

```bash
python run.py --reload           # auto reload while you edit
python run.py --port=8080        # different port
python run.py --open             # open the browser automatically
```

The SQLite database is created on first start at `backend/data/buddy_herbal.db`
and seeded with the full catalogue (idempotent — safe to restart).

---

## 2. What is on the site

| Page | What it does |
| --- | --- |
| `index.html` | Hero with 3D bars, the collection, custom studio, how it works, ingredient glossary, contact, basket drawer, checkout, WhatsApp bot demo |
| `track.html` | Live tracking: enter `?code=BHXXXXXX`, timeline updates every 5 seconds |

**7 soaps**, each in its own 3D shape: Kuppaimeni (oval) · Neem (neem leaf) · Poolan Kilangu &
Virali Manjal (hexagon) · Manjistha (round) · Herbal (square bar) · Rose (rose bloom) · Hibiscus
(five petal flower)

**Plus:** Herbal Bathing Powder · Herbal Face Pack · Hairwash Powder

**18 herbs** documented with benefits, including essential oil, ecapsule, kuppaimeni leaf,
neem powder, poolan kilangu, virali manjal, manjistha, vettiver, panner rose, aloe vera,
hibiscus, fenugreek, green gram, chikakai, soap nuts, kasthuri manjal, sandal, multani mitti.

**4 bases:** coconut oil, goat milk, vegetable glycerin, activated charcoal.

Every product page lists the ingredients *with the role each herb plays* and a
"What it does for you" benefit grid.

---

## 3. WhatsApp

### 3.1 Ordering

The basket → *Checkout & confirm* → the order is created and
**an automatic WhatsApp confirmation** is sent to the customer's number with:

* order code
* itemised total
* the live tracking link

The success screen also shows the exact message that was sent.

The floating green button and every "Ask on WhatsApp" link open a chat with
**+91 89032 47497** with the basket pre-written.

### 3.2 The bot

Customers who message the business number get:

```
hi          → welcome message + numbered product menu
1,3         → the products are added, basket summary returned
DONE        → asks for name, then address
(address)   → order placed, confirmation + tracking code sent
CUSTOM      → link to the 3D custom studio
BH1A2B3C    → status of that order
```

You can try the whole flow without any Meta account: on the site open
*Contact → “Try the WhatsApp bot”*. It runs the same code through
`POST /api/whatsapp/simulate`.

### 3.3 Going live with real WhatsApp

Out of the box the bot runs in **simulated mode**: messages are stored in the
`wa_messages` table (visible at `GET /api/whatsapp/outbox`) and nothing is sent.
To deliver real messages:

1. Create a Meta app → add the **WhatsApp** product → get a permanent token and the
   phone number ID.
2. Copy `.env.example` to `.env` and fill in:

```env
WHATSAPP_NUMBER=918903247497
WHATSAPP_TOKEN=EAAG...your permanent token
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_VERIFY_TOKEN=choose-a-secret
```

3. Expose your local server with a tunnel (e.g. `ngrok http 8000`) and set the Meta webhook
   callback URL to `https://<your-domain>/api/whatsapp/webhook` with the same verify token.
4. Subscribe to the `messages` field. Restart the server.

The same code then sends confirmations, owner alerts and bot replies through the
Cloud API. No other change is needed.

---

## 4. Automatic live tracking

When an order is placed it gets a code like `BH7K2M9Q`. The background worker moves it
through six stages by itself:

```
ordered → confirmed → packed → shipped → out_for_delivery → delivered
```

`STAGE_SECONDS` in `.env` controls how long each stage lasts:

```env
STAGE_SECONDS=45    # whole journey ≈ 4 minutes (great for a demo)
STAGE_SECONDS=3600  # one stage per hour
STAGE_SECONDS=0     # freeze at "ordered", move orders manually
```

Every transition is written to `order_events`, so the customer sees real timestamps.
`track.html` polls `/api/orders/{code}` every 5 seconds and shows a countdown to the
next step. The order also survives restarts because the stage is derived from the
order's placement time.

---

## 5. Owner dashboard

Open **http://127.0.0.1:8000/owner.html** (or the *Owner dashboard* link in the footer)
and sign in with the password from `.env`:

```env
OWNER_PASSWORD=buddy-owner     # CHANGE THIS before going live
OWNER_SESSION_HOURS=12
```

The password is never stored in the browser: signing in sets a signed, expiring,
**HttpOnly cookie**, and every owner API is refused with 401 without it. While the shipped
default is still in use, the dashboard shows a warning banner.

**What the owner sees**

* six counters — orders today, revenue today, in progress, delivered, all-time revenue,
  average order
* every order with customer name, tap-to-call number, address, notes, channel, items,
  custom-bar mould/base/herbs, delivery and total
* the **notifications** list — every WhatsApp alert the shop sent to the owner
  (`89032 47497`), including the customer's details, newest first
* a *WhatsApp* button that opens a chat with that customer, and a *Track* button

**What the owner can do**

* move an order to any stage from the dropdown, or press the next-stage button — the
  customer gets a WhatsApp update automatically, and auto-tracking pauses for that order
* **search every order** — including old ones — by order code, phone number or customer
  name (typing `98765 00011` or `bh1a2b3c` works too)
* resume automatic tracking with one click
* resend the order confirmation to the customer

The dashboard refreshes itself every 15 seconds (and when you return to the tab).

---

## 6. API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | status + WhatsApp mode |
| GET | `/api/catalog` | products, herbs, bases, customizer settings |
| GET | `/api/products` · `/api/products/{slug}` | catalogue / one product |
| GET | `/api/ingredients` | herb glossary |
| POST | `/api/customize/quote` | price a custom bar (server authoritative) |
| POST | `/api/orders` | place an order (creates tracking + confirmation) |
| GET | `/api/orders/{code}` | live tracking payload |
| GET | `/api/orders` | recent orders — **owner only** |
| POST | `/api/owner/login` · `/logout` · GET `/session` | owner sign in / out |
| GET | `/api/owner/overview?q=` | owner only: stats, every order, your alerts; `q` searches code/phone/name |
| POST | `/api/owner/orders/{code}/status` | owner only: set the stage (optionally notify) |
| POST | `/api/owner/orders/{code}/notify` | owner only: resend the customer confirmation |
| GET/POST | `/api/whatsapp/webhook` | Meta Cloud API verification + inbound messages |
| POST | `/api/whatsapp/simulate` | run the bot locally |
| GET | `/api/whatsapp/outbox` | every message sent or received |

Example:

```bash
curl -X POST http://127.0.0.1:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
        "customer": {"name": "Lakshmi", "phone": "9876543210", "address": "12 Temple St, Madurai 625001"},
        "items": [{"slug": "kuppaimeni-soap", "qty": 2}]
      }'
```

Two rules the backend enforces: **prices always come from the database**, never from the
browser, and a custom bar needs at least one herb (max 8).

---

## 7. Project structure

```
buddy-herbal/
├─ run.py                     # starts uvicorn
├─ requirements.txt
├─ .env.example               # copy to .env
├─ backend/
│  ├─ main.py                 # FastAPI app, static mount, lifespan worker
│  ├─ config.py               # settings, tracking stages
│  ├─ database.py             # engine, session, Base
│  ├─ models.py               # SQL schema: products, ingredients, orders, events, wa_*
│  ├─ schemas.py              # request/response models
│  ├─ catalog_data.py         # ★ all soaps, herbs, bases, benefits live here
│  ├─ seed.py                 # writes the catalogue into SQLite
│  ├─ routers/                # catalog, customize, orders, whatsapp, owner
│  ├─ services/
│  │  ├─ pricing.py           # custom bar price engine
│  │  ├─ order_flow.py        # place order, serialise, tracking, owner actions
│  │  ├─ tracking.py          # automatic stage progression + worker
│  │  ├─ bot.py               # WhatsApp conversation flow
│  │  ├─ owner_auth.py        # signed owner cookie
│  │  └─ whatsapp.py          # Cloud API sender, templates, outbox
│  └─ data/buddy_herbal.db    # created on first run
└─ frontend/
   ├─ index.html
   ├─ track.html
   ├─ owner.html              # owner dashboard
   ├─ css/style.css
   └─ js/
      ├─ app.js               # boot
      ├─ api.js               # fetch client
      ├─ soap.js              # the draggable 3D soap component
      ├─ ui.js                # preloader, reveal, tilt, cursor, leaves, toasts
      ├─ modals.js            # modal controller
      ├─ catalog.js           # grid, filters, herb glossary, product modal
      ├─ studio.js            # custom soap studio
      ├─ cart.js              # basket, checkout, success screen
      ├─ bot.js               # WhatsApp bot demo panel
      ├─ owner.js             # owner dashboard
      └─ track.js             # live tracking page
```

---

## 8. Editing the shop

**Prices, products, herbs, benefits** → `backend/catalog_data.py`.
Change it, restart the server: the seed is idempotent and updates existing rows.

**Colours / 3D look** → the `color_from`, `color_to`, `accent` fields per product.

**Business number** → `WHATSAPP_NUMBER` in `.env` (and the hard-coded `wa.me` links in
`index.html` / `track.html` / `js/api.js` → `WHATSAPP`).

**Shipping** → `shipping_fee` and `free_shipping_above` in `backend/config.py`.

**Stage duration** → `STAGE_SECONDS` in `.env`.

---

## 9. Notes

* Nothing artificial is listed as an ingredient: no parabens, no artificial colour, no synthetic
  perfume, no palm oil.
* Every product image is rendered live in CSS 3D — soaps as their own shapes
  (leaf, rose, hexagon, square…), powders as a jar of powder. Drag any of them to spin,
  with real inertia. No photo files to manage.
* Images and fonts come from Google Fonts; everything else works offline once installed.
* This is a small-batch shop, not a payment gateway: orders are confirmed on WhatsApp and
  paid on delivery / by UPI as you arrange with the customer.
