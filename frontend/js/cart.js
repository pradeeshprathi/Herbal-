/* Basket state, drawer, checkout form and the order success screen. */

import { api, money, load, save, waLink } from './api.js';
import { escapeHtml, toast, $, $$ } from './ui.js';
import { openModal, closeModal } from './modals.js';

const KEY = 'buddy-cart-v1';
const CUSTOMER_KEY = 'buddy-customer-v1';
const FREE_SHIPPING = 799;
const SHIPPING_FEE = 49;

export const cart = { items: load(KEY, []) };
const listeners = [];

export function onCartChange(fn) {
  listeners.push(fn);
  fn();
}

export const cartCount = () => cart.items.reduce((sum, i) => sum + i.qty, 0);
export const cartSubtotal = () =>
  cart.items.reduce((sum, i) => sum + i.unit_price * i.qty, 0);
const shippingFor = (subtotal) =>
  subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;

function persist() {
  save(KEY, cart.items);
  render();
  listeners.forEach((fn) => fn());
}

export function addProduct(product, qty = 1) {
  const existing = cart.items.find((i) => i.kind === 'product' && i.slug === product.slug);
  if (existing) {
    existing.qty = Math.min(20, existing.qty + qty);
  } else {
    cart.items.push({
      id: `p-${product.slug}`,
      kind: 'product',
      slug: product.slug,
      name: product.name,
      meta: `${product.weight} · ${product.category === 'soap' ? 'handmade soap' : product.category === 'pack' ? 'face pack' : 'powder'}`,
      unit_price: product.price,
      qty,
      colors: product.colors,
      visual: product.category === 'soap' ? 'soap' : 'pack',
      shape: product.shape || 'round',
    });
  }
  persist();
  bumpCart();
  toast(`${product.name} added to your basket`);
}

export function addCustom(quote) {
  const ingredientList = quote.ingredients.map((h) => h.name);
  const mould = quote.shape ? quote.shape[0].toUpperCase() + quote.shape.slice(1) : 'Round';
  const meta = `${quote.size} · ${mould} mould · ${quote.base.name} · ${ingredientList.join(', ')}`;
  cart.items.push({
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'custom',
    slug: 'custom-bar',
    name: quote.name,
    meta,
    unit_price: quote.unit_price,
    qty: quote.qty || 1,
          colors: { from: quote.palette.from, to: quote.palette.to },
            visual: 'soap',
      shape: quote.shape || 'round',
      custom: {
        base: quote.base.slug,
        size: quote.size,
        shape: quote.shape || 'round',
        name: quote.name,
        ingredients: quote.ingredients.map((h) => h.slug),
      },
  });
  persist();
  bumpCart();
  toast('Your custom bar is in the basket');
}

export function setQty(id, qty) {
  const item = cart.items.find((i) => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, Math.min(20, qty));
  persist();
}

export function removeItem(id) {
  cart.items = cart.items.filter((i) => i.id !== id);
  persist();
}

export function clearCart() {
  cart.items = [];
  persist();
}

function bumpCart() {
  const btn = $('#cartBtn');
  if (!btn) return;
  btn.classList.remove('is-bump');
  void btn.offsetWidth;
  btn.classList.add('is-bump');
}

/* ------------------------------------------------------------------ render */
export function render() {
  const body = $('#cartBody');
  const foot = $('#cartFoot');
  const badge = $('#cartCount');
  const count = cartCount();
  if (badge) {
    badge.textContent = String(count);
    badge.classList.toggle('is-on', count > 0);
  }
  if (!body || !foot) return;

  if (!cart.items.length) {
    body.innerHTML = `
      <div class="drawer__empty">
        <strong>Your basket is empty</strong>
        <p>Add a handmade bar — we wrap every order in paper, never plastic.</p>
      </div>`;
    foot.innerHTML = `<button class="btn btn--dark btn--block" data-browse>Browse the collection</button>`;
    foot.querySelector('[data-browse]')?.addEventListener('click', () => {
      closeCart();
      document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
    });
    return;
  }

  body.innerHTML = cart.items
    .map((item) => {
      const colors = item.colors || { from: '#3F7A46', to: '#9CCB74' };
      return `
      <div class="line-item" data-id="${item.id}">
        <div class="line-item__thumb${item.visual === 'pack' ? ' line-item__thumb--pack' : ''}" style="--from:${colors.from};--to:${colors.to}"></div>
        <div>
          <p class="line-item__name">${escapeHtml(item.name)}</p>
          <p class="line-item__meta">${escapeHtml(item.meta || '')}</p>
        </div>
        <div class="line-item__right">
          <span class="line-item__price">${money(item.unit_price * item.qty)}</span>
          <div class="qty">
            <button data-dec aria-label="Decrease">−</button>
            <span>${item.qty}</span>
            <button data-inc aria-label="Increase">+</button>
          </div>
          <button class="line-item__remove" data-remove>remove</button>
        </div>
      </div>`;
    })
    .join('');

  body.querySelectorAll('.line-item').forEach((row) => {
    const id = row.dataset.id;
    const item = cart.items.find((i) => i.id === id);
    row.querySelector('[data-dec]')?.addEventListener('click', () => setQty(id, item.qty - 1));
    row.querySelector('[data-inc]')?.addEventListener('click', () => setQty(id, item.qty + 1));
    row.querySelector('[data-remove]')?.addEventListener('click', () => removeItem(id));
  });

  const subtotal = cartSubtotal();
  const shipping = shippingFor(subtotal);
  const away = FREE_SHIPPING - subtotal;

  foot.innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
    <div class="summary-row"><span>Delivery</span><span>${shipping === 0 ? 'FREE' : money(shipping)}</span></div>
    <div class="summary-row summary-row--total"><span>Total</span><span>${money(subtotal + shipping)}</span></div>
    <p class="summary-note">${
      away > 0
        ? `Add ${money(away)} more for free delivery`
        : 'Free delivery unlocked 🌿'
    }</p>
    <button class="btn btn--dark btn--block" data-checkout>Checkout &amp; confirm</button>
    <p class="summary-note">Every order is confirmed on WhatsApp within seconds.</p>`;

  foot.querySelector('[data-checkout]')?.addEventListener('click', () => {
    closeCart();
    openCheckout();
  });
}

/* ------------------------------------------------------------------ drawer */
export function openCart() {
  const drawer = $('#cartDrawer');
  const backdrop = $('#drawerBackdrop');
  if (!drawer || !backdrop) return;
  render();
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('is-on');
  });
  document.body.classList.add('is-locked');
}

export function closeCart() {
  const drawer = $('#cartDrawer');
  const backdrop = $('#drawerBackdrop');
  if (!drawer || !backdrop) return;
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.classList.remove('is-on');
  document.body.classList.remove('is-locked');
  setTimeout(() => {
    if (!drawer.classList.contains('is-open')) backdrop.hidden = true;
  }, 450);
}

/* ---------------------------------------------------------------- checkout */
export function openCheckout() {
  const body = $('#checkoutBody');
  if (!body) return;
  if (!cart.items.length) {
    toast('Your basket is empty', 'error');
    return;
  }

  const saved = load(CUSTOMER_KEY, { name: '', phone: '', address: '' });
  const subtotal = cartSubtotal();
  const shipping = shippingFor(subtotal);

  body.innerHTML = `
    <div class="checkout">
      <h3>Where should we send it?</h3>
      <p class="checkout__lead">We will confirm on WhatsApp the moment you place the order.</p>
      <form id="checkoutForm">
        <div class="form-grid form-grid--2">
          <label class="field"><span>Your name</span>
            <input name="name" required maxlength="120" value="${escapeHtml(saved.name)}" placeholder="Lakshmi" />
          </label>
          <label class="field"><span>WhatsApp number</span>
            <input name="phone" required inputmode="tel" value="${escapeHtml(saved.phone)}" placeholder="98765 43210" />
          </label>
        </div>
        <div class="form-grid">
          <label class="field"><span>Delivery address</span>
            <textarea name="address" rows="3" maxlength="600" placeholder="Door no, street, city, pincode">${escapeHtml(saved.address)}</textarea>
          </label>
          <label class="field"><span>Notes <em>(optional)</em></span>
            <textarea name="notes" rows="2" maxlength="600" placeholder="Gift wrap, delivery timing, anything else…"></textarea>
          </label>
        </div>

        <div class="checkout__summary">
          ${cart.items
            .map(
              (i) =>
                `<div class="summary-row"><span>${escapeHtml(i.name)} × ${i.qty}</span><span>${money(i.unit_price * i.qty)}</span></div>`
            )
            .join('')}
          <div class="summary-row"><span>Delivery</span><span>${shipping === 0 ? 'FREE' : money(shipping)}</span></div>
          <div class="summary-row summary-row--total"><span>Total</span><span>${money(subtotal + shipping)}</span></div>
        </div>

        <div class="checkout__actions">
          <button type="submit" class="btn btn--gold btn--block" data-submit>
            <span>Place order · confirm on WhatsApp</span>
          </button>
          <a class="btn btn--ghost btn--block" href="${waLink('Hi BUDDY herbal, I would like to place an order.')}" target="_blank" rel="noopener">
            <span>Or just chat with us first</span>
          </a>
        </div>
        <p class="checkout__fine">You will receive an automatic WhatsApp confirmation with a live tracking link.</p>
      </form>
    </div>`;

  const form = $('#checkoutForm', body);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitOrder(form);
  });

  openModal('checkoutModal');
}

async function submitOrder(form) {
  const btn = form.querySelector('[data-submit]');
  const data = new FormData(form);
  const customer = {
    name: String(data.get('name') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    address: String(data.get('address') || '').trim(),
    notes: String(data.get('notes') || '').trim(),
  };
  save(CUSTOMER_KEY, customer);

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Placing your order…</span>';
  }

  const items = cart.items.map((i) =>
    i.kind === 'custom'
      ? {
          qty: i.qty,
          custom: {
            base: i.custom.base,
            ingredients: i.custom.ingredients,
            size: i.custom.size,
            shape: i.custom.shape,
            name: i.custom.name,
          },
        }
      : { slug: i.slug, qty: i.qty }
  );

  try {
    const res = await api.order({
      customer,
      items,
      channel: cart.items.some((i) => i.kind === 'custom') ? 'customizer' : 'website',
      notify_whatsapp: true,
    });
    clearCart();
    showSuccess(res.order);
    closeCart();
  } catch (err) {
    toast(err.message || 'Could not place the order', 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Place order · confirm on WhatsApp</span>';
    }
  }
}

function showSuccess(order) {
  const body = $('#checkoutBody');
  if (!body) return;
  const phone = order.customer.phone || '';
  body.innerHTML = `
    <div class="success">
      <div class="success__tick">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d="M11 21l6 6 12-14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h3>Order placed, ${escapeHtml((order.customer.name || '').split(' ')[0])}!</h3>
      <span class="success__code">${escapeHtml(order.code)}</span>
      <p class="success__sub">
        An automatic confirmation was just queued to your WhatsApp${phone ? ` (${escapeHtml(phone)})` : ''}.
        Your parcel now moves through every stage on its own — watch it live.
      </p>

      <div class="wa-preview">
        <div class="wa-preview__head"><span class="wa-dot"></span> WhatsApp · auto confirmation</div>
        <pre id="waPreviewText"></pre>
      </div>

      <div class="success__actions">
        <a class="btn btn--gold btn--block" href="${order.tracking_url}" target="_blank" rel="noopener">
          <span>Track my order live</span>
        </a>
        <a class="btn btn--dark btn--block" href="${order.whatsapp_link}" target="_blank" rel="noopener">
          <span>Open the WhatsApp chat</span>
        </a>
        <button class="btn btn--ghost btn--block" data-done>
          <span>Continue shopping</span>
        </button>
      </div>
      <p class="checkout__fine">Keep your code <strong>${escapeHtml(order.code)}</strong> — it works on the tracking page anytime.</p>
    </div>`;

  const pre = document.getElementById('waPreviewText');
  if (pre) pre.textContent = order.confirmation_message || '';

  body.querySelector('[data-done]')?.addEventListener('click', () => closeModal('checkoutModal'));
}

/* --------------------------------------------------------------- bootstrap */
export function initCart() {
  const cartBtn = $('#cartBtn');
  const closeBtn = $('#closeCart');
  const backdrop = $('#drawerBackdrop');

  cartBtn?.addEventListener('click', openCart);
  closeBtn?.addEventListener('click', closeCart);
  backdrop?.addEventListener('click', closeCart);

  $$('[data-close-checkout]').forEach((el) =>
    el.addEventListener('click', () => closeModal('checkoutModal'))
  );

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#cartDrawer')?.classList.contains('is-open')) closeCart();
  });

  render();
}
