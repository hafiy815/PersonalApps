window.MF = window.MF || {};
window.MF.Pages = window.MF.Pages || {};

window.MF.Pages.expenses = (() => {
  const { DB, utils, Modal, Toast } = window.MF;
  let _items = [], _filter = 'all', _search = '', _month = '', _chart1 = null, _chart2 = null;

  function render(container) {
    _month = '';
    container.innerHTML = `
      <div class="page">
        <div class="section-header mb-6">
          <div>
            <h2 class="section-title">Expenses</h2>
            <p class="card-subtitle">Track where your money goes</p>
          </div>
          <button class="btn btn-primary" onclick="window.MF.Pages.expenses.openForm()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            Add Expense
          </button>
        </div>

        <div class="grid-3 mb-6" id="exp-stats"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4);" id="chart-row">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Monthly Trend</span>
            </div>
            <div class="chart-wrapper" style="height:180px"><canvas id="expTrendChart"></canvas></div>
          </div>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Category Breakdown</span>
            </div>
            <div class="chart-wrapper" style="height:180px;display:flex;align-items:center;justify-content:center"><canvas id="expCatChart" style="max-height:180px"></canvas></div>
          </div>
        </div>

        <div class="card mb-4">
          <div style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
            <div class="search-bar" style="flex:1;min-width:180px">
              <svg class="search-icon" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M15 15l-3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <input class="search-input" placeholder="Search expenses…" id="exp-search" type="search">
            </div>
            <input type="month" class="form-input" id="exp-month" value="${_month}" style="width:auto">
            <select class="form-select" id="exp-cat-filter" style="width:auto;min-width:140px">
              <option value="">All categories</option>
              ${utils.CATEGORIES.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="exp-list"></div>
      </div>`;

    setupChartGrid();

    document.getElementById('exp-search')?.addEventListener('input', utils.debounce(e => {
      _search = e.target.value.toLowerCase(); renderList();
    }, 250));
    document.getElementById('exp-month')?.addEventListener('change', e => {
      _month = e.target.value; renderStats(); renderList(); renderCharts();
    });
    document.getElementById('exp-cat-filter')?.addEventListener('change', e => {
      _filter = e.target.value || 'all'; renderList();
    });

    loadData();
  }

  function setupChartGrid() {
    if (window.innerWidth <= 768) {
      document.getElementById('chart-row')?.style.setProperty('grid-template-columns', '1fr');
    }
  }

  async function loadData() {
    _items = await DB.getAll('expenses');
    renderStats();
    renderCharts();
    renderList();
  }

  function monthItems() {
    return _month ? _items.filter(e => (e.date || '').startsWith(_month)) : _items;
  }

  function renderStats() {
    const mItems  = monthItems();
    const total   = utils.sumAmount(mItems);
    const hasMonth = !!_month;
    const byDay   = hasMonth && mItems.length > 0 ? total / new Date().getDate() : null;
    const topCat  = getTopCategory(mItems);

    document.getElementById('exp-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">${hasMonth ? 'Month Total' : 'Total Expenses'}</div>
        <div class="stat-value mt-4">${utils.formatCurrency(total)}</div>
        <div class="text-xs text-secondary mt-4">${mItems.length} transaction${mItems.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${hasMonth ? 'Daily Average' : 'This Month'}</div>
        <div class="stat-value mt-4">${hasMonth ? utils.formatCurrency(byDay) : utils.formatCurrency(utils.sumAmount(_items.filter(e => (e.date||'').startsWith(utils.monthISO(0)))))}</div>
        <div class="text-xs text-secondary mt-4">${hasMonth ? 'per day this month' : 'current month spending'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Top Category</div>
        <div class="stat-value mt-4" style="font-size:var(--text-xl)">${topCat ? topCat.cat.emoji + ' ' + topCat.cat.label : '—'}</div>
        <div class="text-xs text-secondary mt-4">${topCat ? utils.formatCurrency(topCat.amount) : 'No expenses'}</div>
      </div>`;
  }

  function getTopCategory(items) {
    const grouped = {};
    items.forEach(e => { const k = e.category||'other'; grouped[k] = (grouped[k]||0) + (parseFloat(e.amount)||0); });
    const top = Object.entries(grouped).sort((a,b) => b[1]-a[1])[0];
    if (!top) return null;
    return { cat: utils.getCategory(top[0]), amount: top[1] };
  }

  function renderCharts() {
    const mItems  = monthItems();
    renderTrend();
    renderCatPie(mItems);
  }

  function renderTrend() {
    const months = utils.last6Months();
    const data   = months.map(m => utils.sumAmount(_items.filter(e => (e.date||'').startsWith(m))));
    const labels = months.map(m => utils.formatDate(m+'-01','mon'));

    const canvas = document.getElementById('expTrendChart');
    if (!canvas) return;
    if (_chart1) { _chart1.destroy(); _chart1 = null; }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    _chart1 = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2563eb',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => utils.formatCurrency(ctx.raw) } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
          y: { min: 0, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: v => utils.getCurrencySymbol()+v.toLocaleString() }, border: { display: false } }
        }
      }
    });
  }

  function renderCatPie(items) {
    const grouped = {};
    items.forEach(e => { const k = e.category||'other'; grouped[k] = (grouped[k]||0)+(parseFloat(e.amount)||0); });
    const entries = Object.entries(grouped).sort((a,b)=>b[1]-a[1]).slice(0,7);

    const canvas = document.getElementById('expCatChart');
    if (!canvas) return;
    if (_chart2) { _chart2.destroy(); _chart2 = null; }

    if (!entries.length) { canvas.style.display='none'; return; }
    canvas.style.display = '';

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    _chart2 = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: entries.map(([id]) => utils.getCategory(id).emoji + ' ' + utils.getCategory(id).label),
        datasets: [{ data: entries.map(([,v])=>v), backgroundColor: entries.map(([id])=>utils.getCategory(id).color), borderWidth: 2, borderColor: isDark?'#1e293b':'#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { color: isDark?'#94a3b8':'#64748b', font: { size: 10 }, boxWidth: 8, padding: 8 } },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${utils.formatCurrency(ctx.raw)}` } }
        }
      }
    });
  }

  function renderList() {
    let items = [..._items];
    if (_month) items = items.filter(e => (e.date||'').startsWith(_month));
    if (_search) items = items.filter(e => (e.description||'').toLowerCase().includes(_search) || (e.category||'').includes(_search));
    if (_filter && _filter !== 'all') items = items.filter(e => e.category === _filter);
    items.sort((a,b) => new Date(b.date) - new Date(a.date));

    const el = document.getElementById('exp-list');
    if (!el) return;

    if (!items.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" width="32" height="32"><path d="M12 2v20M7 7h9a2 2 0 010 4H9a2 2 0 000 4h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="empty-title">No expenses found</div><div class="empty-description">${!_search&&_filter==='all'?'Start logging your daily expenses to see spending insights.':'Try adjusting your search or filters.'}</div>${!_search&&_filter==='all'?'<button class="btn btn-primary" onclick="window.MF.Pages.expenses.openForm()">Add Expense</button>':''}</div>`;
      return;
    }

    let currentDate = '';
    const rows = items.map(e => {
      const cat = utils.getCategory(e.category);
      let header = '';
      const dateLabel = utils.formatDate(e.date, 'medium');
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        header = `<div style="font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.06em;padding:var(--space-3) 0 var(--space-2)">${dateLabel}</div>`;
      }
      return header + `<div class="list-item">
        <div class="list-item-icon" style="background:${cat.color}22;font-size:20px">${cat.emoji}</div>
        <div class="list-item-content">
          <div class="list-item-title">${utils.escape(e.description||cat.label)}</div>
          <div class="list-item-subtitle">${cat.label}</div>
        </div>
        <div class="list-item-right">
          <div class="list-item-amount text-error">-${utils.formatCurrency(e.amount)}</div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-secondary btn-icon" title="Edit" onclick="window.MF.Pages.expenses.openForm(${e.id})">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
            </button>
            <button class="btn btn-sm btn-ghost btn-icon" title="Delete" onclick="window.MF.Pages.expenses.deleteItem(${e.id})" style="color:var(--color-error)">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
      </div>`;
    }).join('');

    el.innerHTML = `<div class="list">${rows}</div>`;
  }

  function openForm(id) {
    const item  = id ? _items.find(e => e.id === id) : null;
    const today = utils.todayISO();
    const modalId = `modal-${Date.now()}`;

    const { modal, close } = Modal.open({
      id: modalId,
      title: item ? 'Edit Expense' : 'Add Expense',
      body: `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Date</label>
            <input class="form-input" id="f-date" type="date" value="${item?.date||today}">
          </div>
          <div class="form-group">
            <label class="form-label required">Amount</label>
            <input class="form-input" id="f-amount" type="number" min="0" step="0.01" placeholder="0.00" value="${item?.amount||''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="f-cat">${utils.categorySelectOptions(item?.category||'food')}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input class="form-input" id="f-desc" placeholder="What did you spend on?" value="${utils.escape(item?.description||'')}">
        </div>`,
      footer: `
        <button class="btn btn-secondary" onclick="window.MF.Modal.close('${modalId}')">Cancel</button>
        <button class="btn btn-primary" id="f-save">Save</button>`
    });

    modal.querySelector('#f-save').addEventListener('click', async () => {
      const date     = modal.querySelector('#f-date').value;
      const amount   = parseFloat(modal.querySelector('#f-amount').value);
      const category = modal.querySelector('#f-cat').value;
      const description = modal.querySelector('#f-desc').value.trim();

      if (!date)                  { Toast.error('Date is required'); return; }
      if (!amount || amount <= 0) { Toast.error('Enter a valid amount'); return; }

      const data = { date, amount, category, description };
      if (item) { await DB.update('expenses', { ...item, ...data }); Toast.success('Expense updated'); }
      else      { await DB.add('expenses', data); Toast.success('Expense added'); }

      close();
      await loadData();
    });

    modal.querySelector('#f-amount').focus();
  }

  async function deleteItem(id) {
    const ok = await Modal.confirm({ title: 'Delete Expense', message: 'Remove this expense? This cannot be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    await DB.remove('expenses', id);
    Toast.success('Expense deleted');
    await loadData();
  }

  return { render, openForm, deleteItem };
})();
