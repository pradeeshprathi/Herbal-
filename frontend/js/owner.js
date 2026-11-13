/* Owner dashboard: sign in, see every order, move it along, read your alerts. */

import { money, timeAgo, clock } from './api.js';
import { escapeHtml, toast, $, $$ } from './ui.js';

const state = {
  orders: [],
  statuses: [],
  filter: 'all',
  query: '',
  timer: null,
  searchTimer: null,
  busy: false,
};

const CHANNEL_LABEL = { website: 'Website', whatsapp: 'WhatsApp', customizer: 'Custom studio' };

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 401) throw new Error('unauthorised');
  if (!res.ok) throw new Error((data && data.detail) || `Request failed (${res.status})`);
  return data;
}

/* ------------------------------------------------------------- auth screens */
function showLogin() {
  $('#ownerLogin').hidden = false;
  $('#ownerDash').hidden = true;
  $('#logoutBtn').hidden = true;
  stopTimer();
}

function showDash() {
  $('#ownerLogin').hidden = true;
  $('#ownerDash').hidden = false;
  $('#logoutBtn').hidden = false;
  startTimer();
}

async function checkSession() {
  try {
    const s = await api('/api/owner/session');
    if (s.authenticated) {
      showDash();
      loadOverview();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
    hint('Could not reach the shop. Is the server running?');
  }
}

function hint(text) {
  const el = $('#loginHint');
  if (el) el.textContent = text;
}

async function login(event) {
  event.preventDefault();
  const input = $('#ownerPassword');
  const btn = $('#loginBtn');
  const password = input ? input.value : '';
  if (!password) return;

  btn.disabled = true;
  btn.innerHTML = '<span>Signing in…</span>';
  hint('');
  try {
    await api('/api/owner/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (input) input.value = '';
    showDash();
    await loadOverview();
    toast('Welcome back');
  } catch (err) {
    hint(err.message === 'unauthorised' ? 'Incorrect password' : err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Sign in</span>';
  }
}

async function logout() {
  try {
    await api('/api/owner/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  state.orders = [];
  state.query = '';
  const search = $('#ownerSearch');
  if (search) search.value = '';
  showLogin();
  toast('Signed out');
}

/* ------------------------------------------------------------------- data */
async function loadOverview() {
  try {
    const qs = state.query ? `?q=${encodeURIComponent(state.query)}` : '';
    const data = await api(`/api/owner/overview${qs}`);
    state.orders = data.orders;
    state.statuses = data.statuses;
    renderStats(data.stats);
    renderOrders();
    renderNotes(data.notifications);
    const mode = $('#ownerMode');
    if (mode) mode.textContent = data.whatsapp_live ? 'WhatsApp live' : 'WhatsApp demo mode';
    const alert = $('#ownerAlert');
    if (alert) alert.hidden = !data.using_default_password;
    const updated = $('#ownerUpdated');
    if (updated) updated.textContent = `updated ${clock(new Date().toISOString())}`;
  } catch (err) {
    if (err.message === 'unauthorised') {
      showLogin();
      hint('Your session expired — please sign in again.');
      return;
    }
    toast(err.message || 'Could not load orders', 'error');
  }
}

function startTimer() {
  stopTimer();
  state.timer = setInterval(() => {
    if (document.hidden) return;
    loadOverview();
  }, 15000);
}

function stopTimer() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

/* ------------------------------------------------------------------ stats */
function renderStats(stats) {
  const wrap = $('#ownerStats');
  if (!wrap) return;
  const cards = [
    ['Orders today', String(stats.today_orders)],
    ['Revenue today', money(stats.today_revenue)],
    ['In progress', String(stats.in_progress)],
    ['Delivered', String(stats.delivered)],
    ['All-time revenue', money(stats.revenue)],
    ['Average order', money(stats.average_order)],
  ];
  wrap.innerHTML = cards
    .map(
      ([label, value], i) => `
      <div class="owner-stat" style="animation: fadeUp .5s ${i * 50}ms backwards">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>`
    )
    .join('');
}

/* ----------------------------------------------------------------- orders */
function itemsMarkup(order) {
  return order.items
    .map((item) => {
      const d = item.details || {};
      let detail = '';
      if (item.kind === 'custom') {
        const bits = [];
        if (d.size) bits.push(d.size);
        if (d.shape_label || d.shape) bits.push(`${d.shape_label || d.shape} mould`);
        if (d.base && d.base.name) bits.push(d.base.name);
        if (Array.isArray(d.ingredients) && d.ingredients.length) {
          bits.push(d.ingredients.join(', '));
        }
        detail = bits.join(' · ');
      } else if (d.weight) {
        detail = d.weight;
      }
      return `
        <li>
          <span>${escapeHtml(item.name)} × ${item.qty}
            ${detail ? `<span class="owner-order__detail">${escapeHtml(detail)}</span>` : ''}
          </span>
          <span>${money(item.line_total)}</span>
        </li>`;
    })
    .join('');
}

function orderCard(order) {
  const idx = state.statuses.findIndex((s) => s.key === order.status);
  const next = idx > -1 && idx < state.statuses.length - 1 ? state.statuses[idx + 1] : null;
  const customer = order.customer || {};

  return `
    <article class="owner-order" data-code="${escapeHtml(order.code)}" data-status="${escapeHtml(order.status)}">
      <div class="owner-order__top">
        <div>
          <p class="owner-order__code">${escapeHtml(order.code)}</p>
          <p class="owner-order__meta">
            ${escapeHtml(timeAgo(order.created_at))} · ${escapeHtml(CHANNEL_LABEL[order.channel] || order.channel)}
          </p>
        </div>
        <span class="owner-chip" data-status="${escapeHtml(order.status)}">${escapeHtml(order.status_label)}</span>
      </div>

      <div class="owner-order__customer">
        <strong>${escapeHtml(customer.name || '')}</strong>
        <a href="tel:${escapeHtml(customer.phone || '')}">${escapeHtml(customer.phone || '')}</a>
        ${customer.address ? `<span class="owner-order__addr">${escapeHtml(customer.address)}</span>` : ''}
        ${customer.notes ? `<span class="owner-order__notes">“${escapeHtml(customer.notes)}”</span>` : ''}
      </div>

      <ul class="owner-order__items">${itemsMarkup(order)}</ul>

      <div class="owner-order__foot">
        <span class="owner-order__total">
          ${money(order.total)}
          <small>${order.shipping ? `incl. ${money(order.shipping)} delivery` : 'free delivery'}</small>
        </span>
        <div class="owner-order__actions">
          <a class="btn btn--ghost btn--sm" href="${order.customer_link}" target="_blank" rel="noopener"><span>WhatsApp</span></a>
          <a class="btn btn--ghost btn--sm" href="${order.tracking_url || `/track.html?code=${order.code}`}" target="_blank" rel="noopener"><span>Track</span></a>
          <select class="owner-status-select" data-status-select aria-label="Set status for ${escapeHtml(order.code)}">
            ${state.statuses
              .map(
                (s) =>
                  `<option value="${s.key}"${s.key === order.status ? ' selected' : ''}>${escapeHtml(s.label)}</option>`
              )
              .join('')}
          </select>
          ${
            next
              ? `<button class="btn btn--dark btn--sm" data-advance="${next.key}"><span>${escapeHtml(next.label)}</span></button>`
              : ''
          }
        </div>
      </div>
      ${
        order.auto_track
          ? ''
          : `<p class="owner-order__meta">Auto tracking paused ·
               <button class="owner-resume" data-resume>resume auto tracking</button></p>`
      }
    </article>`;
}

function visibleOrders() {
  if (state.filter === 'delivered') {
    return state.orders.filter((o) => o.status === 'delivered');
  }
  if (state.filter === 'progress') {
    return state.orders.filter((o) => o.status !== 'delivered');
  }
  return state.orders;
}

function renderOrders() {
  const wrap = $('#ownerOrders');
  if (!wrap) return;
  const list = visibleOrders();
  if (!list.length) {
    wrap.innerHTML = state.query
      ? `
      <div class="owner-empty">
        <strong>No order matches “${escapeHtml(state.query)}”</strong>
        <p>Try the order code (BH…), the customer's phone number, or their name — every order ever placed is searched, not just this page.</p>
      </div>`
      : `
      <div class="owner-empty">
        <strong>No orders here yet</strong>
        <p>Orders placed on the website — or through the WhatsApp bot — show up here automatically.</p>
      </div>`;
    return;
  }
  wrap.innerHTML = list.map(orderCard).join('');
}

/* ---------------------------------------------------------- notifications */
function renderNotes(notes) {
  const wrap = $('#ownerNotes');
  if (!wrap) return;
  if (!notes || !notes.length) {
    wrap.innerHTML = '<div class="owner-empty">No alerts yet. Place an order to see one arrive.</div>';
    return;
  }
  wrap.innerHTML = notes
    .map(
      (n) => `
      <div class="owner-note">
        <p class="owner-note__body">${escapeHtml(n.body)}</p>
        <div class="owner-note__meta">
          <span>${escapeHtml(timeAgo(n.created_at))}${
            n.order_code ? ` · ${escapeHtml(n.order_code)}` : ''
          }</span>
          <span class="owner-note__mode" data-live="${n.status === 'sent'}">
            ${n.status === 'sent' ? 'delivered' : n.status}
          </span>
        </div>
      </div>`
    )
    .join('');
}

/* --------------------------------------------------------------- actions */
async function setStatus(code, status, autoTrack, notify = true) {
  if (state.busy) return;
  state.busy = true;
  try {
    await api(`/api/owner/orders/${encodeURIComponent(code)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, auto_track: autoTrack, notify }),
    });
    toast(`${code} → ${status.replace(/_/g, ' ')}`);
    await loadOverview();
  } catch (err) {
    toast(err.message || 'Could not update the order', 'error');
  } finally {
    state.busy = false;
  }
}

function bindBoard() {
  const board = $('#ownerOrders');
  if (!board) return;

  board.addEventListener('click', (e) => {
    const advance = e.target.closest('[data-advance]');
    if (advance) {
      const card = advance.closest('.owner-order');
      setStatus(card.dataset.code, advance.dataset.advance, false);
      return;
    }
    const resume = e.target.closest('[data-resume]');
    if (resume) {
      const card = resume.closest('.owner-order');
      setStatus(card.dataset.code, card.dataset.status, true, false);
    }
  });

  board.addEventListener('change', (e) => {
    const select = e.target.closest('[data-status-select]');
    if (!select) return;
    const card = select.closest('.owner-order');
    setStatus(card.dataset.code, select.value, false);
  });

  $$('.owner-filters .filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      $$('.owner-filters .filter').forEach((b) => b.classList.toggle('is-active', b === btn));
      renderOrders();
    });
  });

  $('#refreshBtn')?.addEventListener('click', async () => {
    await loadOverview();
    toast('Refreshed');
  });

  const search = $('#ownerSearch');
  if (search) {
    search.addEventListener('input', () => {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => {
        state.query = search.value.trim();
        loadOverview();
      }, 250);
    });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && search.value) {
        search.value = '';
        state.query = '';
        loadOverview();
      }
    });
  }

  $('#logoutBtn')?.addEventListener('click', logout);
  $('#loginForm')?.addEventListener('submit', login);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !$('#ownerDash')?.hidden) loadOverview();
});

bindBoard();
checkSession();
