/* Collection rendering, filters, the ingredient glossary and product modal. */

import { money, waLink } from './api.js';
import { createProductVisual } from './soap.js';
import { attachTilt, escapeHtml, $, $$, toast } from './ui.js';
import { addProduct, openCart } from './cart.js';
import { openModal, closeModal } from './modals.js';

export const app = { catalog: null, filter: 'all' };

const tint = (hex, alpha = '22') => `${hex}${alpha}`;

export function initCatalog(catalog) {
  app.catalog = catalog;
  renderHero(catalog.products);
  renderGrid();
  renderHerbs(catalog.ingredients);
  bindFilters();
  bindModalClose();
  bindFilterLinks();
}

/* ------------------------------------------------------------------- hero */
function renderHero(products) {
  const stage = $('#heroSoaps');
  if (!stage) return;
  const picks = ['kuppaimeni-soap', 'manjistha-soap', 'rose-soap']
    .map((slug) => products.find((p) => p.slug === slug))
    .filter(Boolean);

  picks.forEach((p) => {
    stage.appendChild(createProductVisual(p, { idle: true }));
  });
}

/* ------------------------------------------------------------------- grid */
function renderGrid() {
  const grid = $('#productGrid');
  if (!grid || !app.catalog) return;
  const items = app.catalog.products.filter(
    (p) => app.filter === 'all' || p.category === app.filter
  );

  grid.innerHTML = '';
  if (!items.length) {
    grid.innerHTML = '<p style="text-align:center;opacity:.6">Nothing in this category yet.</p>';
    return;
  }

  items.forEach((p, index) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.slug = p.slug;
    // "backwards" (not "both") so the animation stops overriding the tilt transform
    card.style.animation = `fadeUp .6s ${index * 60}ms backwards`;

    const off = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;

    const stage = document.createElement('div');
    stage.className = 'card__stage';
    stage.style.setProperty('--stage-from', tint(p.colors.from, '24'));
    stage.style.setProperty('--stage-to', p.colors.accent);

    // soaps arrive as their own mould (leaf, rose, hexagon…) and powders as a jar
    stage.appendChild(createProductVisual(p));
    stage.insertAdjacentHTML(
      'beforeend',
      `<span class="card__badge">${escapeHtml(p.badge)}</span>
       ${off ? `<span class="card__save">−${off}%</span>` : ''}
       <span class="card__drag">drag to spin</span>`
    );

    const body = document.createElement('div');
    body.className = 'card__body';
    body.innerHTML = `
      <h3 class="card__name">${escapeHtml(p.name)}</h3>
      <p class="card__tamil">${escapeHtml(p.tamil_name)}</p>
      <p class="card__tagline">${escapeHtml(p.tagline)}</p>
      <div class="card__herbs">
        ${p.ingredients
          .slice(0, 4)
          .map(
            (i) => `<span><i style="background:${i.color}"></i>${escapeHtml(i.name)}</span>`
          )
          .join('')}
        ${p.ingredients.length > 4 ? `<span>+${p.ingredients.length - 4} more</span>` : ''}
      </div>
      <div class="card__foot">
        <span class="price">${money(p.price)} <s>${money(p.mrp)}</s><br><small>${escapeHtml(p.weight)}</small></span>
        <div class="card__actions">
          <button class="btn btn--ghost" data-open>Ingredients</button>
          <button class="btn btn--dark" data-add>Add</button>
        </div>
      </div>`;

    card.append(stage, body);
    grid.appendChild(card);
    attachTilt(card, 5);

    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openProduct(p);
    });
    body.querySelector('[data-open]')?.addEventListener('click', () => openProduct(p));
    body.querySelector('[data-add]')?.addEventListener('click', () => {
      addProduct(p);
      openCart();
    });
  });
}

/* ----------------------------------------------------------------- filters */
function bindFilters() {
  const wrap = $('#filters');
  if (!wrap) return;
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    app.filter = btn.dataset.filter;
    $$('.filter', wrap).forEach((b) => b.classList.toggle('is-active', b === btn));
    renderGrid();
  });
}

function bindFilterLinks() {
  $$('[data-filter-link]').forEach((link) => {
    link.addEventListener('click', () => {
      const wanted = link.dataset.filterLink;
      const btn = document.querySelector(`.filter[data-filter="${wanted}"]`);
      if (btn) btn.click();
    });
  });
}

/* ------------------------------------------------------------ herb glossary */
function renderHerbs(ingredients) {
  const grid = $('#herbGrid');
  if (!grid) return;
  grid.innerHTML = ingredients
    .map(
      (h, i) => `
      <div class="flip" style="--herb-color:${h.color}">
        <div class="flip__inner">
          <div class="flip__side flip__front">
            <span class="flip__num">${String(i + 1).padStart(2, '0')}</span>
            <div>
              <div class="flip__dot"></div>
              <p class="flip__name">${escapeHtml(h.name)}</p>
              <p class="flip__tamil">${escapeHtml(h.tamil_name)}</p>
            </div>
          </div>
          <div class="flip__side flip__back">
            <p>${escapeHtml(h.benefit)}</p>
            <small>${escapeHtml(h.note || '')}</small>
          </div>
        </div>
      </div>`
    )
    .join('');
}

/* ------------------------------------------------------------ product modal */
export function openProduct(p) {
  const body = $('#modalBody');
  if (!body || !p) return;

  body.innerHTML = `
    <div class="product">
      <div class="product__visual" style="--stage-from:${tint(p.colors.from, '2a')};--stage-to:${p.colors.accent}">
        <span class="product__drag">drag to spin the bar</span>
      </div>
      <div class="product__info">
        <span class="product__badge">${escapeHtml(p.badge)} · ${escapeHtml(p.weight)}</span>
        <h2 class="product__name" id="productTitle">${escapeHtml(p.name)}</h2>
        <p class="product__tamil">${escapeHtml(p.tamil_name)} — ${escapeHtml(p.tagline)}</p>
        <p class="product__desc">${escapeHtml(p.description)}</p>

        <div class="product__section">
          <h4>What is inside (${p.ingredients.length} ingredients)</h4>
          <div class="ing-list">
            ${p.ingredients
              .map(
                (i, idx) => `
              <div class="ing" style="animation-delay:${idx * 55}ms">
                <i style="background:${i.color}"></i>
                <span><strong>${escapeHtml(i.name)}</strong><br><span style="font-size:.76rem;opacity:.55">${escapeHtml(i.tamil_name)}</span></span>
                <em>${escapeHtml(i.role)}</em>
              </div>`
              )
              .join('')}
          </div>
        </div>

        <div class="product__section">
          <h4>Why it is good for you</h4>
          <div class="benefits">
            ${p.benefits
              .map(
                (b) => `
              <div class="benefit">
                <strong>${escapeHtml(b.title)}</strong>
                <p>${escapeHtml(b.detail)}</p>
              </div>`
              )
              .join('')}
          </div>
        </div>

        <div class="product__buy">
          <div class="product__price">
            ${money(p.price)} <s>${money(p.mrp)}</s>
            <small>${escapeHtml(p.weight)} · handmade</small>
          </div>
          <button class="btn btn--dark" data-modal-add>
            <span>Add to basket</span>
          </button>
          <a class="btn btn--ghost" href="${waLink(
            `Hi BUDDY herbal! I would like to order the ${p.name} (${p.weight}).`
          )}" target="_blank" rel="noopener">
            <span>Ask on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>`;

  const visual = body.querySelector('.product__visual');
  visual.prepend(createProductVisual(p, { size: 250 }));

  body.querySelector('[data-modal-add]')?.addEventListener('click', () => {
    addProduct(p);
    closeModal('productModal');
    openCart();
  });

  openModal('productModal');
}

/* ------------------------------------------------------------------ close */
export function bindModalClose() {
  $$('[data-close-modal]').forEach((el) =>
    el.addEventListener('click', () => closeModal('productModal'))
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal('productModal');
  });
}
