# BUDDY herbal — setup & handover guide

This folder is the complete website. One Python process serves the storefront **and**
the API, so there is nothing else to install apart from Python.

```
buddy-herbal-handover/
├─ start.bat              ← Windows: double-click this
├─ start.sh               ← macOS / Linux: bash start.sh
├─ run.py                 ← the server
├─ requirements.txt       ← Python packages
├─ .env                   ← all settings (password, WhatsApp number, …)
├─ .env.example           ← reference copy of the same file
├─ .vscode/               ← VS Code run/debug configurations (press F5)
├─ README.md              ← full feature + API documentation
├─ backend/               ← FastAPI app, catalogue, WhatsApp, tracking, owner
└─ frontend/              ← the website (HTML / CSS / JS, no build step)
```

---

## 1. Install Python (once per computer)

Download **Python 3.11 or newer** from <https://www.python.org/downloads/> and, on
Windows, tick **“Add python.exe to PATH”** in the installer.

Check it worked — open a terminal and run:

```bash
python --version      # Windows
python3 --version     # macOS / Linux
```

---

## 2. Start the website

**Windows:** double-click **`start.bat`**.
The first run creates `.venv`, installs the packages and opens the browser; after that it
starts in a couple of seconds. Keep the black window open — closing it stops the site.

**macOS / Linux:**

```bash
bash start.sh
```

**By hand (any OS):**

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
python run.py                 # add --open to launch the browser
```

Then open:

| Page | Address | Who uses it |
| --- | --- | --- |
| Shop | <http://127.0.0.1:8000> | customers |
| Order tracking | <http://127.0.0.1:8000/track.html> | customers (link is sent on WhatsApp) |
| Owner dashboard | <http://127.0.0.1:8000/owner.html> | the client |
| API reference | <http://127.0.0.1:8000/docs> | developer |

The database is created automatically at `backend/data/buddy_herbal.db` and filled with
the full catalogue on first start. Restarting is always safe.

Useful flags: `python run.py --port=8080`, `--reload` (auto-restart while editing),
`--host=0.0.0.0` (needed on a server/Docker, see §8).

---

## 3. Open it in VS Code

1. **File → Open Folder…** → choose this `buddy-herbal-handover` folder.
2. Install the **Python** extension (Microsoft) when VS Code suggests it.
3. Press **F5** and pick **“BUDDY herbal (python run.py)”**.
   Use **“BUDDY herbal (auto reload)”** while editing code.
4. Stop with the red square in the debug toolbar.

No build step, no `npm install` — save a file, refresh the browser.

---

## 4. Change these five things before going live

Open **`.env`** in the root folder:

| Setting | What to do |
| --- | --- |
| `OWNER_PASSWORD` | **Change it.** This is the dashboard password. Default `buddy-owner`; while it is unchanged the dashboard shows a red warning. |
| `WHATSAPP_NUMBER` | The shop’s number in international format, digits only — `91` + the 10-digit number. Currently `918903247497`. |
| `PUBLIC_BASE_URL` | The public address of the site, e.g. `https://buddyherbal.in`. Tracking and dashboard links inside WhatsApp messages use it. |
| `STAGE_SECONDS` | `45` = demo speed (whole journey ≈ 4 min). For real trading use `3600` (1 hour per stage) or `0` to move orders only by hand. |
| `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` | Leave empty for demo mode; fill both to send real WhatsApp messages (§6). |

Restart the server after editing `.env`.

**The business number also appears in the frontend** (`frontend/js/api.js`, and `wa.me`
links in `frontend/index.html` and `frontend/track.html`). If the client uses a different
number, search the project for `918903247497` and replace every hit.

---

## 5. Teaching the client the dashboard (10 minutes)

1. Open `/owner.html`, sign in with `OWNER_PASSWORD`.
2. Place a test order on the site — it appears within 15 seconds with the customer’s name,
   tap-to-call number, address, notes and items.
3. The right-hand panel lists **every alert sent to the shop’s WhatsApp** for new orders.
4. Change the stage from the dropdown (or press the next-stage button): the customer gets a
   WhatsApp update automatically and auto-tracking pauses for that order, so the shop stays
   in control. *resume auto tracking* hands it back to the timer.
5. **Search** (top of Orders) finds any order ever placed by code, phone number or name —
   try `bh` + the code, or `98765 00011`.
6. **Resend** sends the confirmation again if a customer says they got nothing.

The customer-facing tracking page deliberately shows the phone as `98••••0011` and only the
locality of the address; full details are visible only in the dashboard.

---

## 6. Switching WhatsApp from demo to real

Out of the box nothing is sent: confirmations, owner alerts and bot replies are stored and
shown in the site’s “WhatsApp bot” panel (and at `/api/whatsapp/outbox`). That is what the
client sees in a demo.

To send for real:

1. Create a Meta app → add the **WhatsApp** product → note the **permanent access token**
   and the **phone number ID**.
2. Put them in `.env`:
   ```env
   WHATSAPP_TOKEN=EAAG...your permanent token
   WHATSAPP_PHONE_NUMBER_ID=1234567890
   WHATSAPP_VERIFY_TOKEN=choose-a-secret
   ```
3. Deploy the site on HTTPS (a tunnel such as `cloudflared tunnel --url http://localhost:8000`
   is fine for testing) and set the Meta webhook callback to
   `https://your-domain/api/whatsapp/webhook` with the same verify token, then subscribe to
   the **messages** field.
4. Restart. `/api/health` should now report `"whatsapp_live": true`.

Checklist to give the customer: their WhatsApp number must be the business number they
registered with Meta, and the customer must have messaged the business once (or use an
approved template) if Meta’s 24-hour rule applies.

---

## 7. Editing the shop

| What | Where |
| --- | --- |
| Products, soaps, herbs, benefits, colours | `backend/catalog_data.py` |
| Mould shapes & prices of the custom studio | `backend/services/pricing.py` |
| Delivery fee / free-delivery threshold | `backend/config.py` (`shipping_fee`, `free_shipping_above`) |
| Site copy, sections, footer | `frontend/index.html` |
| Colours, spacing, all animation | `frontend/css/style.css` |
| Tracking stages & their wording | `backend/config.py` (`TRACKING_STAGES`) |

Change a file, restart (or run with `--reload`), then refresh. The catalogue is re-seeded on
every start, so edits to products show up immediately; existing orders are untouched.

---

## 8. Putting it online

The app needs a normal Python process with a **persistent disk** (SQLite keeps the orders),
not a static host. Simple options:

* **A small VPS** (Ubuntu): copy this folder, `python -m venv .venv`,
  `pip install -r requirements.txt`, then run
  `.venv/bin/python run.py --host=0.0.0.0 --port=8000` under `systemd`, and put nginx with
  HTTPS in front. Set `PUBLIC_BASE_URL` to the domain.
* **Any Python app host** (Render, Railway, Fly.io…): start command
  `python run.py --host=0.0.0.0 --port=$PORT`, and attach a disk so
  `backend/data/buddy_herbal.db` survives redeploys.
* **A quick demo from a laptop**: `python run.py --host=0.0.0.0` plus
  `cloudflared tunnel --url http://localhost:8000` (or ngrok) gives a public HTTPS URL.

Keep **one** worker process: the automatic tracking timer and SQLite are designed for a
single process. HTTPS is required for the WhatsApp webhook.

---

## 9. Data, backup and reset

* All orders live in **`backend/data/buddy_herbal.db`**. Copy that one file to back up
  everything; copy it back to restore.
* To start completely fresh: stop the server, delete `backend/data/buddy_herbal.db`, start
  again — the catalogue re-seeds and the order list is empty.
* Orders are never sent anywhere: the client’s data stays on their machine/server.

---

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `start.bat` flashes and closes | Python is not installed or not on PATH — reinstall Python with “Add python.exe to PATH”. |
| `python` opens the Microsoft Store (Windows) | Use the `py -3` launcher, or install Python from python.org and untick the Store alias in Settings → Apps → App execution aliases. |
| `[Errno 10048] address already in use` | Another copy is already running: close the other window, or start with `python run.py --port=8001`. |
| `pip install` fails | Check the internet/proxy, then run `start.bat` again; a partial download is retried. |
| Pages load but no products | You are opening `index.html` from the file system. Always use the URL printed by `run.py`. |
| Dashboard answers 401 / keeps asking to sign in | Session expired or `OWNER_PASSWORD` was changed — sign in again. |
| WhatsApp messages show as “simulated” | Expected until `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are set (§6). |
| Emoji look garbled in the black console | Harmless Windows console font issue; the website is unaffected. |
| Orders vanish after a redeploy | The host has no persistent disk for `backend/data/` — attach one (§8). |

---

## 11. What was tested

* Catalogue, product detail, custom-bar pricing (all 7 moulds, price identical across
  shapes), order placement, automatic tracking through all six stages, tracking page polling.
* WhatsApp flow in simulated mode: customer confirmation, owner alert with full order
  details, bot menu → basket → address → order, status updates.
* Owner dashboard: sign-in/out, 401 when signed out, stats, order list with customer data,
  stage change (customer notified, auto-tracking paused), resend, search by code / phone /
  name, and masked phone + address on the public tracking payload.
* Frontend: every module parses, every page and asset returns 200, no console-breaking
  imports.

Not covered by automated checks: the look of the pages on a real device (it was reviewed
during design but not screenshotted at handover), real WhatsApp delivery to a live Meta
account, and any hosting provider’s specific setup. Do a five-minute click-through on the
client’s machine before handing over.
