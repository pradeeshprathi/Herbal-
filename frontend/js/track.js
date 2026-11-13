/* Live tracking page: fetch the order, draw the timeline, poll until delivered. */

import { api, money, clock } from './api.js';
import { escapeHtml, $ } from './ui.js';

const ICONS = {
  receipt: '<path d="M12 4h8v16l-4-2-4 2V4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 8h4M14 12h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  check: '<path d="M5 12l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  truck: '<path d="M3 7h10v9H3zM13 10h4l3 3v3h-7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="17" cy="18" r="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  pin: '<path d="M12 21s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10Z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="11" r="2.2" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  home: '<path d="M4 20V10l8-6 8 6v10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9.5 20v-6h5v6" fill="none" stroke="currentColor" stroke-width="1.5"/>',
};

let pollTimer = null;
let currentCode = '';

const icon = (key) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[key] || ICONS.check}</svg>`;

function humanEta(seconds) {
  if (seconds <= 0) return 'any moment now';
  if (seconds < 60) return `in about ${seconds}s`;
  const mins = Math.round(seconds / 60);
  return `in about ${mins} min`;
}

async function load(code, { silent = false } = {}) {
  const wrap = $('#trackResult');
  if (!code) return;
  currentCode = code;

  if (!silent && wrap) {
    wrap.innerHTML = `<div class="track-card"><p class="live-badge"><i></i> Fetching your parcel…</p></div>`;
  }

  try {
    const res = await api.track(code);
    render(res.order);
  } catch (err) {
    if (silent) return;
    if (wrap) {
      wrap.innerHTML = `
        <div class="track-card track-empty">
          <strong>We could not find that order</strong>
          <p style="font-size:.9rem;color:rgba(20,38,28,.6)">
            ${escapeHtml(err.message || 'Please check the code and try again.')}<br>
            Codes look like <strong>BH1A2B3C</strong>.
          </p>
          <a class="btn btn--dark" style="margin-top:16px" href="https://wa.me/918903247497" target="_blank" rel="noopener"><span>Ask us on WhatsApp</span></a>
        </div>`;
    }
  }
}

function render(order) {
  const wrap = $('#trackResult');
  if (!wrap) return;
  const delivered = order.status === 'delivered';

  wrap.innerHTML = `
    <div class="track-card">
      <div class="track-head">
        <div>
          <p class="live-badge" style="margin-bottom:8px"><i></i> ${delivered ? 'Delivered' : 'Live updates on'}</p>
          <p class="track-code">${escapeHtml(order.code)}</p>
          <p class="track-meta">
            For ${escapeHtml(order.customer.name)} · placed ${clock(order.created_at)} · ${escapeHtml(order.channel)}
          </p>
          ${
            order.customer.address || order.customer.phone
              ? `<p class="track-private">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            Delivering to <strong>${escapeHtml(order.customer.address || 'your address')}</strong>
            · ${escapeHtml(order.customer.phone)}
            <span>full details kept private</span>
          </p>`
              : ''
          }
        </div>
        <span class="track-status"><i></i> ${escapeHtml(order.status_label)}</span>
      </div>

      <div class="track-progress"><div class="track-progress__fill" id="trackFill"></div></div>
      <p class="track-next">${
        delivered
          ? 'Delivered — enjoy your ritual 🌿'
          : `Next update ${humanEta(order.next_in_seconds)}`
      }</p>

      <ul class="timeline">
        ${order.timeline
          .map(
            (t) => `
          <li class="tl${t.reached ? ' is-reached' : ''}${t.active ? ' is-active' : ''}">
            <span class="tl__dot">${icon(t.icon)}</span>
            <div>
              <p class="tl__label">${escapeHtml(t.label)}</p>
              <p class="tl__note">${escapeHtml(t.note)}</p>
            </div>
            <span class="tl__time">${t.at ? clock(t.at) : '—'}</span>
          </li>`
          )
          .join('')}
      </ul>

      <div class="track-items">
        <h4>What is coming</h4>
        ${order.items
          .map(
            (i) => `
          <div class="track-item">
            <div>
              <span>${escapeHtml(i.name)}</span>
              <small>${
                i.details?.ingredients?.length
                  ? escapeHtml(i.details.ingredients.join(' · '))
                  : escapeHtml(i.details?.weight || '')
              } · × ${i.qty}</small>
            </div>
            <span>${money(i.line_total)}</span>
          </div>`
          )
          .join('')}
        <div class="track-item" style="font-weight:600;border-bottom:0;padding-top:14px">
          <span>Total paid</span><span>${money(order.total)}</span>
        </div>
      </div>

      <div class="track-actions">
        <a class="btn btn--gold" href="${order.support_link}" target="_blank" rel="noopener"><span>Message us about this order</span></a>
        <a class="btn btn--ghost" href="index.html#collection"><span>Continue shopping</span></a>
      </div>
    </div>`;

  requestAnimationFrame(() => {
    const fill = document.getElementById('trackFill');
    if (fill) fill.style.width = `${order.progress}%`;
  });

  clearTimeout(pollTimer);
  if (!delivered) {
    pollTimer = setTimeout(() => load(currentCode, { silent: true }), 5000);
  }
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('code') || '').trim().toUpperCase();
  const input = $('#trackCode');
  if (code && input) {
    input.value = code;
    load(code);
  }

  $('#trackForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = (input?.value || '').trim().toUpperCase();
    if (!value) return;
    const url = new URL(window.location.href);
    url.searchParams.set('code', value);
    history.replaceState({}, '', url);
    load(value);
  });
}

init();
