window.MF = window.MF || {};
window.MF.Pages = window.MF.Pages || {};

window.MF.Pages.reports = (() => {
  const { DB, utils, Toast } = window.MF;
  let _commitments = [], _expenses = [], _receipts = [];
  let _tab = 'spending', _chart = null;

  function render(container) {
    container.innerHTML = `
      <div class="page">
        <div class="section-header mb-6">
          <div>
            <h2 class="section-title">Reports</h2>
            <p class="card-subtitle">Analyse your financial data</p>
          </div>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-secondary" onclick="window.MF.Pages.reports.exportCSV()">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 12l3 3 3-3M5 15V5M9 4h5M9 8h4M9 12h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              CSV
            </button>
            <button class="btn btn-secondary" onclick="window.MF.Pages.reports.exportJSON()">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h4v8H2M10 4h4v8h-4M6 8h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              JSON
            </button>
          </div>
        </div>

        <div class="tabs mb-6">
          <button class="tab-btn active" data-tab="spending" onclick="window.MF.Pages.reports.setTab('spending',this)">Spending Report</button>
          <button class="tab-btn" data-tab="commitments" onclick="window.MF.Pages.reports.setTab('commitments',this)">Commitments</button>
          <button class="tab-btn" data-tab="categories" onclick="window.MF.Pages.reports.setTab('categories',this)">By Category</button>
        </div>

        <div id="report-content"></div>
      </div>`;

    loadData();
  }

  async function loadData() {
    [_commitments, _expenses, _receipts] = await Promise.all([
      DB.getAll('commitments'),
      DB.getAll('expenses'),
      DB.getAll('receipts')
    ]);
    renderTab();
  }

  function setTab(tab, btn) {
    _tab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    if (_chart) { _chart.destroy(); _chart = null; }
    renderTab();
  }

  function renderTab() {
    if (_tab === 'spending')     renderSpending();
    if (_tab === 'commitments')  renderCommitments();
    if (_tab === 'categories')   renderCategories();
  }

  function renderSpending() {
    const months = utils.last6Months();
    const data   = months.map(m => ({
      month: m,
      expenses: utils.sumAmount(_expenses.filter(e => (e.date||'').startsWith(m))),
      commitments: utils.sumAmount(_commitments.filter(c => c.paid && (c.dueDate||'').startsWith(m)))
    }));

    const totalExp = utils.sumAmount(_expenses.filter(e => months.some(m => (e.date||'').startsWith(m))));
    const avgMonthly = totalExp / months.length;
    const thisMonth = utils.monthISO(0);
    const thisMonthExp = utils.sumAmount(_expenses.filter(e => (e.date||'').startsWith(thisMonth)));

    const el = document.getElementById('report-content');
    el.innerHTML = `
      <div class="grid-3 mb-6">
        <div class="stat-card"><div class="stat-label">6-Month Total</div><div class="stat-value mt-4">${utils.formatCurrency(totalExp)}</div></div>
        <div class="stat-card"><div class="stat-label">Monthly Average</div><div class="stat-value mt-4">${utils.formatCurrency(avgMonthly)}</div></div>
        <div class="stat-card"><div class="stat-label">This Month</div><div class="stat-value mt-4">${utils.formatCurrency(thisMonthExp)}</div></div>
      </div>
      <div class="card mb-6">
        <div class="card-header"><span class="card-title">Monthly Spending vs Paid Bills</span></div>
        <div style="height:260px"><canvas id="report-chart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Monthly Breakdown</span></div>
        <div id="monthly-table"></div>
      </div>`;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    _chart = new Chart(document.getElementById('report-chart'), {
      type: 'bar',
      data: {
        labels: months.map(m => utils.formatDate(m+'-01','mon')),
        datasets: [
          { label: 'Expenses', data: data.map(d=>d.expenses), backgroundColor: '#2563eb', borderRadius: 4, borderSkipped: false },
          { label: 'Paid Bills', data: data.map(d=>d.commitments), backgroundColor: '#059669', borderRadius: 4, borderSkipped: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { size: 12 } } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${utils.formatCurrency(ctx.raw)}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor } },
          y: { min: 0, grid: { color: gridColor }, ticks: { color: textColor, callback: v => utils.getCurrencySymbol()+v.toLocaleString() }, border: { display: false } }
        }
      }
    });

    document.getElementById('monthly-table').innerHTML = `
      <div class="list">
        ${data.map(d => `
          <div class="list-item" style="cursor:default">
            <div class="list-item-content">
              <div class="list-item-title">${utils.formatDate(d.month+'-01','month')}</div>
              <div class="list-item-subtitle">${_expenses.filter(e=>(e.date||'').startsWith(d.month)).length} transactions</div>
            </div>
            <div class="list-item-right">
              <div class="list-item-amount text-error">-${utils.formatCurrency(d.expenses)}</div>
              <div class="text-xs text-secondary">Expenses</div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  function renderCommitments() {
    const total = utils.sumAmount(_commitments);
    const paid  = utils.sumAmount(_commitments.filter(c=>c.paid));
    const unpaid = total - paid;
    const recurring = _commitments.filter(c=>c.recurring);
    const recTotal = utils.sumAmount(recurring);

    const el = document.getElementById('report-content');
    el.innerHTML = `
      <div class="grid-3 mb-6">
        <div class="stat-card"><div class="stat-label">Total Commitments</div><div class="stat-value mt-4">${utils.formatCurrency(total)}</div><div class="text-xs text-secondary mt-4">${_commitments.length} items</div></div>
        <div class="stat-card"><div class="stat-label">Paid Amount</div><div class="stat-value mt-4 text-success">${utils.formatCurrency(paid)}</div><div class="text-xs text-secondary mt-4">${_commitments.filter(c=>c.paid).length} paid</div></div>
        <div class="stat-card"><div class="stat-label">Monthly Recurring</div><div class="stat-value mt-4">${utils.formatCurrency(recTotal)}</div><div class="text-xs text-secondary mt-4">${recurring.length} subscriptions</div></div>
      </div>
      <div class="grid-2 mb-6">
        <div class="card">
          <div class="card-header"><span class="card-title">Payment Status</span></div>
          <div style="height:200px;display:flex;align-items:center;justify-content:center"><canvas id="report-chart" style="max-height:200px;max-width:200px"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Summary</span></div>
          <div>
            <div class="summary-row"><span class="summary-label">Total Commitments</span><span class="summary-value">${_commitments.length}</span></div>
            <div class="summary-row"><span class="summary-label">Paid</span><span class="summary-value text-success">${_commitments.filter(c=>c.paid).length}</span></div>
            <div class="summary-row"><span class="summary-label">Unpaid</span><span class="summary-value text-error">${_commitments.filter(c=>!c.paid).length}</span></div>
            <div class="summary-row"><span class="summary-label">Overdue</span><span class="summary-value text-error">${_commitments.filter(c=>!c.paid&&utils.isOverdue(c.dueDate)).length}</span></div>
            <div class="summary-row"><span class="summary-label">Recurring</span><span class="summary-value">${recurring.length}</span></div>
            <div class="summary-row"><span class="summary-label">Payment Rate</span><span class="summary-value">${total>0?Math.round(paid/total*100):0}%</span></div>
          </div>
        </div>
      </div>`;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    _chart = new Chart(document.getElementById('report-chart'), {
      type: 'doughnut',
      data: {
        labels: ['Paid','Unpaid'],
        datasets: [{ data: [paid, unpaid], backgroundColor: ['#059669','#dc2626'], borderWidth: 2, borderColor: isDark?'#1e293b':'#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { color: isDark?'#94a3b8':'#64748b' } },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${utils.formatCurrency(ctx.raw)}` } }
        }
      }
    });
  }

  function renderCategories() {
    const grouped = {};
    _expenses.forEach(e => {
      const k = e.category||'other';
      grouped[k] = (grouped[k]||0) + (parseFloat(e.amount)||0);
    });
    const entries = Object.entries(grouped).sort((a,b)=>b[1]-a[1]);
    const totalExp = utils.sumAmount(_expenses);

    const el = document.getElementById('report-content');
    el.innerHTML = `
      <div class="grid-2 mb-6">
        <div class="card">
          <div class="card-header"><span class="card-title">All-Time by Category</span></div>
          <div style="height:260px;display:flex;align-items:center;justify-content:center"><canvas id="report-chart" style="max-height:260px;max-width:260px"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Category Breakdown</span></div>
          <div id="cat-breakdown"></div>
        </div>
      </div>`;

    if (!entries.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-title">No expense data</div><div class="empty-description">Add expenses to see category reports.</div></div>`;
      return;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    _chart = new Chart(document.getElementById('report-chart'), {
      type: 'doughnut',
      data: {
        labels: entries.map(([id]) => utils.getCategory(id).emoji + ' ' + utils.getCategory(id).label),
        datasets: [{ data: entries.map(([,v])=>v), backgroundColor: entries.map(([id])=>utils.getCategory(id).color), borderWidth: 2, borderColor: isDark?'#1e293b':'#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: isDark?'#94a3b8':'#64748b', font:{size:11}, boxWidth:10, padding:10 } },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${utils.formatCurrency(ctx.raw)}` } }
        }
      }
    });

    document.getElementById('cat-breakdown').innerHTML = entries.map(([id, amt]) => {
      const cat = utils.getCategory(id);
      const pct = totalExp > 0 ? (amt/totalExp*100).toFixed(1) : 0;
      return `<div style="margin-bottom:var(--space-3)">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:var(--text-sm)">${cat.emoji} ${cat.label}</span>
          <span style="font-size:var(--text-sm);font-weight:var(--font-semibold)">${utils.formatCurrency(amt)} <span style="color:var(--color-text-tertiary);font-weight:400">(${pct}%)</span></span>
        </div>
        <div class="progress"><div class="progress-bar" style="width:${pct}%;background:${cat.color}"></div></div>
      </div>`;
    }).join('');
  }

  function exportCSV() {
    const rows = _expenses.map(e => [e.date, utils.getCategory(e.category).label, e.amount, e.description]);
    const csv  = utils.generateCSV(['Date','Category','Amount','Description'], rows);
    utils.downloadFile(csv, `myfinance-expenses-${utils.todayISO()}.csv`, 'text/csv');
    Toast.success('Expenses exported as CSV');
  }

  function exportJSON() {
    const data = { exportDate: new Date().toISOString(), commitments: _commitments, expenses: _expenses };
    utils.downloadFile(JSON.stringify(data, null, 2), `myfinance-data-${utils.todayISO()}.json`, 'application/json');
    Toast.success('Data exported as JSON');
  }

  return { render, setTab, exportCSV, exportJSON };
})();
