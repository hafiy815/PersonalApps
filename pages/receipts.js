window.MF = window.MF || {};
window.MF.Pages = window.MF.Pages || {};

window.MF.Pages.receipts = (() => {
  const { DB, utils, Modal, Toast } = window.MF;
  let _items = [], _month = '', _catFilter = '';

  function render(container) {
    _month = '';
    container.innerHTML = `
      <div class="page">
        <div class="section-header mb-6">
          <div>
            <h2 class="section-title">Receipts</h2>
            <p class="card-subtitle">Store and organise your receipts</p>
          </div>
          <button class="btn btn-primary" onclick="window.MF.Pages.receipts.openUpload()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M8 2v8M5 5l3-3 3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Upload Receipt
          </button>
        </div>

        <div class="card mb-4">
          <div style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
            <div class="search-bar" style="flex:1;min-width:180px">
              <svg class="search-icon" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M15 15l-3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <input class="search-input" placeholder="Search receipts…" id="rec-search" type="search">
            </div>
            <input type="month" class="form-input" id="rec-month" style="width:auto" placeholder="Filter by month">
            <select class="form-select" id="rec-cat" style="width:auto;min-width:140px">
              <option value="">All categories</option>
              ${utils.CATEGORIES.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="rec-stats" class="mb-4" style="display:flex;gap:var(--space-4)">
          <div class="card" style="flex:1"><div class="stat-label">Total Receipts</div><div class="stat-value mt-4" id="stat-count">-</div></div>
          <div class="card" style="flex:1"><div class="stat-label">Total Value</div><div class="stat-value mt-4" id="stat-total">-</div></div>
        </div>

        <div id="rec-grid"></div>
      </div>`;

    document.getElementById('rec-search')?.addEventListener('input', utils.debounce(() => renderGrid(), 250));
    document.getElementById('rec-month')?.addEventListener('change', e => { _month = e.target.value; renderGrid(); });
    document.getElementById('rec-cat')?.addEventListener('change', e => { _catFilter = e.target.value; renderGrid(); });

    loadData();
  }

  async function loadData() {
    _items = await DB.getAll('receipts');
    updateStats();
    renderGrid();
  }

  function updateStats() {
    const filtered = getFiltered();
    document.getElementById('stat-count').textContent = filtered.length;
    document.getElementById('stat-total').textContent = utils.formatCurrency(utils.sumAmount(filtered));
  }

  function getFiltered() {
    const search = document.getElementById('rec-search')?.value.toLowerCase() || '';
    return _items.filter(r => {
      if (_month && !(r.date||'').startsWith(_month)) return false;
      if (_catFilter && r.category !== _catFilter) return false;
      if (search && !(r.filename||'').toLowerCase().includes(search) && !(r.description||'').toLowerCase().includes(search)) return false;
      return true;
    });
  }

  function renderGrid() {
    updateStats();
    const items = getFiltered().sort((a,b) => (b.date||'') < (a.date||'') ? -1 : 1);
    const el = document.getElementById('rec-grid');
    if (!el) return;

    if (!items.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" width="32" height="32"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="1.5"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div><div class="empty-title">No receipts found</div><div class="empty-description">${_items.length===0?'Upload your first receipt to get started.':'No receipts match your current filter.'}</div>${_items.length===0?'<button class="btn btn-primary" onclick="window.MF.Pages.receipts.openUpload()">Upload Receipt</button>':''}</div>`;
      return;
    }

    el.innerHTML = `<div class="receipt-grid">${items.map(r => receiptCard(r)).join('')}</div>`;
  }

  function receiptCard(r) {
    const cat = utils.getCategory(r.category);
    const isPDF = r.fileType === 'application/pdf';
    const thumb = r.thumbnail
      ? `<img src="${r.thumbnail}" alt="${utils.escape(r.filename)}" style="width:100%;height:100%;object-fit:cover">`
      : isPDF
        ? `<div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-2);color:var(--color-error)">${pdfIcon()}<span style="font-size:11px;font-weight:600">PDF</span></div>`
        : `<div style="display:flex;align-items:center;justify-content:center;color:var(--color-text-tertiary)">${docIcon()}</div>`;

    return `<div class="receipt-card" onclick="window.MF.Pages.receipts.preview(${r.id})">
      <div class="receipt-thumbnail ${isPDF&&!r.thumbnail?'pdf':''}" style="height:140px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--color-bg)">
        ${thumb}
      </div>
      <div class="receipt-info">
        <div class="receipt-name" title="${utils.escape(r.filename)}">${utils.escape(r.filename)}</div>
        <div class="receipt-meta">${cat.emoji} ${cat.label} · ${utils.formatDate(r.date,'short')}</div>
        ${r.amount ? `<div style="font-size:var(--text-sm);font-weight:var(--font-semibold);color:var(--color-text-primary);margin-top:4px">${utils.formatCurrency(r.amount)}</div>` : ''}
        <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2)">
          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();window.MF.Pages.receipts.download(${r.id})" title="Download">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M5 8l3 3 3-3M2 13h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();window.MF.Pages.receipts.deleteItem(${r.id})" style="color:var(--color-error)" title="Delete">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }

  function openUpload() {
    const modalId = `modal-${Date.now()}`;
    const { modal, close } = Modal.open({
      id: modalId,
      title: 'Upload Receipt',
      body: `
        <div class="upload-zone" id="upload-zone">
          <input type="file" id="file-input" accept="image/*,.pdf" multiple>
          <div class="upload-zone-icon">${uploadIcon()}</div>
          <div class="upload-zone-title">Click or drag & drop</div>
          <div class="upload-zone-hint">JPG, PNG, PDF up to 10 MB each</div>
        </div>
        <div id="file-preview" style="display:none;margin-top:var(--space-4)">
          <div id="file-preview-info" style="padding:var(--space-3);background:var(--color-bg);border-radius:var(--radius-md);font-size:var(--text-sm);margin-bottom:var(--space-4)"></div>
        </div>
        <div class="form-row" id="receipt-meta" style="display:none">
          <div class="form-group">
            <label class="form-label">Date</label>
            <input class="form-input" id="f-rec-date" type="date" value="${utils.todayISO()}">
          </div>
          <div class="form-group">
            <label class="form-label">Amount</label>
            <input class="form-input" id="f-rec-amount" type="number" min="0" step="0.01" placeholder="0.00">
          </div>
        </div>
        <div class="form-group" id="receipt-cat" style="display:none">
          <label class="form-label">Category</label>
          <select class="form-select" id="f-rec-cat">${utils.categorySelectOptions('other')}</select>
        </div>
        <div class="form-group" id="receipt-desc" style="display:none">
          <label class="form-label">Description</label>
          <input class="form-input" id="f-rec-desc" placeholder="What's this receipt for?">
        </div>`,
      footer: `
        <button class="btn btn-secondary" onclick="window.MF.Modal.close('${modalId}')">Cancel</button>
        <button class="btn btn-primary" id="f-upload-save" disabled>Upload</button>`
    });

    let selectedFiles = [];
    const zone = modal.querySelector('#upload-zone');
    const input = modal.querySelector('#file-input');
    const saveBtn = modal.querySelector('#f-upload-save');

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('dragover');
      handleFiles(Array.from(e.dataTransfer.files));
    });
    input.addEventListener('change', () => handleFiles(Array.from(input.files)));

    function handleFiles(files) {
      selectedFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
      if (!selectedFiles.length) { Toast.warning('Files must be under 10 MB'); return; }
      const preview = modal.querySelector('#file-preview');
      const info = modal.querySelector('#file-preview-info');
      preview.style.display = 'block';
      info.innerHTML = selectedFiles.map(f => `<div style="display:flex;justify-content:space-between"><span>📎 ${utils.escape(f.name)}</span><span style="color:var(--color-text-tertiary)">${utils.formatBytes(f.size)}</span></div>`).join('');
      ['#receipt-meta','#receipt-cat','#receipt-desc'].forEach(s => modal.querySelector(s).style.display = '');
      saveBtn.disabled = false;
    }

    saveBtn.addEventListener('click', async () => {
      if (!selectedFiles.length) return;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner spinner-sm"></span> Uploading…';
      const date = modal.querySelector('#f-rec-date').value;
      const amount = modal.querySelector('#f-rec-amount').value;
      const category = modal.querySelector('#f-rec-cat').value;
      const description = modal.querySelector('#f-rec-desc').value.trim();

      for (const file of selectedFiles) {
        const data = await utils.fileToBase64(file);
        const thumbnail = await utils.imageToThumb(file);
        await DB.add('receipts', { filename: file.name, fileType: file.type, data, thumbnail, date, amount: parseFloat(amount)||0, category, description });
      }

      Toast.success(`${selectedFiles.length} receipt${selectedFiles.length>1?'s':''} uploaded`);
      close();
      await loadData();
    });
  }

  async function preview(id) {
    const r = await DB.get('receipts', id);
    if (!r) return;

    const isImg = r.fileType?.startsWith('image/');
    const isPDF = r.fileType === 'application/pdf';

    Modal.open({
      title: r.filename,
      body: `
        <div style="text-align:center">
          ${isImg ? `<img src="${r.data}" alt="${utils.escape(r.filename)}" style="max-width:100%;max-height:60vh;border-radius:var(--radius-md);object-fit:contain">` :
            isPDF ? `<div style="text-align:center;padding:var(--space-8);color:var(--color-text-secondary)"><div style="font-size:64px;margin-bottom:var(--space-4)">📄</div><p>PDF Preview not available in browser.<br>Click Download to open.</p></div>` :
            '<div class="text-secondary" style="text-align:center;padding:var(--space-8)">Cannot preview this file type</div>'}
        </div>
        <div class="divider"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          ${r.date   ? `<div><div class="stat-label">Date</div><div style="font-size:var(--text-sm);margin-top:4px">${utils.formatDate(r.date,'long')}</div></div>` : ''}
          ${r.amount ? `<div><div class="stat-label">Amount</div><div style="font-size:var(--text-sm);margin-top:4px;font-weight:600">${utils.formatCurrency(r.amount)}</div></div>` : ''}
          ${r.category ? `<div><div class="stat-label">Category</div><div style="margin-top:4px">${utils.categoryBadge(r.category)}</div></div>` : ''}
          ${r.description ? `<div><div class="stat-label">Description</div><div style="font-size:var(--text-sm);margin-top:4px">${utils.escape(r.description)}</div></div>` : ''}
        </div>`,
      footer: `<button class="btn btn-secondary" onclick="window.MF.Pages.receipts.download(${id})">Download</button><button class="btn btn-ghost" onclick="window.MF.Modal.closeAll()">Close</button>`
    });
  }

  async function download(id) {
    const r = await DB.get('receipts', id);
    if (!r) return;
    const a = document.createElement('a');
    a.href = r.data; a.download = r.filename; a.click();
  }

  async function deleteItem(id) {
    const ok = await Modal.confirm({ title: 'Delete Receipt', message: 'Remove this receipt? This cannot be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    await DB.remove('receipts', id);
    Toast.success('Receipt deleted');
    await loadData();
  }

  function uploadIcon() { return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M33 25v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6M27 14l-7-7-7 7M20 7v18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
  function pdfIcon()    { return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 4h12l8 8v16a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" stroke-width="1.5"/><path d="M20 4v8h8" stroke="currentColor" stroke-width="1.5"/></svg>`; }
  function docIcon()    { return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M8 5h16l10 10v20a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2z" stroke="currentColor" stroke-width="1.5"/><path d="M24 5v10h10M14 22h12M14 28h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`; }

  return { render, openUpload, preview, download, deleteItem };
})();
