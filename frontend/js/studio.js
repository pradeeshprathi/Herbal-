/* The custom studio: base + herbs + size -> live 3D preview and price. */

import { api, money } from './api.js';
import { createSoap, SHAPES } from './soap.js';
import { $, $$, escapeHtml, toast } from './ui.js';
import { addCustom, openCart } from './cart.js';

const BASE_PRICE = 129;
const MAX_HERBS = 8;

export function initStudio(catalog) {
  const bases = catalog.bases;
  const herbs = catalog.ingredients;
  const sizes = catalog.customizer?.sizes || [{ label: '100 g', multiplier: 1 }];

  const state = {
    base: 'coconut',
    picked: [],
    size: sizes[0]?.label || '100 g',
    shape: 'round',
    name: '',
    quote: null,
    busy: false,
  };

  let timer = null;
  let preview = null;

  /* ---------------------------------------------------------------- setup */
  const baseWrap = $('#baseOptions');
  if (baseWrap) {
    baseWrap.innerHTML = bases
      .map(
        (b) => `
      <button class="base${b.slug === state.base ? ' is-active' : ''}" data-base="${b.slug}">
        <span class="base__dot" style="--from:${b.swatch_from};--to:${b.swatch_to}"></span>
        <span class="base__text">
          <strong>${escapeHtml(b.name)}</strong>
          <small>${escapeHtml(b.tag || '')}</small>
        </span>
        <span class="base__price">${b.price_add ? `+${money(b.price_add)}` : 'included'}</span>
      </button>`
      )
      .join('');

    baseWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-base]');
      if (!btn) return;
      state.base = btn.dataset.base;
      $$('.base', baseWrap).forEach((b) => b.classList.toggle('is-active', b === btn));
      refresh();
    });
  }

  const herbWrap = $('#herbOptions');
  if (herbWrap) {
    herbWrap.innerHTML = herbs
      .map(
        (h) => `
      <button class="herb" data-herb="${h.slug}" title="${escapeHtml(h.benefit)}">
        <i style="background:${h.color}"></i>${escapeHtml(h.name)}
        <b>+${money(h.price_add)}</b>
      </button>`
      )
      .join('');

    herbWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-herb]');
      if (!btn) return;
      const slug = btn.dataset.herb;
      const idx = state.picked.indexOf(slug);
      if (idx > -1) {
        state.picked.splice(idx, 1);
        btn.classList.remove('is-active');
      } else {
        if (state.picked.length >= MAX_HERBS) {
          toast(`A bar can hold up to ${MAX_HERBS} herbs`, 'error');
          return;
        }
        state.picked.push(slug);
        btn.classList.add('is-active');
      }
      refresh();
    });
  }

  const sizeWrap = $('#sizeOptions');
  if (sizeWrap) {
    sizeWrap.innerHTML = sizes
      .map(
        (s) =>
          `<button class="size${s.label === state.size ? ' is-active' : ''}" data-size="${escapeHtml(s.label)}">${escapeHtml(s.label)}</button>`
      )
      .join('');
    sizeWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-size]');
      if (!btn) return;
      state.size = btn.dataset.size;
      $$('.size', sizeWrap).forEach((b) => b.classList.toggle('is-active', b === btn));
      refresh();
    });
  }

  const shapeWrap = $('#shapeOptions');
  if (shapeWrap) {
    const shapeList = catalog.customizer?.shapes?.length
      ? catalog.customizer.shapes
      : Object.entries(SHAPES).map(([slug, cfg]) => ({ slug, label: cfg.label || slug }));

    shapeWrap.innerHTML = shapeList
      .map(
        (s) => `
      <button class="shape${s.slug === state.shape ? ' is-active' : ''}" data-shape="${s.slug}"
              title="${escapeHtml(s.label || s.slug)} mould">
        <i></i>${escapeHtml(s.label || s.slug)}
      </button>`
      )
      .join('');

    shapeWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-shape]');
      if (!btn) return;
      state.shape = btn.dataset.shape;
      $$('.shape', shapeWrap).forEach((b) => b.classList.toggle('is-active', b === btn));
      refresh();
    });
  }

  const nameInput = $('#studioName');
  nameInput?.addEventListener('input', () => {
    state.name = nameInput.value;
  });

  /* --------------------------------------------------------------- visual */
  const mount = $('#studioSoap');
  if (mount) {
    const baseRow = bases.find((b) => b.slug === state.base) || bases[0];
    preview = createSoap({
      from: baseRow.swatch_from,
      to: baseRow.swatch_to,
      label: 'Your bar',
      shape: state.shape,
      idle: true,
    });
    mount.innerHTML = '';
    mount.appendChild(preview);
  }

  /* -------------------------------------------------------------- pricing */
  const multiplier = () =>
    sizes.find((s) => s.label === state.size)?.multiplier || 1;

  function estimate() {
    const baseRow = bases.find((b) => b.slug === state.base);
    const herbTotal = state.picked.reduce(
      (sum, slug) => sum + (herbs.find((h) => h.slug === slug)?.price_add || 0),
      0
    );
    const pre = BASE_PRICE + (baseRow?.price_add || 0) + herbTotal;
    return Math.round(pre * multiplier());
  }

  function paint() {
    const baseRow = bases.find((b) => b.slug === state.base) || bases[0];
    const pickedRows = state.picked
      .map((slug) => herbs.find((h) => h.slug === slug))
      .filter(Boolean);

    if (preview) {
      preview.update({
        from: state.quote?.palette?.from || baseRow.swatch_from,
        to: state.quote?.palette?.to || baseRow.swatch_to,
        label: state.quote?.name || 'Your bar',
        shape: state.shape,
        speckles: pickedRows.map((h) => h.color),
      });
    }

    const caption = $('#studioCaption');
    if (caption) {
      caption.textContent = pickedRows.length
        ? `${baseRow.name} · ${pickedRows.map((h) => h.name).slice(0, 3).join(' + ')}${
            pickedRows.length > 3 ? ` +${pickedRows.length - 3}` : ''
          }`
        : 'Pick a base and herbs — your bar appears here';
    }

    const meta = $('#studioMeta');
    if (meta) {
      meta.innerHTML = [
        `${pickedRows.length} herb${pickedRows.length === 1 ? '' : 's'}`,
        baseRow.name,
        `${SHAPES[state.shape]?.label || 'Round'} mould`,
        state.size,
        'cured 4 weeks',
      ]
        .map((t) => `<li>${escapeHtml(t)}</li>`)
        .join('');
    }

    const counter = $('#herbCounter');
    if (counter) counter.textContent = `${pickedRows.length} / ${MAX_HERBS}`;

    const breakdown = $('#studioBreakdown');
    if (breakdown) {
      breakdown.innerHTML = [
        `<li><span>Handmade base bar</span><span>${money(BASE_PRICE)}</span></li>`,
        ...pickedRows.map(
          (h) => `<li><span>${escapeHtml(h.name)}</span><span>+${money(h.price_add)}</span></li>`
        ),
        `<li><span>${escapeHtml(baseRow.name)}</span><span>+${money(baseRow.price_add)}</span></li>`,
        multiplier() !== 1
          ? `<li><span>Size ${escapeHtml(state.size)}</span><span>× ${multiplier()}</span></li>`
          : '',
      ]
        .filter(Boolean)
        .join('');
    }

    const price = $('#studioPrice');
    if (price) {
      const value = state.quote ? state.quote.unit_price : estimate();
      price.textContent = money(value);
      price.animate(
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.08)', opacity: 0.7 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        { duration: 260, easing: 'ease-out' }
      );
    }

    const addBtn = $('#studioAdd');
    if (addBtn) {
      addBtn.disabled = pickedRows.length === 0 || state.busy;
      const label = addBtn.querySelector('span');
      if (label) {
        label.textContent = state.busy
          ? 'Adding…'
          : pickedRows.length
            ? 'Add to basket'
            : 'Pick at least one herb';
      }
    }
  }

  function refresh() {
    state.quote = null;
    paint();
    clearTimeout(timer);
    if (!state.picked.length) return;
    timer = setTimeout(async () => {
      try {
        const res = await api.quote({
          base: state.base,
          ingredients: state.picked,
          size: state.size,
          shape: state.shape,
          qty: 1,
          name: state.name,
        });
        state.quote = res.quote;
        paint();
      } catch {
        /* keep the local estimate if the server is unreachable */
      }
    }, 260);
  }

  /* ------------------------------------------------------------------ add */
  $('#studioAdd')?.addEventListener('click', async () => {
    if (!state.picked.length || state.busy) return;
    state.busy = true;
    paint();
    try {
      const res = await api.quote({
        base: state.base,
        ingredients: state.picked,
        size: state.size,
        shape: state.shape,
        qty: 1,
        name: state.name,
      });
      addCustom(res.quote);
      openCart();
    } catch (err) {
      toast(err.message || 'Could not add your bar', 'error');
    } finally {
      state.busy = false;
      paint();
    }
  });

  refresh();
}
