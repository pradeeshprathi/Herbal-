/* Live 3D product visuals.
 *
 *   createSoap({ shape: 'leaf' | 'rose' | 'hex' | 'square' | 'oval' | 'round' | 'flower' })
 *   createPack({ kind: 'powder' | 'pack' })  → a jar of powder, not a soap
 *
 * Both are draggable: drag spins them with inertia.
 */

const LAYERS = 8;
const STEP = 2.4; // px per slice, so the bar has visible thickness

/* --------------------------------------------------------------- utilities */
function shade(hex, amount) {
  const h = (hex || '#888888').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  r = Math.round(r + (amount < 0 ? r * amount : (255 - r) * amount));
  g = Math.round(g + (amount < 0 ? g * amount : (255 - g) * amount));
  b = Math.round(b + (amount < 0 ? b * amount : (255 - b) * amount));
  return `rgb(${r},${g},${b})`;
}

function hexAlpha(hex, alpha) {
  const h = (hex || '#888888').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

function speckleLayout(count, seed = 1) {
  const spots = [];
  let s = Math.floor(seed * 9301 + 49297);
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < count; i += 1) {
    const angle = rnd() * Math.PI * 2;
    const radius = 8 + rnd() * 66;
    spots.push({
      left: 50 + Math.cos(angle) * radius * 0.62,
      top: 50 + Math.sin(angle) * radius * 0.56,
      size: 2 + rnd() * 6,
      delay: rnd() * 2,
    });
  }
  return spots;
}

/* Shape moulds. The three simple moulds are smooth by geometry (border-radius);
   the leaf, honeycomb, flower and rose use the hand-drawn vector silhouettes in
   index.html, so their edges are real curves — never a flat polygon. */
export const SHAPES = {
  round: { radius: '50%', label: 'Round' },
  oval: { radius: '50%', insetY: '9%', label: 'Oval' },
  square: { radius: '24%', label: 'Square' },
  leaf: { clip: 'url(#bh-leaf)', label: 'Leaf' },
  hex: { clip: 'url(#bh-hex)', label: 'Hexagon' },
  flower: { clip: 'url(#bh-flower)', label: 'Flower' },
  rose: { clip: 'url(#bh-rose)', label: 'Rose' },
};

/* Apply a mould to any soap element (or re-apply it when the customer changes it). */
export function applyShape(root, shape) {
  const key = SHAPES[shape] ? shape : 'round';
  const cfg = SHAPES[key];
  root.dataset.shape = key;
  root.style.setProperty('--shape-radius', cfg.radius || '50%');
  root.style.setProperty('--shape-clip', cfg.clip || 'none');
  root.style.setProperty('--shape-inset-y', cfg.insetY || '0%');
  return key;
}

/* ------------------------------------------------------------ drag support */
function makeDraggable(root, { onMove, interactive, maxTilt = 72 }) {
  let rx = -10;
  let ry = 16;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = 0;
  let velX = 0;
  let velY = 0;
  let raf = null;

  const apply = () => onMove(rx, ry);
  apply();

  const momentum = () => {
    velX *= 0.94;
    velY *= 0.94;
    ry += velX;
    rx -= velY;
    rx = Math.max(-maxTilt, Math.min(maxTilt, rx));
    apply();
    if (Math.abs(velX) > 0.04 || Math.abs(velY) > 0.04) raf = requestAnimationFrame(momentum);
    else raf = null;
  };

  root.setPose = (nextRx, nextRy) => {
    rx = nextRx;
    ry = nextRy;
    apply();
  };

  if (!interactive) return root;

  root.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    velX = 0;
    velY = 0;
    root.classList.add('is-dragging');
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    try {
      root.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  });

  root.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    ry += dx * 0.55;
    rx -= dy * 0.4;
    rx = Math.max(-maxTilt, Math.min(maxTilt, rx));
    velX = dx * 0.22;
    velY = dy * 0.18;
    apply();
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-dragging');
    root.dataset.dragged = moved > 6 ? '1' : '0';
    try {
      root.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (moved > 2) raf = requestAnimationFrame(momentum);
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('pointerleave', (e) => {
    if (dragging) end(e);
  });

  root.addEventListener('click', (e) => {
    if (root.dataset.dragged === '1') {
      e.stopPropagation();
      e.preventDefault();
      root.dataset.dragged = '0';
    }
  });

  return root;
}

/* ------------------------------------------------------------------- soap */
export function createSoap(opts = {}) {
  const {
    from = '#2F6B3F',
    to = '#9CCB74',
    label = 'BUDDY',
    size = null,
    speckles = [],
    shape = 'round',
    interactive = true,
    idle = false,
  } = opts;

  const root = document.createElement('div');
  root.className = 'soap3d' + (idle ? ' soap3d--idle' : '');
  if (size) root.style.setProperty('--soap-size', `${size}px`);
  root.style.setProperty('--soap-from', from);
  root.style.setProperty('--soap-to', to);
  root.style.setProperty('--soap-edge', shade(to, -0.32));
  root.style.setProperty('--glow', hexAlpha(to, 0.45));
  applyShape(root, shape);

  const inner = document.createElement('div');
  inner.className = 'soap3d__inner';

  for (let i = LAYERS; i >= 1; i -= 1) {
    const slice = document.createElement('div');
    slice.className = 'soap3d__layer';
    slice.style.transform = `translateZ(${-i * STEP}px)`;
    slice.style.background = shade(to, -0.22 - i * 0.015);
    inner.appendChild(slice);
  }

  const back = document.createElement('div');
  back.className = 'soap3d__face soap3d__face--back';
  back.style.transform = `rotateY(180deg) translateZ(${LAYERS * STEP - 1}px)`;
  back.style.background = `linear-gradient(150deg, ${shade(from, -0.1)}, ${shade(to, -0.28)})`;
  inner.appendChild(back);

  const face = document.createElement('div');
  face.className = 'soap3d__face';

  const specks = document.createElement('div');
  specks.className = 'soap3d__speckles';
  const colors = speckles.length ? speckles : [shade(from, 0.18), shade(to, -0.18)];
  speckleLayout(16, label.length + 3).forEach((spot, i) => {
    const dot = document.createElement('i');
    dot.style.left = `${spot.left}%`;
    dot.style.top = `${spot.top}%`;
    dot.style.width = `${spot.size}px`;
    dot.style.height = `${spot.size}px`;
    dot.style.background = colors[i % colors.length];
    dot.style.animation = `markPulse ${4 + spot.delay}s ease-in-out ${spot.delay}s infinite`;
    specks.appendChild(dot);
  });
  face.appendChild(specks);

  const emboss = document.createElement('div');
  emboss.className = 'soap3d__emboss';
  const monogram = document.createElement('span');
  monogram.className = 'soap3d__monogram';
  monogram.textContent = 'B';
  const name = document.createElement('span');
  name.className = 'soap3d__name';
  name.textContent = label;
  emboss.append(monogram, name);
  face.appendChild(emboss);

  const rim = document.createElement('div');
  rim.className = 'soap3d__rim';
  face.appendChild(rim);

  const shine = document.createElement('div');
  shine.className = 'soap3d__shine';
  face.appendChild(shine);

  inner.appendChild(face);
  root.appendChild(inner);

  const shadow = document.createElement('div');
  shadow.className = 'soap3d__shadow';
  root.appendChild(shadow);

  makeDraggable(root, {
    interactive,
    onMove: (rx, ry) => {
      root.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      root.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      const level = 0.18 + Math.abs(Math.sin((ry * Math.PI) / 180)) * 0.55;
      root.style.setProperty('--shine', level.toFixed(2));
    },
  });

  root.update = (next = {}) => {
    if (next.from) root.style.setProperty('--soap-from', next.from);
    if (next.to) {
      root.style.setProperty('--soap-to', next.to);
      root.style.setProperty('--soap-edge', shade(next.to, -0.32));
      root.style.setProperty('--glow', hexAlpha(next.to, 0.45));
    }
    if (next.label && name.textContent !== next.label) name.textContent = next.label;
    if (next.shape) applyShape(root, next.shape);
    if (next.speckles) {
      specks.innerHTML = '';
      speckleLayout(16, (next.label || label).length + Math.random() * 8).forEach((spot, i) => {
        const dot = document.createElement('i');
        dot.style.left = `${spot.left}%`;
        dot.style.top = `${spot.top}%`;
        dot.style.width = `${spot.size}px`;
        dot.style.height = `${spot.size}px`;
        dot.style.background = next.speckles[i % next.speckles.length];
        specks.appendChild(dot);
      });
    }
  };

  return root;
}

/* -------------------------------------------------------------- powder jar */
export function createPack(opts = {}) {
  const {
    from = '#8A6C38',
    to = '#DCC48A',
    label = 'HERBAL POWDER',
    sublabel = 'powder',
    speckles = [],
    kind = 'powder',
    size = null,
    interactive = true,
    idle = false,
  } = opts;

  const root = document.createElement('div');
  root.className = 'pack3d' + (idle ? ' pack3d--idle' : '');
  root.dataset.kind = kind;
  if (size) root.style.setProperty('--pack-w', `${size}px`);
  root.style.setProperty('--pack-from', shade(from, -0.12));
  root.style.setProperty('--pack-to', to);
  root.style.setProperty('--pack-lid', shade(from, -0.4));
  root.style.setProperty('--glow', hexAlpha(to, 0.4));

  const inner = document.createElement('div');
  inner.className = 'pack3d__inner';

  const jar = document.createElement('div');
  jar.className = 'pack3d__jar';

  // lid
  const lid = document.createElement('div');
  lid.className = 'pack3d__lid';
  lid.innerHTML = '<span></span>';
  jar.appendChild(lid);

  // neck of powder peeking out
  const neck = document.createElement('div');
  neck.className = 'pack3d__neck';
  speckleLayout(9, label.length + 7).forEach((spot, i) => {
    const dot = document.createElement('i');
    dot.style.left = `${spot.left}%`;
    dot.style.top = `${Math.min(88, Math.max(10, spot.top))}%`;
    dot.style.width = `${2 + spot.size / 2}px`;
    dot.style.height = `${2 + spot.size / 2}px`;
    dot.style.background = speckles.length ? speckles[i % speckles.length] : shade(to, -0.3);
    neck.appendChild(dot);
  });
  jar.appendChild(neck);

  const body = document.createElement('div');
  body.className = 'pack3d__body';

  const labelEl = document.createElement('div');
  labelEl.className = 'pack3d__label';
  labelEl.innerHTML = `
    <small>BUDDY herbal</small>
    <strong>${label}</strong>
    <em>${sublabel}</em>`;
  body.appendChild(labelEl);

  const shine = document.createElement('div');
  shine.className = 'pack3d__shine';
  body.appendChild(shine);

  jar.appendChild(body);
  inner.appendChild(jar);
  root.appendChild(inner);

  const shadow = document.createElement('div');
  shadow.className = 'pack3d__shadow';
  root.appendChild(shadow);

  makeDraggable(root, {
    interactive,
    maxTilt: 16,
    onMove: (rx, ry) => {
      // jars do not tumble, they turn: softened tilt, full spin
      root.style.setProperty('--rx', `${(rx * 0.28).toFixed(2)}deg`);
      root.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      const level = 0.2 + Math.abs(Math.sin((ry * Math.PI) / 180)) * 0.5;
      root.style.setProperty('--shine', level.toFixed(2));
    },
  });

  root.update = (next = {}) => {
    if (next.label) labelEl.querySelector('strong').textContent = next.label;
  };

  return root;
}

/* Pick the right visual for any catalogue product. */
export function createProductVisual(product, extra = {}) {
  const common = {
    from: product.colors.from,
    to: product.colors.to,
    label: extra.label || product.name.split(' ')[0],
    speckles: (product.ingredients || []).map((i) => i.color),
    ...extra,
  };
  if (product.category === 'soap') {
    return createSoap({ ...common, shape: product.shape || 'round' });
  }
  return createPack({
    ...common,
    label: extra.packLabel || product.name.toUpperCase(),
    sublabel: product.category === 'pack' ? 'face pack' : 'powder',
    kind: product.category,
  });
}
