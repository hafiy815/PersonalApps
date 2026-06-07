window.MF = window.MF || {};
window.MF.Pages = window.MF.Pages || {};

window.MF.Pages.commitments = (() => {
  const { DB, utils, Modal, Toast } = window.MF;
  let _items = [], _filter = 'all', _search = '', _sort = 'dueDate';

  function render(container) {
    container.innerHTML = `
      <div class="page">
        <div class="section-header mb-6">
          <div>
            <h2 class="section-title">Commitments</h2>
            <p class="card-subtitle">Track your recurring bills and obligations</p>
          </div>
          <button class="btn btn-primary" onclick="window.MF.Pages.commitments.openForm()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            Add Commitment
          </button>
        </div>

        <div class="grid-3 mb-6" id="commit-stats"></div>

        <div class="card mb-4">
          <div style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
            <div class="search-bar" style="flex:1;min-width:200px">
              <svg class="search-icon" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M15 15l-3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <input class="search-input" placeholder="Search commitments…" id="commit-search" type="search">
            </div>
            <div class="filters-bar">
              ${['all','unpaid','paid','overdue','recurring'].map(f =>
                `<button class="filter-chip ${_filter===f?'active':''}" data-filter="${f}" onclick="window.MF.Pages.commitments.setFilter('${f}')">${f.charAt(0).toUpperCase()+f.slice(1)}</button>`
              ).join('')}
            </div>
            <select class="form-select" style="width:auto;min-width:130px" id="commit-sort" onchange="window.MF.Pages.commitments.setSort(this.value)">
              <option value="dueDate" ${_sort==='dueDate'?'selected':''}>Sort: Due Date</option>
              <option value="amount" ${_sort==='amount'?'selected':''}>Sort: Amount</option>
              <option value="title" ${_sort==='title'?'selected':''}>Sort: Name</option>
            </select>
          </div>
        </div>

        <div id="commit-list"></div>
      </div>`;

    document.getElementById('commit-search')?.addEventListener('input', utils.debounce(e => {
      _search = e.target.value.toLowerCase();
      renderList();
    }, 250));

    loadData();
  }

  async function loadData() {
    _items = await DB.getAll('commitments');
    renderStats();
    renderList();
  }

  function renderStats() {
    const total  = utils.sumAmount(_items);
    const paid   = utils.sumAmount(_items.filter(c => c.paid));
    const unpaid = total - paid;
    const pct    = total > 0 ? Math.round((paid / total) * 100) : 0;

    document.getElementById('commit-stats').innerHTML = `
      <div class="card">
        <div class="stat-label">Total Amount</div>
        <div class="stat-value mt-4">${utils.formatCurrency(total)}</div>
        <div class="progress mt-4"><div class="progress-bar success" style="width:${pct}%"></div></div>
        <div class="text-xs text-secondary mt-4">${pct}% paid</div>
      </div>
      <div class="card">
        <div class="stat-label">Paid</div>
        <div class="stat-value mt-4 text-success">${utils.formatCurrency(paid)}</div>
        <div class="text-xs text-secondary mt-4">${_items.filter(c=>c.paid).length} of ${_items.length} commitments</div>
      </div>
      <div class="card">
        <div class="stat-label">Outstanding</div>
        <div class="stat-value mt-4 text-error">${utils.formatCurrency(unpaid)}</div>
        <div class="text-xs text-secondary mt-4">${_items.filter(c=>!c.paid).length} unpaid • ${_items.filter(c=>!c.paid&&utils.isOverdue(c.dueDate)).length} overdue</div>
      </div>`;
  }

  function renderList() {
    let items = [..._items];

    if (_search) items = items.filter(c => c.title.toLowerCase().includes(_search) || (c.notes||'').toLowerCase().includes(_search) || (c.category||'').includes(_search));
    if (_filter === 'paid')      items = items.filter(c => c.paid);
    if (_filter === 'unpaid')    items = items.filter(c => !c.paid);
    if (_filter === 'overdue')   items = items.filter(c => !c.paid && utils.isOverdue(c.dueDate));
    if (_filter === 'recurring') items = items.filter(c => c.recurring);

    if (_sort === 'dueDate') items.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
    if (_sort === 'amount')  items.sort((a,b) => b.amount - a.amount);
    if (_sort === 'title')   items.sort((a,b) => a.title.localeCompare(b.title));

    const el = document.getElementById('commit-list');
    if (!el) return;

    if (!items.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" width="32" height="32"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8M8 8h8M8 16h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div><div class="empty-title">No commitments found</div><div class="empty-description">${_filter==='all'&&!_search ? 'Add your first commitment to start tracking your bills.' : 'Try adjusting your search or filter.'}</div>${_filter==='all'&&!_search ? '<button class="btn btn-primary" onclick="window.MF.Pages.commitments.openForm()">Add Commitment</button>' : ''}</div>`;
      return;
    }

    el.innerHTML = `<div class="list">${items.map(c => commitmentRow(c)).join('')}</div>`;
  }

  function commitmentRow(c) {
    const cat     = utils.getCategory(c.category);
    const overdue = !c.paid && utils.isOverdue(c.dueDate);
    const soon    = !c.paid && !overdue && utils.isDueSoon(c.dueDate, 3);

    return `<div class="list-item" data-id="${c.id}">
      <div class="list-item-icon" style="background:${cat.color}22;font-size:20px">${cat.emoji}</div>
      <div class="list-item-content">
        <div class="list-item-title">${utils.escape(c.title)}</div>
        <div class="list-item-subtitle" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${overdue ? '<span class="badge badge-error">Overdue</span>' : soon ? '<span class="badge badge-warning">Due soon</span>' : ''}
          <span>${utils.formatDate(c.dueDate, 'medium')}</span>
          ${c.recurring ? '· <span class="badge badge-primary">Monthly</span>' : ''}
          ${c.notes ? `· <span class="truncate" style="max-width:150px;color:var(--color-text-tertiary)">${utils.escape(c.notes)}</span>` : ''}
        </div>
      </div>
      <div class="list-item-right" style="align-items:flex-end;gap:var(--space-2)">
        <div class="list-item-amount">${utils.formatCurrency(c.amount)}</div>
        <div style="display:flex;gap:var(--space-1);align-items:center">
          <span class="badge ${c.paid ? 'badge-success' : 'badge-neutral'}">${c.paid ? '✓ Paid' : 'Unpaid'}</span>
        </div>
        <div class="list-item-actions" style="opacity:1;display:flex;gap:4px;margin-top:4px">
          <button class="btn btn-sm ${c.paid ? 'btn-ghost' : 'btn-success'}" title="${c.paid ? 'Mark unpaid' : 'Mark paid'}" onclick="window.MF.Pages.commitments.togglePaid(${c.id})">
            ${c.paid ? 'Undo' : '✓ Pay'}
          </button>
          <button class="btn btn-sm btn-secondary btn-icon" title="Edit" onclick="window.MF.Pages.commitments.openForm(${c.id})">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
          </button>
          <button class="btn btn-sm btn-ghost btn-icon" title="Delete" onclick="window.MF.Pages.commitments.deleteItem(${c.id})" style="color:var(--color-error)">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }

  function openForm(id) {
    const item = id ? _items.find(c => c.id === id) : null;
    const today = utils.todayISO();
    const modalId = `modal-${Date.now()}`;

    const { modal, close } = Modal.open({
      id: modalId,
      title: item ? 'Edit Commitment' : 'Add Commitment',
      body: `
        <div class="form-group">
          <label class="form-label required">Title</label>
          <input class="form-input" id="f-title" placeholder="e.g. Netflix, Rent, Internet" value="${utils.escape(item?.title||'')}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Amount</label>
            <input class="form-input" id="f-amount" type="number" min="0" step="0.01" placeholder="0.00" value="${item?.amount||''}">
          </div>
          <div class="form-group">
            <label class="form-label required">Due Date</label>
            <input class="form-input" id="f-due" type="date" value="${item?.dueDate||today}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="f-cat">${utils.categorySelectOptions(item?.category||'other')}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-textarea" id="f-notes" placeholder="Optional notes…" style="min-height:72px">${utils.escape(item?.notes||'')}</textarea>
        </div>
        <div class="toggle-group">
          <label class="toggle"><input type="checkbox" id="f-recurring" ${item?.recurring?'checked':''}><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
          <span class="form-label" style="margin:0">Recurring monthly</span>
        </div>`,
      footer: `
        <button class="btn btn-secondary" onclick="window.MF.Modal.close('${modalId}')">Cancel</button>
        <button class="btn btn-primary" id="f-save">Save</button>`
    });

    modal.querySelector('#f-save').addEventListener('click', async () => {
      const title    = modal.querySelector('#f-title').value.trim();
      const amount   = parseFloat(modal.querySelector('#f-amount').value);
      const dueDate  = modal.querySelector('#f-due').value;
      const category = modal.querySelector('#f-cat').value;
      const notes    = modal.querySelector('#f-notes').value.trim();
      const recurring= modal.querySelector('#f-recurring').checked;

      if (!title)       { Toast.error('Title is required'); return; }
      if (!amount || amount <= 0) { Toast.error('Enter a valid amount'); return; }
      if (!dueDate)     { Toast.error('Due date is required'); return; }

      const data = { title, amount, dueDate, category, notes, recurring, paid: item?.paid || false };
      if (item) { await DB.update('commitments', { ...item, ...data }); Toast.success('Commitment updated'); }
      else      { await DB.add('commitments', data); Toast.success('Commitment added'); }

      close();
      await loadData();
    });

    modal.querySelector('#f-title').addEventListener('keydown', e => { if (e.key === 'Enter') modal.querySelector('#f-save').click(); });
  }

  async function togglePaid(id) {
    const item = _items.find(c => c.id === id);
    if (!item) return;
    await DB.update('commitments', { ...item, paid: !item.paid });
    Toast.success(item.paid ? 'Marked as unpaid' : 'Marked as paid!');
    await loadData();
  }

  async function deleteItem(id) {
    const item = _items.find(c => c.id === id);
    if (!item) return;
    const ok = await Modal.confirm({ title: 'Delete Commitment', message: `Delete "${item.title}"? This cannot be undone.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    await DB.remove('commitments', id);
    Toast.success('Commitment deleted');
    await loadData();
  }

  function setFilter(f) {
    _filter = f;
    document.querySelectorAll('.filter-chip[data-filter]').forEach(el =>
      el.classList.toggle('active', el.dataset.filter === f)
    );
    renderList();
  }

  function setSort(s) { _sort = s; renderList(); }

  return { render, openForm, togglePaid, deleteItem, setFilter, setSort };
})();
