window.MF = window.MF || {};
window.MF.Pages = window.MF.Pages || {};

window.MF.Pages.debt = (() => {
  const { DB, utils, Modal, Toast } = window.MF;
  let _items = [], _filter = 'active';

  const QUICK_LENDERS = ['Wife', 'Son', 'Daughter', 'Mother', 'Father', 'Friend'];

  /* ─── Helpers ─── */
  function paid(debt) {
    return (debt.repayments || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  }
  function outstanding(debt) {
    return Math.max(0, (parseFloat(debt.amount) || 0) - paid(debt));
  }
  function pct(debt) {
    const t = parseFloat(debt.amount) || 0;
    return t > 0 ? Math.min(100, Math.round((paid(debt) / t) * 100)) : 0;
  }
  function isSettled(debt) {
    return debt.settled || outstanding(debt) <= 0;
  }

  /* ─── Render shell ─── */
  function render(container) {
    container.innerHTML = `
      <div class="page">
        <div class="section-header mb-6">
          <div>
            <h2 class="section-title">Debt Tracker</h2>
            <p class="card-subtitle">Track money borrowed from family</p>
          </div>
          <button class="btn btn-primary" onclick="window.MF.Pages.debt.openForm()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            Record Debt
          </button>
        </div>

        <div class="grid-3 mb-6" id="debt-stats">
          <div class="stat-card"><div class="skeleton skeleton-line mb-2" style="width:80px"></div><div class="skeleton skeleton-value"></div></div>
          <div class="stat-card"><div class="skeleton skeleton-line mb-2" style="width:80px"></div><div class="skeleton skeleton-value"></div></div>
          <div class="stat-card"><div class="skeleton skeleton-line mb-2" style="width:80px"></div><div class="skeleton skeleton-value"></div></div>
        </div>

        <div class="card mb-4" style="padding:var(--space-3) var(--space-4)">
          <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap">
            <div class="filters-bar" id="debt-filters">
              ${['active','settled','all'].map(f =>
                `<button class="filter-chip ${_filter===f?'active':''}" data-filter="${f}"
                  onclick="window.MF.Pages.debt.setFilter('${f}')">
                  ${f.charAt(0).toUpperCase()+f.slice(1)}
                </button>`
              ).join('')}
            </div>
            <div class="search-bar" style="flex:1;min-width:180px">
              <svg class="search-icon" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M15 15l-3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <input class="search-input" id="debt-search" placeholder="Search debts…" type="search">
            </div>
          </div>
        </div>

        <div id="debt-list"></div>
      </div>`;

    document.getElementById('debt-search')?.addEventListener('input',
      utils.debounce(() => renderList(), 250));

    loadData();
  }

  async function loadData() {
    _items = await DB.getAll('debts');
    renderStats();
    renderList();
  }

  /* ─── Stats ─── */
  function renderStats() {
    const active   = _items.filter(d => !isSettled(d));
    const totalBor = utils.sumAmount(_items);
    const totalPaid= _items.reduce((s, d) => s + paid(d), 0);
    const totalOut = _items.reduce((s, d) => s + outstanding(d), 0);

    document.getElementById('debt-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon" style="background:#8b5cf622">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 2v16M6 6h6a2 2 0 010 4H8a2 2 0 000 4h7" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="stat-label">Total Borrowed</div>
        <div class="stat-value">${utils.formatCurrency(totalBor)}</div>
        <div class="stat-change">${_items.length} debt${_items.length!==1?'s':''} · ${active.length} active</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#05966922">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="#059669" stroke-width="1.5"/>
            <path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="stat-label">Total Repaid</div>
        <div class="stat-value text-success">${utils.formatCurrency(totalPaid)}</div>
        <div class="stat-change">${_items.filter(d=>isSettled(d)&&d.amount>0).length} fully settled</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#dc262622">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="#dc2626" stroke-width="1.5"/>
            <path d="M10 6v4M10 12v.5" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="stat-label">Outstanding</div>
        <div class="stat-value text-error">${utils.formatCurrency(totalOut)}</div>
        <div class="stat-change ${totalOut>0?'down':''}">${active.length} pending payment${active.length!==1?'s':''}</div>
      </div>`;
  }

  /* ─── List ─── */
  function renderList() {
    const search = (document.getElementById('debt-search')?.value || '').toLowerCase();
    let items = [..._items];

    if (search) items = items.filter(d =>
      d.lender.toLowerCase().includes(search) ||
      (d.purpose||'').toLowerCase().includes(search)
    );
    if (_filter === 'active')  items = items.filter(d => !isSettled(d));
    if (_filter === 'settled') items = items.filter(d => isSettled(d));

    items.sort((a, b) => {
      if (isSettled(a) !== isSettled(b)) return isSettled(a) ? 1 : -1;
      return new Date(b.date) - new Date(a.date);
    });

    const el = document.getElementById('debt-list');
    if (!el) return;

    if (!items.length) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
              <path d="M12 2v20M7 7h9a2 2 0 010 4H9a2 2 0 000 4h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="empty-title">${_filter==='settled'?'No settled debts':'No active debts'}</div>
          <div class="empty-description">
            ${_items.length===0
              ? 'Record your first debt to start tracking what you owe.'
              : _filter==='active' ? 'All debts have been settled. Great job! 🎉' : 'No debts match this filter.'}
          </div>
          ${_items.length===0 ? '<button class="btn btn-primary" onclick="window.MF.Pages.debt.openForm()">Record Debt</button>' : ''}
        </div>`;
      return;
    }

    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--space-3)">${items.map(d => debtCard(d)).join('')}</div>`;
  }

  /* ─── Debt Card ─── */
  function debtCard(d) {
    const p      = paid(d);
    const out    = outstanding(d);
    const pc     = pct(d);
    const settled= isSettled(d);
    const repays = (d.repayments || []);
    const initials = d.lender.slice(0,2).toUpperCase();
    const avatarColor = lenderColor(d.lender);

    const repayHistory = repays.length ? `
      <div style="margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--color-border)">
        <div style="font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-3)">
          Repayment History (${repays.length})
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2)">
          ${repays.map((r,i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) var(--space-3);background:var(--color-bg);border-radius:var(--radius-sm)">
              <div>
                <div style="font-size:var(--text-sm);font-weight:var(--font-medium);color:var(--color-text-primary)">${utils.formatCurrency(r.amount)}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary)">${utils.formatDate(r.date,'medium')}${r.notes?` · ${utils.escape(r.notes)}`:''}</div>
              </div>
              <button class="btn btn-sm btn-ghost btn-icon" style="color:var(--color-error)"
                onclick="window.MF.Pages.debt.removeRepayment(${d.id},${i})" title="Remove this repayment">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>`).join('')}
        </div>
      </div>` : '';

    return `
      <div class="card" style="border-left:3px solid ${settled?'var(--color-success)':out>0?'var(--color-error)':'var(--color-primary)'}">
        <div style="display:flex;align-items:flex-start;gap:var(--space-4)">

          <!-- Avatar -->
          <div style="width:44px;height:44px;border-radius:var(--radius-full);background:${avatarColor}22;color:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:var(--text-sm);font-weight:var(--font-bold);flex-shrink:0">${initials}</div>

          <!-- Main content -->
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;margin-bottom:2px">
              <span style="font-size:var(--text-base);font-weight:var(--font-semibold);color:var(--color-text-primary)">${utils.escape(d.lender)}</span>
              ${settled ? '<span class="badge badge-success">✓ Settled</span>' : '<span class="badge badge-error">Unpaid</span>'}
              ${d.purpose ? `<span style="font-size:var(--text-xs);color:var(--color-text-tertiary)">· ${utils.escape(d.purpose)}</span>` : ''}
            </div>
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-3)">
              Borrowed on ${utils.formatDate(d.date,'medium')}${d.notes?` · ${utils.escape(d.notes)}`:''}
            </div>

            <!-- Amounts row -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);margin-bottom:var(--space-3)">
              <div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:2px">Borrowed</div>
                <div style="font-size:var(--text-sm);font-weight:var(--font-semibold);font-variant-numeric:tabular-nums">${utils.formatCurrency(d.amount)}</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:2px">Repaid</div>
                <div style="font-size:var(--text-sm);font-weight:var(--font-semibold);color:var(--color-success);font-variant-numeric:tabular-nums">${utils.formatCurrency(p)}</div>
              </div>
              <div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:2px">Outstanding</div>
                <div style="font-size:var(--text-sm);font-weight:var(--font-bold);color:${out>0?'var(--color-error)':'var(--color-success)'};font-variant-numeric:tabular-nums">${utils.formatCurrency(out)}</div>
              </div>
            </div>

            <!-- Progress bar -->
            <div style="margin-bottom:var(--space-3)">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:var(--text-xs);color:var(--color-text-tertiary)">${pc}% repaid</span>
                <span style="font-size:var(--text-xs);color:var(--color-text-tertiary)">${repays.length} payment${repays.length!==1?'s':''}</span>
              </div>
              <div class="progress">
                <div class="progress-bar ${settled?'success':pc>60?'':'error'}" style="width:${pc}%;background:${settled?'var(--color-success)':pc>=100?'var(--color-success)':pc>50?'var(--color-warning)':'var(--color-primary)'}"></div>
              </div>
            </div>

            <!-- Actions -->
            <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
              ${!settled ? `
                <button class="btn btn-sm btn-primary" onclick="window.MF.Pages.debt.openRepayment(${d.id})">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  Add Repayment
                </button>
                <button class="btn btn-sm btn-success" onclick="window.MF.Pages.debt.markSettled(${d.id})">
                  ✓ Mark Settled
                </button>` : `
                <button class="btn btn-sm btn-ghost" onclick="window.MF.Pages.debt.unsettle(${d.id})">
                  Reopen
                </button>`}
              <button class="btn btn-sm btn-secondary btn-icon" title="Edit" onclick="window.MF.Pages.debt.openForm(${d.id})">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
              </button>
              <button class="btn btn-sm btn-ghost btn-icon" title="Delete" style="color:var(--color-error)" onclick="window.MF.Pages.debt.deleteDebt(${d.id})">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>

            ${repayHistory}
          </div>
        </div>
      </div>`;
  }

  function lenderColor(name) {
    const colors = ['#2563eb','#059669','#d97706','#dc2626','#8b5cf6','#ec4899','#0891b2','#f97316'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
    return colors[Math.abs(h)];
  }

  /* ─── Add / Edit Debt Form ─── */
  function openForm(id) {
    const item = id ? _items.find(d => d.id === id) : null;
    const today = utils.todayISO();
    const modalId = `modal-${Date.now()}`;

    const { modal, close } = Modal.open({
      id: modalId,
      title: item ? 'Edit Debt' : 'Record Debt',
      body: `
        <div class="form-group">
          <label class="form-label required">Borrowed from</label>
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-2)">
            ${QUICK_LENDERS.map(l =>
              `<button type="button" class="filter-chip" onclick="document.getElementById('f-lender').value='${l}';this.parentElement.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${l}</button>`
            ).join('')}
          </div>
          <input class="form-input" id="f-lender" placeholder="Enter name (e.g. Wife, Ahmad)" value="${utils.escape(item?.lender||'')}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Amount Borrowed</label>
            <input class="form-input" id="f-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value="${item?.amount||''}">
          </div>
          <div class="form-group">
            <label class="form-label required">Date Borrowed</label>
            <input class="form-input" id="f-date" type="date" value="${item?.date||today}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Purpose</label>
          <input class="form-input" id="f-purpose" placeholder="What was the money for?" value="${utils.escape(item?.purpose||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-textarea" id="f-notes" placeholder="Any additional notes…" style="min-height:72px">${utils.escape(item?.notes||'')}</textarea>
        </div>`,
      footer: `
        <button class="btn btn-secondary" onclick="window.MF.Modal.close('${modalId}')">Cancel</button>
        <button class="btn btn-primary" id="f-save">Save</button>`
    });

    // Highlight quick-lender if editing
    if (item?.lender) {
      modal.querySelectorAll('.filter-chip').forEach(btn => {
        if (btn.textContent.trim() === item.lender) btn.classList.add('active');
      });
    }

    modal.querySelector('#f-save').addEventListener('click', async () => {
      const lender  = modal.querySelector('#f-lender').value.trim();
      const amount  = parseFloat(modal.querySelector('#f-amount').value);
      const date    = modal.querySelector('#f-date').value;
      const purpose = modal.querySelector('#f-purpose').value.trim();
      const notes   = modal.querySelector('#f-notes').value.trim();

      if (!lender)              { Toast.error('Please enter who you borrowed from'); return; }
      if (!amount || amount<=0) { Toast.error('Enter a valid amount'); return; }
      if (!date)                { Toast.error('Date is required'); return; }

      const data = { lender, amount, date, purpose, notes,
        repayments: item?.repayments || [], settled: item?.settled || false };

      if (item) { await DB.update('debts', { ...item, ...data }); Toast.success('Debt updated'); }
      else      { await DB.add('debts', data); Toast.success('Debt recorded'); }

      close();
      await loadData();
    });

    modal.querySelector('#f-lender').addEventListener('keydown', e => {
      if (e.key === 'Enter') modal.querySelector('#f-save').click();
    });
    setTimeout(() => modal.querySelector('#f-lender').focus(), 50);
  }

  /* ─── Add Repayment ─── */
  function openRepayment(debtId) {
    const debt = _items.find(d => d.id === debtId);
    if (!debt) return;
    const out = outstanding(debt);
    const today = utils.todayISO();
    const modalId = `modal-${Date.now()}`;

    const { modal, close } = Modal.open({
      id: modalId,
      title: `Repayment — ${debt.lender}`,
      body: `
        <div style="display:flex;justify-content:space-between;padding:var(--space-3) var(--space-4);background:var(--color-error-subtle);border-radius:var(--radius-md);margin-bottom:var(--space-4)">
          <span style="font-size:var(--text-sm);color:var(--color-text-secondary)">Outstanding balance</span>
          <span style="font-size:var(--text-sm);font-weight:var(--font-bold);color:var(--color-error)">${utils.formatCurrency(out)}</span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Amount Paid</label>
            <input class="form-input" id="r-amount" type="number" min="0.01" step="0.01" placeholder="0.00">
          </div>
          <div class="form-group">
            <label class="form-label required">Date</label>
            <input class="form-input" id="r-date" type="date" value="${today}">
          </div>
        </div>
        <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);flex-wrap:wrap">
          <button type="button" class="filter-chip" onclick="document.getElementById('r-amount').value='${out.toFixed(2)}';this.parentElement.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));this.classList.add('active')">Full (${utils.formatCurrency(out)})</button>
          ${[0.5,0.25].map(frac => {
            const v = (out*frac).toFixed(2);
            return `<button type="button" class="filter-chip" onclick="document.getElementById('r-amount').value='${v}';this.parentElement.querySelectorAll('.filter-chip').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${frac*100}% (${utils.formatCurrency(v)})</button>`;
          }).join('')}
        </div>
        <div class="form-group">
          <label class="form-label">Notes (optional)</label>
          <input class="form-input" id="r-notes" placeholder="e.g. Cash, Transfer, etc.">
        </div>`,
      footer: `
        <button class="btn btn-secondary" onclick="window.MF.Modal.close('${modalId}')">Cancel</button>
        <button class="btn btn-success" id="r-save">Record Payment</button>`
    });

    modal.querySelector('#r-save').addEventListener('click', async () => {
      const amount = parseFloat(modal.querySelector('#r-amount').value);
      const date   = modal.querySelector('#r-date').value;
      const notes  = modal.querySelector('#r-notes').value.trim();

      if (!amount || amount <= 0) { Toast.error('Enter a valid amount'); return; }
      if (!date)                  { Toast.error('Date is required'); return; }
      if (amount > out + 0.01)    { Toast.warning(`Amount exceeds outstanding balance of ${utils.formatCurrency(out)}`); return; }

      const repayments = [...(debt.repayments || []), { amount, date, notes }];
      const nowSettled = (paid(debt) + amount) >= (parseFloat(debt.amount) - 0.01);
      await DB.update('debts', { ...debt, repayments, settled: nowSettled || debt.settled });

      Toast.success(`Payment of ${utils.formatCurrency(amount)} recorded${nowSettled ? ' — Debt fully settled! 🎉' : ''}`);
      close();
      await loadData();
    });

    setTimeout(() => modal.querySelector('#r-amount').focus(), 50);
  }

  /* ─── Mark Settled / Unsettle ─── */
  async function markSettled(id) {
    const d = _items.find(x => x.id === id);
    if (!d) return;
    await DB.update('debts', { ...d, settled: true });
    Toast.success('Debt marked as settled ✓');
    await loadData();
  }

  async function unsettle(id) {
    const d = _items.find(x => x.id === id);
    if (!d) return;
    await DB.update('debts', { ...d, settled: false });
    Toast.info('Debt reopened');
    await loadData();
  }

  /* ─── Remove single repayment ─── */
  async function removeRepayment(debtId, index) {
    const d = _items.find(x => x.id === debtId);
    if (!d) return;
    const ok = await Modal.confirm({
      title: 'Remove Repayment',
      message: 'Remove this repayment record? The outstanding balance will increase.',
      confirmText: 'Remove', danger: true
    });
    if (!ok) return;
    const repayments = (d.repayments || []).filter((_, i) => i !== index);
    const nowSettled = d.settled && repayments.reduce((s,r) => s+(parseFloat(r.amount)||0), 0) >= (parseFloat(d.amount)-0.01);
    await DB.update('debts', { ...d, repayments, settled: nowSettled });
    Toast.success('Repayment removed');
    await loadData();
  }

  /* ─── Delete ─── */
  async function deleteDebt(id) {
    const d = _items.find(x => x.id === id);
    if (!d) return;
    const ok = await Modal.confirm({
      title: 'Delete Debt',
      message: `Delete the debt record for "${d.lender}"? All repayment history will be lost.`,
      confirmText: 'Delete', danger: true
    });
    if (!ok) return;
    await DB.remove('debts', id);
    Toast.success('Debt deleted');
    await loadData();
  }

  function setFilter(f) {
    _filter = f;
    document.querySelectorAll('#debt-filters .filter-chip').forEach(el =>
      el.classList.toggle('active', el.dataset.filter === f)
    );
    renderList();
  }

  return { render, openForm, openRepayment, markSettled, unsettle, removeRepayment, deleteDebt, setFilter };
})();
