window.MF = window.MF || {};

window.MF.Router = (() => {
  const routes = {};
  const pageTitles = {
    dashboard:   'Dashboard',
    commitments: 'Commitments',
    expenses:    'Expenses',
    receipts:    'Receipts',
    reports:     'Reports',
    debt:        'Debt Tracker',
    budget:      'Budget Planner'
  };

  function register(page, handler) {
    routes[page] = handler;
  }

  function navigate(page) {
    if (!routes[page]) page = 'dashboard';
    const store = window.MF.Store;

    store.set('currentPage', page);

    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    const title = pageTitles[page] || page;
    document.getElementById('page-title').textContent = title;
    document.title = `${title} — MyFinance`;

    const container = document.getElementById('page-container');
    container.innerHTML = '';

    if (routes[page]) routes[page](container);

    container.scrollTop = 0;

    if (window.MF.FAB) window.MF.FAB.update(page);
  }

  function init() {
    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

  function handleHash() {
    const hash = location.hash.replace('#', '') || 'dashboard';
    navigate(hash);
  }

  function go(page) {
    location.hash = page;
  }

  return { register, navigate, init, go };
})();
