window.MF = window.MF || {};
window.MF.Pages = window.MF.Pages || {};

window.MF.Pages.dashboard = (() => {
  const { DB, utils, Store } = window.MF;
  let _chart1 = null, _chart2 = null;

  function render(container) {
    container.innerHTML = `
      <div class="page" id="dashboard-page">
        <div class="section-header mb-6">
          <div>
            <div class="text-xs text-secondary font-medium" style="text-transform:uppercase;letter-spacing:.06em">Overview</div>
            <h2 class="section-title" style="margin-top:4px">Good ${getGreeting()}</h2>
          </div>
          <div id="dash-period" class="text-sm text-secondary">${utils.formatDate(utils.todayISO(), 'long')}</div>
        </div>

        <div class="grid-4 mb-6" id="stat-cards">
          ${skeletonStatCards()}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4);" class="chart-row">
          <div class="card card-lg">
            <div class="card-header">
              <span class="card-title">Monthly Spending</span>
              <span class="text-xs text-secondary" id="trend-label">Last 6 months</span>
            </div>
            <div class="chart-wrapper" style="height:200px"><canvas id="trendChart"></canvas></div>
          </div>
          <div class="card card-lg">
            <div class="card-header">
              <span class="card-title">By Category</span>
              <span class="text-xs text-secondary" id="cat-month">This month</span>
            </div>
            <div class="chart-wrapper" style="height:200px;display:flex;align-items:center;justify-content:center"><canvas id="catChart" style="max-height:200px;max-width:200px"></canvas></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);" class="bottom-row">
          <div class="card">
            <div class="section-header mb-4">
              <span class="card-title">Upcoming Bills</span>
              <button class="section-action" onclick="window.MF.Router.go('commitments')">View all</button>
            </div>
            <div id="upcoming-list"><div class="skeleton skeleton-line mb-2"></div><div class="skeleton skeleton-line mb-2"></div><div class="skeleton skeleton-line"></div></div>
          </div>
          <div class="card">
            <div class="section-header mb-4">
              <span class="card-title">Recent Expenses</span>
              <button class="section-action" onclick="window.MF.Router.go('expenses')">View all</button>
            </div>
            <div id="recent-list"><div class="skeleton skeleton-line mb-2"></div><div class="skeleton skeleton-line mb-2"></div><div class="skeleton skeleton-line"></div></div>
          </div>
        </div>
      </div>`;

    loadData(container);
    setupResponsiveGrid();
  }

  function setupResponsiveGrid() {
    const chartRow = document.querySelector('.chart-row');
    const bottomRow = document.querySelector('.bottom-row');
    if (window.innerWidth <= 768) {
      chartRow?.style.setProperty('grid-template-columns', '1fr');
      bottomRow?.style.setProperty('grid-template-columns', '1fr');
    }
  }

  async function loadData() {
    const [commitments, expenses] = await Promise.all([
      DB.getAll('commitments'),
      DB.getAll('expenses')
    ]);

    Store.set('commitments', commitments);
    Store.set('expenses', expenses);

    renderStatCards(commitments, expenses);
    renderTrendChart(expenses);
    renderCatChart(expenses);
    renderUpcoming(commitments);
    renderRecent(expenses);
  }

  function renderStatCards(commitments, expenses) {
    const total     = utils.sumAmount(commitments);
    const paid      = utils.sumAmount(commitments.filter(c => c.paid));
    const unpaid    = total - paid;
    const thisMonth = utils.monthISO(0);
    const monthlyExp = utils.sumAmount(expenses.filter(e => (e.date || '').startsWith(thisMonth)));
    const overdue   = commitments.filter(c => !c.paid && utils.isOverdue(c.dueDate)).length;

    document.getElementById('stat-cards').innerHTML = `
      ${statCard('Total Commitments', utils.formatCurrency(total), '#2563eb', 'bg-blue', billIcon(), overdue > 0 ? `${overdue} overdue` : `${commitments.length} items`, overdue > 0 ? 'down' : '')}
      ${statCard('Paid', utils.formatCurrency(paid), '#059669', 'bg-green', checkIcon(), `${commitments.filter(c=>c.paid).length} commitments`, '')}
      ${statCard('Outstanding', utils.formatCurrency(unpaid), '#dc2626', 'bg-red', alertIcon(), `${commitments.filter(c=>!c.paid).length} pending`, unpaid > 0 ? 'down' : '')}
      ${statCard('This Month Spent', utils.formatCurrency(monthlyExp), '#d97706', 'bg-amber', spendIcon(), utils.formatDate(thisMonth + '-01', 'mon'), '')}`;
  }

  function statCard(label, value, color, bg, icon, sub, dir) {
    return `
      <div class="stat-card">
        <div class="stat-icon" style="background:${color}22">${icon.replace('currentColor', color)}</div>
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
        <div class="stat-change ${dir}">${sub}</div>
      </div>`;
  }

  function renderTrendChart(expenses) {
    const months = utils.last6Months();
    const data   = months.map(m => utils.sumAmount(expenses.filter(e => (e.date || '').startsWith(m))));
    const labels = months.map(m => utils.formatDate(m + '-01', 'mon'));

    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    if (_chart1) { _chart1.destroy(); _chart1 = null; }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    _chart1 = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map((_, i) => i === data.length - 1 ? '#2563eb' : '#2563eb33'),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => utils.formatCurrency(ctx.raw) }
        }},
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
          y: { min: 0, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: v => utils.getCurrencySymbol() + v.toLocaleString() }, border: { display: false } }
        }
      }
    });
  }

  function renderCatChart(expenses) {
    const thisMonth = utils.monthISO(0);
    const monthExp  = expenses.filter(e => (e.date || '').startsWith(thisMonth));
    const grouped   = {};
    monthExp.forEach(e => {
      const cat = e.category || 'other';
      grouped[cat] = (grouped[cat] || 0) + (parseFloat(e.amount) || 0);
    });

    const canvas = document.getElementById('catChart');
    if (!canvas) return;
    if (_chart2) { _chart2.destroy(); _chart2 = null; }

    const entries = Object.entries(grouped).sort((a,b) => b[1]-a[1]).slice(0,6);
    if (!entries.length) {
      canvas.parentElement.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-2);color:var(--color-text-tertiary);padding:var(--space-8) 0"><svg viewBox="0 0 24 24" fill="none" width="36" height="36" style="opacity:.4"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span style="font-size:var(--text-xs)">No expenses this month</span></div>`;
      return;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    _chart2 = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: entries.map(([id]) => utils.getCategory(id).label),
        datasets: [{ data: entries.map(([,v]) => v), backgroundColor: entries.map(([id]) => utils.getCategory(id).color), borderWidth: 2, borderColor: isDark ? '#1e293b' : '#ffffff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, boxWidth: 10, padding: 12 } },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${utils.formatCurrency(ctx.raw)}` } }
        }
      }
    });
  }

  function renderUpcoming(commitments) {
    const upcoming = commitments.filter(c => !c.paid && utils.isDueSoon(c.dueDate, 14))
      .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5);

    const el = document.getElementById('upcoming-list');
    if (!el) return;
    if (!upcoming.length) {
      el.innerHTML = `<div class="empty-state" style="padding:var(--space-6)"><div class="text-sm text-secondary">No upcoming bills in 14 days</div></div>`;
      return;
    }
    el.innerHTML = `<div class="list">${upcoming.map(c => {
      const cat = utils.getCategory(c.category);
      const overdue = utils.isOverdue(c.dueDate);
      return `<div class="list-item" style="cursor:default">
        <div class="list-item-icon" style="background:${cat.color}22;font-size:18px">${cat.emoji}</div>
        <div class="list-item-content">
          <div class="list-item-title">${utils.escape(c.title)}</div>
          <div class="list-item-subtitle ${overdue ? 'text-error' : ''}">${overdue ? '⚠ Overdue — ' : ''}${utils.formatRelativeDate(c.dueDate)}</div>
        </div>
        <div class="list-item-right">
          <div class="list-item-amount">${utils.formatCurrency(c.amount)}</div>
          ${c.recurring ? '<span class="badge badge-info">Monthly</span>' : ''}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderRecent(expenses) {
    const recent = [...expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const el = document.getElementById('recent-list');
    if (!el) return;
    if (!recent.length) {
      el.innerHTML = `<div class="empty-state" style="padding:var(--space-6)"><div class="text-sm text-secondary">No expenses recorded yet</div></div>`;
      return;
    }
    el.innerHTML = `<div class="list">${recent.map(e => {
      const cat = utils.getCategory(e.category);
      return `<div class="list-item">
        <div class="list-item-icon" style="background:${cat.color}22;font-size:18px">${cat.emoji}</div>
        <div class="list-item-content">
          <div class="list-item-title">${utils.escape(e.description || cat.label)}</div>
          <div class="list-item-subtitle">${utils.formatDate(e.date, 'short')}</div>
        </div>
        <div class="list-item-right">
          <div class="list-item-amount text-error">-${utils.formatCurrency(e.amount)}</div>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  function skeletonStatCards() {
    return Array(4).fill(0).map(() => `<div class="stat-card"><div class="skeleton skeleton-line mb-2" style="width:36px;height:36px;border-radius:10px"></div><div class="skeleton skeleton-text mb-2" style="width:80px"></div><div class="skeleton skeleton-value mb-2"></div><div class="skeleton skeleton-text" style="width:60px"></div></div>`).join('');
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  }

  function billIcon() { return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 10h8M6 6h8M6 14h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.5"/></svg>`; }
  function checkIcon() { return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
  function alertIcon() { return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4M10 12v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`; }
  function spendIcon() { return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2v16M6 6h6a2 2 0 010 4H8a2 2 0 000 4h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }

  return { render };
})();
