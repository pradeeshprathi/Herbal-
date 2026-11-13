/* Shared interface behaviour: preloader, reveal, cursor, tilt, ripples,
   counters, leaf particles, toasts and small DOM helpers. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = window.matchMedia('(hover: none)').matches;

/* ------------------------------------------------------------------ toasts */
export function toast(message, type = 'ok') {
  const wrap = $('#toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' toast--error' : '');
  el.innerHTML = `<i></i><span>${escapeHtml(message)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 450);
  }, 3200);
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* --------------------------------------------------------------- preloader */
export function initPreloader() {
  const pre = $('#preloader');
  const bar = $('#preloaderBar');
  if (!pre) return;
  let progress = 0;
  const tick = setInterval(() => {
    progress = Math.min(94, progress + Math.random() * 16);
    if (bar) bar.style.width = `${progress}%`;
  }, 160);

  const finish = () => {
    clearInterval(tick);
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      pre.classList.add('is-done');
      document.body.classList.add('is-ready');
    }, 260);
  };

  if (document.readyState === 'complete') setTimeout(finish, 260);
  else window.addEventListener('load', () => setTimeout(finish, 320));
  // never trap the visitor behind the loader
  setTimeout(finish, 4200);
}

/* ------------------------------------------------------------ scroll things */
export function initScrollChrome() {
  const bar = $('#scrollProgress');
  const nav = $('#nav');
  const onScroll = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (bar) bar.style.width = `${pct}%`;
    if (nav) nav.classList.toggle('is-stuck', h.scrollTop > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

export function initReveal() {
  const items = $$('[data-reveal]');
  if (!items.length) return;
  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const siblings = Array.from(entry.target.parentElement?.children || []);
          const index = siblings.indexOf(entry.target);
          entry.target.style.setProperty('--d', `${Math.min(index, 6) * 70}ms`);
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px' }
  );
  items.forEach((el) => io.observe(el));
}

/* counts numbers up when they scroll into view */
export function initCounters() {
  const nodes = $$('[data-count]');
  if (!nodes.length) return;
  const run = (el) => {
    const target = Number(el.dataset.count || 0);
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = String(target);
    };
    requestAnimationFrame(step);
  };
  if (reducedMotion || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          run(e.target);
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  nodes.forEach((n) => io.observe(n));
}

/* ------------------------------------------------------------ cursor + nav */
export function initCursor() {
  if (touch || reducedMotion) return;
  const glow = $('#cursorGlow');
  if (!glow) return;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let tx = x;
  let ty = y;
  document.body.classList.add('has-pointer');
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
  });
  const loop = () => {
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
}

export function initNav() {
  const burger = $('#burger');
  const links = $('#navLinks');
  if (!burger || !links) return;
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      links.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
}

/* -------------------------------------------------- magnetic buttons/ripple */
export function initButtons() {
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn || reducedMotion) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.width = span.style.height = `${size}px`;
    span.style.left = `${e.clientX - rect.left - size / 2}px`;
    span.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(span);
    setTimeout(() => span.remove(), 700);
  });

  if (touch || reducedMotion) return;
  $$('.btn--magnetic').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width;
      const dy = (e.clientY - r.top - r.height / 2) / r.height;
      btn.style.transform = `translate(${dx * 10}px, ${dy * 8}px) scale(1.02)`;
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = '';
    });
  });
}

/* --------------------------------------------------------------- card tilt */
export function attachTilt(el, strength = 7) {
  if (touch || reducedMotion) return;
  let raf = null;
  let targetX = 0;
  let targetY = 0;
  let curX = 0;
  let curY = 0;

  const loop = () => {
    curX += (targetX - curX) * 0.14;
    curY += (targetY - curY) * 0.14;
    el.style.transform = `perspective(900px) rotateX(${curX.toFixed(2)}deg) rotateY(${curY.toFixed(2)}deg) translateY(${Math.abs(curX) > 0.4 ? -6 : 0}px)`;
    if (Math.abs(curX - targetX) > 0.02 || Math.abs(curY - targetY) > 0.02) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = null;
    }
  };

  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    targetY = ((e.clientX - r.left) / r.width - 0.5) * strength * 2;
    targetX = -((e.clientY - r.top) / r.height - 0.5) * strength * 2;
    if (!raf) raf = requestAnimationFrame(loop);
  });
  el.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
    if (!raf) raf = requestAnimationFrame(loop);
  });
}

/* ------------------------------------------------------------ leaf canvas */
export function initLeaves(canvas) {
  if (!canvas || reducedMotion) return;
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  const palette = ['#3F7A46', '#7BA05B', '#C9A24B', '#A8C686', '#B0446A'];

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const count = w < 700 ? 14 : 26;
  const leaves = Array.from({ length: count }, () => spawn(true));
  const pointer = { x: 0.5, y: 0.5 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX / window.innerWidth;
    pointer.y = e.clientY / window.innerHeight;
  });

  function spawn(initial) {
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 40,
      size: 7 + Math.random() * 15,
      speed: 0.18 + Math.random() * 0.55,
      drift: (Math.random() - 0.5) * 0.5,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.012,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 0.16 + Math.random() * 0.34,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function drawLeaf(l) {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.rot);
    ctx.globalAlpha = l.alpha;
    ctx.fillStyle = l.color;
    const s = l.size;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.85, -s * 0.4, s * 0.6, s * 0.55, 0, s);
    ctx.bezierCurveTo(-s * 0.6, s * 0.55, -s * 0.85, -s * 0.4, 0, -s);
    ctx.fill();
    ctx.globalAlpha = l.alpha * 0.7;
    ctx.strokeStyle = 'rgba(253,250,242,0.55)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.8);
    ctx.lineTo(0, s * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  const frame = () => {
    ctx.clearRect(0, 0, w, h);
    leaves.forEach((l, i) => {
      l.phase += 0.01;
      l.y -= l.speed;
      l.x += l.drift + Math.sin(l.phase) * 0.35;
      l.rot += l.spin;
      l.x += (pointer.x - 0.5) * 0.35;
      if (l.y < -60 || l.x < -80 || l.x > w + 80) leaves[i] = spawn(false);
      drawLeaf(l);
    });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------- hero parallax */
export function initParallax() {
  if (touch || reducedMotion) return;
  const blobs = $$('.hero__glow');
  const stage = $('#heroStage');
  window.addEventListener('pointermove', (e) => {
    const dx = e.clientX / window.innerWidth - 0.5;
    const dy = e.clientY / window.innerHeight - 0.5;
    blobs.forEach((b, i) => {
      const depth = 20 + i * 14;
      b.style.transform = `translate3d(${dx * depth}px, ${dy * depth}px, 0)`;
    });
    if (stage) stage.style.transform = `translate3d(${dx * -14}px, ${dy * -12}px, 0)`;
  });
}

/* --------------------------------------------------------------- marquee loop */
export function initMarquee() {
  $$('.marquee__track').forEach((track) => {
    track.innerHTML += track.innerHTML;
  });
  const inner = $('.promise__inner');
  if (inner) inner.querySelectorAll('[data-reveal]').forEach((el, i) => {
    el.style.setProperty('--d', `${i * 80}ms`);
  });
}

/* ---------------------------------------------------------------- flip cards */
export function initFlipCards() {
  if (!touch) return;
  document.addEventListener('click', (e) => {
    const flip = e.target.closest('.flip');
    if (!flip) return;
    flip.classList.toggle('is-flipped');
  });
}

export function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}
