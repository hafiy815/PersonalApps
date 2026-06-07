window.MF = window.MF || {};

window.MF.FAB = (() => {
  const PAGE_ACTIONS = {
    dashboard:   { label: 'Add Expense',     icon: 'plus', action: () => window.MF.Router.go('expenses') },
    commitments: { label: 'Add Commitment',  icon: 'plus', action: () => window.MF.Pages?.commitments?.openForm?.() },
    expenses:    { label: 'Add Expense',     icon: 'plus', action: () => window.MF.Pages?.expenses?.openForm?.() },
    receipts:    { label: 'Upload Receipt',  icon: 'upload', action: () => window.MF.Pages?.receipts?.openUpload?.() },
    reports:     null,
    debt:        { label: 'Record Debt', icon: 'plus', action: () => window.MF.Pages?.debt?.openForm?.() }
  };

  const PLUS_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const UPLOAD_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  let _btn = null;

  function init() {
    const container = document.getElementById('fab-container');
    if (!container) return;
    _btn = document.createElement('button');
    _btn.className = 'fab';
    _btn.setAttribute('aria-label', 'Add');
    _btn.innerHTML = PLUS_ICON;
    _btn.addEventListener('click', handleClick);
    container.appendChild(_btn);
  }

  function handleClick() {
    const page = window.MF.Store.get('currentPage');
    const action = PAGE_ACTIONS[page];
    if (action?.action) action.action();
  }

  function update(page) {
    if (!_btn) return;
    const action = PAGE_ACTIONS[page];
    if (!action) {
      _btn.classList.add('hidden');
      return;
    }
    _btn.classList.remove('hidden');
    _btn.setAttribute('aria-label', action.label);
    _btn.innerHTML = action.icon === 'upload' ? UPLOAD_ICON : PLUS_ICON;

    // Commitments page: FAB bottom-right (action buttons are on left/center)
    // All other pages: FAB bottom-left (avoids right-side delete buttons)
    const container = document.getElementById('fab-container');
    if (container) {
      if (page === 'commitments') {
        container.style.left  = 'var(--space-5)';
        container.style.right = 'auto';
      } else {
        container.style.right = 'var(--space-5)';
        container.style.left  = 'auto';
      }
    }
  }

  return { init, update };
})();
