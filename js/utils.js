window.MF = window.MF || {};

window.MF.utils = (() => {
  const CATEGORIES = [
    { id: 'housing',       label: 'Housing',       emoji: '🏠', color: '#f97316' },
    { id: 'utilities',     label: 'Utilities',     emoji: '⚡', color: '#3b82f6' },
    { id: 'food',          label: 'Food & Dining',  emoji: '🍔', color: '#10b981' },
    { id: 'transport',     label: 'Transport',     emoji: '🚗', color: '#8b5cf6' },
    { id: 'subscriptions', label: 'Subscriptions', emoji: '📱', color: '#f43f5e' },
    { id: 'insurance',     label: 'Insurance',     emoji: '🛡️', color: '#f59e0b' },
    { id: 'healthcare',    label: 'Healthcare',    emoji: '❤️', color: '#06b6d4' },
    { id: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#ec4899' },
    { id: 'education',     label: 'Education',     emoji: '📚', color: '#6366f1' },
    { id: 'shopping',      label: 'Shopping',      emoji: '🛍️', color: '#14b8a6' },
    { id: 'savings',       label: 'Savings',       emoji: '💰', color: '#84cc16' },
    { id: 'sport',         label: 'Sport',         emoji: '⚽', color: '#0ea5e9' },
    { id: 'fuel',          label: 'Fuel',          emoji: '⛽', color: '#f97316' },
    { id: 'parking',       label: 'Parking',       emoji: '🅿️', color: '#64748b' },
    { id: 'toll',          label: 'Toll',          emoji: '🛣️', color: '#a855f7' },
    { id: 'other',         label: 'Other',         emoji: '📦', color: '#6b7280' }
  ];

  function getCurrency() {
    return localStorage.getItem('mf_currency') || 'MYR';
  }
  function getCurrencySymbol() {
    const symbols = { USD: '$', EUR: '€', GBP: '£', MYR: 'RM', SGD: 'S$', AUD: 'A$', JPY: '¥' };
    return symbols[getCurrency()] || getCurrency();
  }

  function formatCurrency(amount, opts = {}) {
    const num = parseFloat(amount) || 0;
    const sym = getCurrencySymbol();
    const formatted = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sign = num < 0 && !opts.unsigned ? '-' : '';
    return `${sign}${sym} ${formatted}`;
  }

  function formatDate(dateStr, format = 'medium') {
    if (!dateStr) return '-';
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d)) return '-';
    if (format === 'short') return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    if (format === 'long')  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    if (format === 'month') return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (format === 'mon')   return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatRelativeDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0)  return 'Today';
    if (diff === 1)  return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1 && diff < 8) return `In ${diff} days`;
    if (diff < 0)   return `${Math.abs(diff)} days ago`;
    return formatDate(dateStr, 'short');
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function monthISO(offsetMonths = 0) {
    const d = new Date();
    d.setMonth(d.getMonth() + offsetMonths, 1);
    // Use local date components — toISOString() is UTC and returns wrong month for UTC+8 timezones
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function isOverdue(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T23:59:59');
    return d < new Date();
  }

  function isDueSoon(dateStr, days = 7) {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    const now = new Date(); now.setHours(0,0,0,0);
    const diff = (d - now) / 86400000;
    return diff >= 0 && diff <= days;
  }

  function getCategory(id) {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
  }

  function categoryBadge(catId) {
    const cat = getCategory(catId);
    return `<span class="category-pill" style="background:${cat.color}22;color:${cat.color}">${cat.emoji} ${cat.label}</span>`;
  }

  function categorySelectOptions(selected = '') {
    return CATEGORIES.map(c =>
      `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${c.emoji} ${c.label}</option>`
    ).join('');
  }

  function groupByMonth(items, dateField = 'date') {
    const groups = {};
    items.forEach(item => {
      const key = (item[dateField] || '').slice(0, 7);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }

  function sumAmount(items) {
    return items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  }

  function escape(str) {
    return String(str).replace(/[&<>"']/g, m =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );
  }

  function debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function generateCSV(headers, rows) {
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  }

  function downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function last6Months() {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      months.push(monthISO(-i));
    }
    return months;
  }

  function imageToThumb(file, size = 200) {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(size / img.width, size / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  return {
    CATEGORIES, getCurrency, getCurrencySymbol, formatCurrency, formatDate, formatRelativeDate,
    todayISO, monthISO, isOverdue, isDueSoon, getCategory, categoryBadge, categorySelectOptions,
    groupByMonth, sumAmount, escape, debounce, generateCSV, downloadFile, last6Months,
    imageToThumb, fileToBase64, formatBytes
  };
})();
