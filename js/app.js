(() => {
  const { DB, Router, Store, Toast, FAB, Pages } = window.MF;

  async function init() {
    await DB.open();

    applyTheme(Store.get('theme'));

    Router.register('dashboard',   c => Pages.dashboard.render(c));
    Router.register('commitments', c => Pages.commitments.render(c));
    Router.register('expenses',    c => Pages.expenses.render(c));
    Router.register('receipts',    c => Pages.receipts.render(c));
    Router.register('reports',     c => Pages.reports.render(c));
    Router.register('debt',        c => Pages.debt.render(c));
    Router.register('budget',      c => Pages.budget.render(c));

    FAB.init();
    Router.init();
    setupThemeToggle();
    setupMobileNav();
    setupInstallPrompt();
    registerServiceWorker();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const light = document.querySelectorAll('#theme-icon-light, #header-theme-icon-light');
    const dark  = document.querySelectorAll('#theme-icon-dark,  #header-theme-icon-dark');
    const label = document.getElementById('theme-label');
    if (theme === 'dark') {
      light.forEach(el => el.classList.add('hidden'));
      dark.forEach(el  => el.classList.remove('hidden'));
      if (label) label.textContent = 'Light Mode';
    } else {
      light.forEach(el => el.classList.remove('hidden'));
      dark.forEach(el  => el.classList.add('hidden'));
      if (label) label.textContent = 'Dark Mode';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0f172a' : '#ffffff';
  }

  function toggleTheme() {
    const next = Store.get('theme') === 'dark' ? 'light' : 'dark';
    Store.set('theme', next);
    localStorage.setItem('mf_theme', next);
    applyTheme(next);
    const page = Store.get('currentPage');
    if (['dashboard','expenses','reports'].includes(page)) {
      Router.navigate(page);
    }
  }

  function setupThemeToggle() {
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    document.getElementById('header-theme-toggle')?.addEventListener('click', toggleTheme);
  }

  function setupMobileNav() {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    const menuBtn  = document.getElementById('mobile-menu-btn');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    menuBtn?.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      overlay.classList.remove('hidden');
    });

    overlay?.addEventListener('click', closeSidebar);

    function closeSidebar() {
      sidebar.classList.remove('mobile-open');
      overlay.classList.add('hidden');
    }

    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeSidebar();
      });
    });

    sidebarToggle?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  let _deferredPrompt = null;
  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      _deferredPrompt = e;
      document.getElementById('install-btn-container')?.classList.remove('hidden');
    });

    document.getElementById('install-btn')?.addEventListener('click', async () => {
      if (!_deferredPrompt) return;
      _deferredPrompt.prompt();
      const { outcome } = await _deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        document.getElementById('install-btn-container')?.classList.add('hidden');
        Toast.success('MyFinance installed!');
      }
      _deferredPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
      document.getElementById('install-btn-container')?.classList.add('hidden');
      _deferredPrompt = null;
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').then(reg => {
        // Force iOS PWA to check for a new SW on every page load
        reg.update();

        // If a new SW is already waiting (e.g. was installed while app was open), activate it now
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              sw.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch(err => console.warn('SW registration failed:', err));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
