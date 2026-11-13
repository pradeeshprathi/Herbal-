/* Thin API client for the BUDDY herbal FastAPI backend. */

const BASE = '';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

export const api = {
  catalog: () => request('/api/catalog'),
  products: () => request('/api/products'),
  product: (slug) => request(`/api/products/${slug}`),
  quote: (payload) =>
    request('/api/customize/quote', { method: 'POST', body: JSON.stringify(payload) }),
  order: (payload) =>
    request('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  track: (code) => request(`/api/orders/${encodeURIComponent(code)}`),
  simulate: (phone, text) =>
    request('/api/whatsapp/simulate', {
      method: 'POST',
      body: JSON.stringify({ phone, text }),
    }),
  outbox: () => request('/api/whatsapp/outbox'),
  health: () => request('/api/health'),
};

export const money = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export const WHATSAPP = '918903247497';

export function waLink(text) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}

/* ---------- tiny local storage helpers ---------- */
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable */
  }
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso);
  const diff = Math.max(0, (Date.now() - then.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function clock(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
