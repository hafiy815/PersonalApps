window.MF = window.MF || {};
window.MF.Pages = window.MF.Pages || {};

window.MF.Pages.budget = (() => {
  const { DB, utils, Modal, Toast } = window.MF;
  let _budgets = {}, _expenses = [], _month = '';

  /* ── Entry point ── */
  function render(container) {
    const now = new Date();
    _month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    container.innerHTML = `
      <div class="page">

        <div class="section-header mb-6">
          <div>
            <h2 class="section-title">Budget Planner</h2>
            <p class="card-subtitle">Set monthly limits and track your spending</p>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-1)">
            <button class="btn btn-ghost btn-sm btn-icon" onclick="window.MF.Pages.budget.prevMonth()" aria-label="Previous month">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <span id="budget-month-label" style="font-weight:var(--font-semibold);font-size:var(--text-sm);min-width:110px;text-align:center;color:var(--color-text-primary)"></span>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="window.MF.Pages.budget.nextMonth()" aria-label="Next month">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>

        <!-- Summary stats -->
        <div class="grid-3 mb-6" id="budget-stats"></div>

        <!-- Category budgets -->
        <div id="budget-list"></div>

      </div>`;

    loadData();
  }

  /* ── Data ── */
  async function loadData() {
    const raw = await DB.getAll('budgets');
    _budgets = {};
    raw.forEach(b => { _budgets[b.category] = parseFloat(b.amount) || 0; });

    const allExp = await DB.getAll('expenses');
    _expenses = allExp.filter(e => (e.date || '').startsWith(_month));

    updateMonthLabel();
    renderStats();
    renderList();
  }

  function updateMonthLabel() {
    const [y, m] = _month.split('-');
    const label = new Date(+y, +m - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
    const el = document.getElementById('budget-month-label');
    if (el) el.textContent = label;
  }

  /* ── Helpers ── */
  function spentFor(catId) {
    return _expenses.filter(e => e.category === catId)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  }

  function totalBudget() {
    return Object.values(_budgets).reduce((s, a) => s + a, 0);
  }

  function totalSpent() {
    return Object.keys(_budgets).reduce((s, cat) => s + spentFor(cat), 0);
  }

  /* ── Stats cards ── */
  function renderStats() {
    const budget    = totalBudget();
    const spent     = totalSpent();
    const remaining = budget - spent;
    const pct       = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
    const barColor  = pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success';
    const noBudgets = Object.keys(_budgets).length === 0;

    document.getElementById('budget-stats').innerHTML = `
      <div class="card">
        <div class="stat-label">Total Budget</div>
        <div class="stat-value mt-4">${noBudgets ? '—' : utils.formatCurrency(budget)}</div>
        <div class="text-xs text-secondary mt-4">${Object.keys(_budgets).length} categor${Object.keys(_budgets).length === 1 ? 'y' : 'ies'} set</div>
      </div>
      <div class="card">
        <div class="stat-label">Spent</div>
        <div class="stat-value mt-4" style="color:var(--color-${barColor})">${utils.formatCurrency(spent)}</div>
        <div class="progress mt-4"><div class="progress-bar ${barColor}" style="width:${pct}%"></div></div>
        <div class="text-xs text-secondary mt-4">${pct}% of budget used</div>
      </div>
      <div class="card">
        <div class="stat-label">${remaining >= 0 ? 'Remaining' : 'Over Budget'}</div>
        <div class="stat-value mt-4" style="color:var(--color-${remaining >= 0 ? 'success' : 'error'})">${utils.formatCurrency(Math.abs(remaining))}</div>
        <div class="text-xs text-secondary mt-4">${remaining >= 0 ? 'Still available this month' : '⚠ You have exceeded your budget'}</div>
      </div>`;
  }

  /* ── Category list ── */
  function renderList() {
    const el = document.getElementById('budget-list');
    if (!el) return;

    const withBudget    = utils.CATEGORIES.filter(c => _budgets[c.id] != null);
    const withoutBudget = utils.CATEGORIES.filter(c => _budgets[c.id] == null);

    let html = '';

    /* ── Budgeted categories ── */
    if (withBudget.length === 0) {
      html += `
        <div class="empty-state mb-6">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
              <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="empty-title">No budgets set yet</div>
          <div class="empty-description">Pick a category below and set your monthly spending limit to start tracking.</div>
        </div>`;
    } else {
      html += `<div class="list mb-6">${withBudget.map(c => budgetRow(c)).join('')}</div>`;
    }

    /* ── Un-budgeted categories ── */
    if (withoutBudget.length > 0) {
      html += `
        <div class="card">
          <div style="font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:var(--space-3)">
            Set budget for
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
            ${withoutBudget.map(c => `
              <button class="filter-chip" onclick="window.MF.Pages.budget.openSetBudget('${c.id}')">
                ${c.emoji} ${c.label}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="margin-left:2px;color:var(--color-primary)"><path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              </button>`).join('')}
          </div>
        </div>`;
    }

    el.innerHTML = html;
  }

  function budgetRow(cat) {
    const budget    = _budgets[cat.id] || 0;
    const spent     = spentFor(cat.id);
    const remaining = budget - spent;
    const pct       = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
    const isOver    = spent > budget;
    const isWarn    = !isOver && pct >= 80;
    const barColor  = isOver ? 'error' : isWarn ? 'warning' : 'success';
    const statusText = isOver
      ? `<span style="color:var(--color-error);font-weight:var(--font-semibold)">⚠ Over by ${utils.formatCurrency(Math.abs(remaining))}</span>`
      : isWarn
        ? `<span style="color:var(--color-warning);font-weight:var(--font-semibold)">${utils.formatCurrency(remaining)} left — almost there!</span>`
        : `<span style="color:var(--color-text-tertiary)">${utils.formatCurrency(remaining)} remaining</span>`;

    return `
      <div class="list-item">
        <div class="list-item-icon" style="background:${cat.color}22;font-size:20px">${cat.emoji}</div>
        <div class="list-item-content">
          <div class="list-item-title">${cat.label}</div>
          <div style="margin-top:6px">
            <div class="progress"><div class="progress-bar ${barColor}" style="width:${pct}%"></div></div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;gap:var(--space-2)">
              <span style="font-size:var(--text-xs);color:var(--color-text-tertiary)">${utils.formatCurrency(spent)} spent</span>
              <span style="font-size:var(--text-xs)">${statusText}</span>
            </div>
          </div>
        </div>
        <div class="list-item-right" style="align-items:flex-end;gap:var(--space-1)">
          <div style="font-size:var(--text-sm);font-weight:var(--font-semibold);color:var(--color-text-primary)">${utils.formatCurrency(budget)}</div>
          <div class="badge ${isOver ? 'badge-error' : isWarn ? 'badge-warning' : 'badge-neutral'}">${pct}%</div>
          <div style="display:flex;gap:4px;margin-top:4px">
            <button class="btn btn-sm btn-secondary btn-icon" onclick="window.MF.Pages.budget.openSetBudget('${cat.id}')" title="Edit">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
            </button>
            <button class="btn btn-sm btn-ghost btn-icon" onclick="window.MF.Pages.budget.removeBudget('${cat.id}')" style="color:var(--color-error)" title="Remove">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
      </div>`;
  }

  /* ── Set / Edit budget modal ── */
  function openSetBudget(categoryId) {
    const cat     = utils.getCategory(categoryId);
    const current = _budgets[categoryId] || '';
    const modalId = `modal-${Date.now()}`;

    const { modal, close } = Modal.open({
      id: modalId,
      title: `${cat.emoji} ${cat.label} — Monthly Budget`,
      body: `
        <div class="form-group">
          <label class="form-label required">Monthly limit (${utils.getCurrencySymbol?.() || 'RM'})</label>
          <input class="form-input" id="f-budget-amount" type="number" min="0" step="0.01"
            placeholder="0.00" value="${current}">
        </div>
        <p class="form-hint mt-4">
          This limit applies every month automatically. Any expense in the
          <strong>${cat.label}</strong> category counts toward it.
        </p>`,
      footer: `
        <button class="btn btn-secondary" onclick="window.MF.Modal.close('${modalId}')">Cancel</button>
        <button class="btn btn-primary" id="f-budget-save">Save Budget</button>`
    });

    const input = modal.querySelector('#f-budget-amount');
    input?.select();

    modal.querySelector('#f-budget-save').addEventListener('click', async () => {
      const amount = parseFloat(input.value);
      if (!amount || amount <= 0) { Toast.error('Enter a valid amount'); return; }
      // DB.update uses put() — works as upsert since keyPath = 'category'
      await DB.update('budgets', { category: categoryId, amount });
      Toast.success(`Budget saved for ${cat.label}`);
      close();
      await loadData();
    });

    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter') modal.querySelector('#f-budget-save').click();
    });
  }

  /* ── Remove budget ── */
  async function removeBudget(categoryId) {
    const cat = utils.getCategory(categoryId);
    const ok  = await Modal.confirm({
      title:       'Remove Budget',
      message:     `Remove the monthly budget for ${cat.emoji} ${cat.label}? Spending will no longer be tracked against a limit.`,
      confirmText: 'Remove',
      danger:      true
    });
    if (!ok) return;
    await DB.remove('budgets', categoryId);
    Toast.success(`Budget removed for ${cat.label}`);
    await loadData();
  }

  /* ── Month navigation ── */
  function prevMonth() {
    const [y, m] = _month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    _month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    loadData();
  }

  function nextMonth() {
    const [y, m] = _month.split('-').map(Number);
    const d = new Date(y, m, 1);
    _month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    loadData();
  }

  return { render, openSetBudget, removeBudget, prevMonth, nextMonth };
})();
