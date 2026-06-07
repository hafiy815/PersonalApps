window.MF = window.MF || {};

window.MF.Modal = (() => {
  const container = () => document.getElementById('modal-container');
  let _stack = [];

  function open({ id: presetId, title, body, footer, size = '', onClose } = {}) {
    const id = presetId || `modal-${Date.now()}`;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.addEventListener('click', () => close(id));

    const modal = document.createElement('div');
    modal.className = `modal ${size}`;
    modal.id = id;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', title || 'Dialog');
    modal.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${title || ''}</h2>
        <button class="modal-close" aria-label="Close dialog" data-modal-close="${id}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="modal-body">${typeof body === 'string' ? body : ''}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}`;

    if (typeof body === 'function') body(modal.querySelector('.modal-body'));

    container().appendChild(backdrop);
    container().appendChild(modal);
    _stack.push({ id, modal, backdrop, onClose });

    modal.querySelector('[data-modal-close]')?.addEventListener('click', () => close(id));
    document.addEventListener('keydown', onKeyDown);

    const firstInput = modal.querySelector('input, select, textarea, button');
    setTimeout(() => firstInput?.focus(), 50);

    return { id, modal, close: () => close(id) };
  }

  function close(id) {
    const idx = _stack.findIndex(s => s.id === id);
    if (idx === -1) return;
    const { modal, backdrop, onClose } = _stack[idx];
    _stack.splice(idx, 1);

    modal.classList.add('removing');
    backdrop.style.animation = 'backdropIn 200ms ease reverse forwards';
    modal.addEventListener('animationend', () => {
      modal.remove();
      backdrop.remove();
    }, { once: true });
    setTimeout(() => { modal.remove(); backdrop.remove(); }, 250);

    if (_stack.length === 0) document.removeEventListener('keydown', onKeyDown);
    onClose?.();

    // Reset iOS Safari viewport zoom after keyboard dismissal
    _resetZoom();
  }

  function _resetZoom() {
    const vp = document.querySelector('meta[name="viewport"]');
    if (!vp) return;
    const orig = vp.getAttribute('content');
    vp.setAttribute('content', orig + ', maximum-scale=1');
    setTimeout(() => vp.setAttribute('content', orig), 300);
  }

  function closeAll() {
    [..._stack].forEach(s => close(s.id));
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && _stack.length) {
      close(_stack[_stack.length - 1].id);
    }
  }

  function confirm({ title = 'Confirm', message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
    return new Promise(resolve => {
      let _resolved = false;
      const done = (val) => { if (!_resolved) { _resolved = true; resolve(val); } };

      const { id, modal } = open({
        title: '',
        body: `
          <div class="confirm-icon ${danger ? 'danger' : ''}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              ${danger
                ? '<path d="M12 9v4M12 16.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
                : '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 8v5M12 14.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}
            </svg>
          </div>
          <div class="confirm-title">${title}</div>
          <div class="confirm-message">${message || ''}</div>`,
        footer: `
          <button class="btn btn-secondary" data-action="cancel">${cancelText}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${confirmText}</button>`,
        onClose: () => done(false)
      });

      modal.querySelector('[data-action="cancel"]')?.addEventListener('click', () => { close(id); done(false); });
      modal.querySelector('[data-action="confirm"]')?.addEventListener('click', () => { done(true); close(id); });
    });
  }

  return { open, close, closeAll, confirm };
})();
