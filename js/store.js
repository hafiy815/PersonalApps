window.MF = window.MF || {};

window.MF.Store = (() => {
  const state = {
    theme: localStorage.getItem('mf_theme') || 'light',
    currency: localStorage.getItem('mf_currency') || 'MYR',
    currentPage: 'dashboard',
    commitments: [],
    expenses: [],
    receipts: [],
    loading: {}
  };

  const listeners = {};

  function emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data));
    (listeners['*'] || []).forEach(fn => fn(event, data));
  }

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return () => { listeners[event] = listeners[event].filter(f => f !== fn); };
  }

  function get(key) {
    return key ? state[key] : { ...state };
  }

  function set(key, value) {
    const old = state[key];
    state[key] = value;
    if (old !== value) emit('change:' + key, value);
    emit('change', { key, value, old });
  }

  function setLoading(key, val) {
    state.loading = { ...state.loading, [key]: val };
    emit('loading', state.loading);
  }

  function isLoading(key) {
    return !!state.loading[key];
  }

  return { get, set, on, emit, setLoading, isLoading };
})();
