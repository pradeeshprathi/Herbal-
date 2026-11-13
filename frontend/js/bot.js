/* Live preview of the WhatsApp conversation, powered by /api/whatsapp/simulate. */

import { api, clock } from './api.js';
import { $, toast } from './ui.js';
import { openModal } from './modals.js';

let started = false;

export function initBot(catalog) {
  const openBtn = $('#openBot');
  const form = $('#botForm');
  const input = $('#botText');
  const log = $('#botLog');
  const phoneInput = $('#botPhone');
  const note = $('#botNote');

  if (note) {
    note.textContent = catalog?.brand?.whatsapp_live
      ? 'Live mode connected — these replies are really delivered on WhatsApp.'
      : 'Demo mode: replies are stored in the outbox. Add your WhatsApp Cloud API keys to .env to deliver them for real.';
  }

  function atBottom() {
    if (log) log.scrollTop = log.scrollHeight;
  }

  function push(text, mine = false) {
    if (!log) return;
    const el = document.createElement('div');
    el.className = `msg ${mine ? 'msg--user' : 'msg--bot'}`;
    el.textContent = text;
    const time = document.createElement('span');
    time.className = 'msg--time';
    time.textContent = clock(new Date().toISOString());
    el.appendChild(time);
    log.appendChild(el);
    atBottom();
  }

  function typing(on) {
    if (!log) return;
    const existing = log.querySelector('[data-typing]');
    if (on) {
      if (existing) return;
      const el = document.createElement('div');
      el.className = 'msg msg--bot';
      el.dataset.typing = '1';
      el.textContent = 'typing…';
      log.appendChild(el);
      atBottom();
    } else if (existing) {
      existing.remove();
    }
  }

  async function send(text) {
    const clean = String(text || '').trim();
    if (!clean) return;
    const phone = (phoneInput?.value || '919876543210').replace(/[^\d]/g, '');
    push(clean, true);
    typing(true);
    try {
      const res = await api.simulate(phone, clean);
      await new Promise((r) => setTimeout(r, 420));
      typing(false);
      (res.replies || []).forEach((reply) => push(reply));
    } catch (err) {
      typing(false);
      push(`⚠️ ${err.message || 'The bot is not reachable. Is the server running?'}`);
    }
  }

  openBtn?.addEventListener('click', async () => {
    openModal('botModal');
    if (!started) {
      started = true;
      const phone = (phoneInput?.value || '919876543210').replace(/[^\d]/g, '');
      try {
        const res = await api.simulate(phone, 'hi');
        (res.replies || []).forEach((reply) => push(reply));
      } catch {
        push('Greet the bot with "hi" and see what happens. (Start the server with python run.py first.)');
      }
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input?.value || '';
    if (input) input.value = '';
    send(value);
  });

  // quick suggestion chips
  const quick = document.createElement('div');
  quick.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:6px';
  ['1', '1,3', 'DONE', 'CUSTOM'].forEach((label) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'size';
    b.style.fontSize = '0.7rem';
    b.style.padding = '6px 12px';
    b.textContent = label;
    b.addEventListener('click', () => send(label));
    quick.appendChild(b);
  });
  const info = document.querySelector('.bot__info');
  if (info) info.appendChild(quick);

  document.querySelectorAll('[data-close-bot]').forEach((el) =>
    el.addEventListener('click', () => document.getElementById('botModal')?.classList.remove('is-open'))
  );
}
