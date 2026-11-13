/* Boots the storefront. */

import { api } from './api.js';
import {
  initPreloader,
  initScrollChrome,
  initCursor,
  initNav,
  initButtons,
  initReveal,
  initCounters,
  initParallax,
  initMarquee,
  initFlipCards,
  initLeaves,
  $,
} from './ui.js';
import { initCart, openCart } from './cart.js';
import { initCatalog, bindModalClose } from './catalog.js';
import { initStudio } from './studio.js';
import { initBot } from './bot.js';
import { closeAllModals, closeModal } from './modals.js';

function showOffline() {
  const grid = $('#productGrid');
  if (grid) {
    grid.innerHTML = `
      <div class="track-empty" style="grid-column:1/-1;background:var(--paper);border-radius:22px;border:1px solid var(--line);padding:50px 24px">
        <strong>The herb shelf is still loading</strong>
        <p style="max-width:460px;margin:8px auto 18px;font-size:.9rem;color:rgba(20,38,28,.65)">
          The catalogue is served by the BUDDY herbal API. Start it in your project folder with
          <code style="background:rgba(20,38,28,.07);padding:2px 7px;border-radius:6px">python run.py</code>
          and refresh this page.
        </p>
        <button class="btn btn--dark" onclick="location.reload()"><span>Try again</span></button>
      </div>`;
  }
}

async function boot() {
  initPreloader();
  initScrollChrome();
  initCursor();
  initNav();
  initButtons();
  initParallax();
  initMarquee();
  initFlipCards();
  initReveal();
  initCounters();
  initCart();
  initLeaves($('#leaves'));

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // modal plumbing that is always available
  bindModalClose();
  document.querySelectorAll('[data-close-bot]').forEach((el) =>
    el.addEventListener('click', () => closeModal('botModal'))
  );
  document.querySelectorAll('[data-close-checkout]').forEach((el) =>
    el.addEventListener('click', () => closeModal('checkoutModal'))
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  // open the basket when the page is reached from the tracking page
  document.querySelectorAll('[data-open-cart]').forEach((el) =>
    el.addEventListener('click', openCart)
  );

  try {
    const catalog = await api.catalog();
    initCatalog(catalog);
    initStudio(catalog);
    initBot(catalog);
    window.BUDDY = { catalog };
  } catch (err) {
    console.warn('catalogue unavailable', err);
    showOffline();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
