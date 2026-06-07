window.MF = window.MF || {};

window.MF.Toast = (() => {
  const container = () => document.getElementById('toast-container');

  const ICONS = {
    success: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    error:   `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M13 7l-6 6M7 7l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M9.13 3.6L2.16 15.5A1 1 0 003.03 17h13.94a1 1 0 00.87-1.5L10.87 3.6a1 1 0 00-1.74 0z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 8v4M10 13.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    info:    `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v5M10 7v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
  };

  function show(message, type = 'info', title = '', duration = 4000) {
    const id = `toast-${Date.now()}`;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.id = id;
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close" onclick="window.MF.Toast.dismiss('${id}')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 3L3 11M3 3l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>`;
    container().appendChild(el);

    let timer = duration > 0 ? setTimeout(() => dismiss(id), duration) : null;
    el.addEventListener('mouseenter', () => { if (timer) clearTimeout(timer); });
    el.addEventListener('mouseleave', () => { if (duration > 0) timer = setTimeout(() => dismiss(id), 1500); });
  }

  function dismiss(id) {
    const el = document.getElementById(id);
    if (!el || el.classList.contains('removing')) return;
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => { if (el.parentNode) el.remove(); }, 300);
  }

  const success = (msg, title) => show(msg, 'success', title || 'Success');
  const error   = (msg, title) => show(msg, 'error',   title || 'Error');
  const warning = (msg, title) => show(msg, 'warning', title || 'Warning');
  const info    = (msg, title) => show(msg, 'info',    title);

  return { show, dismiss, success, error, warning, info };
})();
