/* Very small modal controller shared by the product, checkout and bot dialogs. */

let openStack = [];

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  if (!openStack.includes(id)) openStack.push(id);
  document.body.classList.add('is-locked');
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  openStack = openStack.filter((m) => m !== id);
  if (!openStack.length) document.body.classList.remove('is-locked');
}

export function closeAllModals() {
  [...openStack].forEach(closeModal);
  openStack = [];
  document.body.classList.remove('is-locked');
}
