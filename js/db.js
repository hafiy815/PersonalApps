window.MF = window.MF || {};

window.MF.DB = (() => {
  const DB_NAME = 'myfinance_db';
  const DB_VERSION = 3;
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) { resolve(_db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = e => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('commitments')) {
          const cs = db.createObjectStore('commitments', { keyPath: 'id', autoIncrement: true });
          cs.createIndex('dueDate', 'dueDate');
          cs.createIndex('category', 'category');
          cs.createIndex('paid', 'paid');
        }

        if (!db.objectStoreNames.contains('expenses')) {
          const es = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
          es.createIndex('date', 'date');
          es.createIndex('category', 'category');
        }

        if (!db.objectStoreNames.contains('receipts')) {
          const rs = db.createObjectStore('receipts', { keyPath: 'id', autoIncrement: true });
          rs.createIndex('date', 'date');
          rs.createIndex('category', 'category');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // v2: Debt tracker
        if (!db.objectStoreNames.contains('debts')) {
          const ds = db.createObjectStore('debts', { keyPath: 'id', autoIncrement: true });
          ds.createIndex('lender', 'lender');
          ds.createIndex('settled', 'settled');
          ds.createIndex('date', 'date');
        }

        // v3: Budget planner — keyPath is 'category' (one budget limit per category)
        if (!db.objectStoreNames.contains('budgets')) {
          db.createObjectStore('budgets', { keyPath: 'category' });
        }
      };

      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror = e => reject(e.target.error);
    });
  }

  function tx(storeName, mode = 'readonly') {
    return _db.transaction(storeName, mode).objectStore(storeName);
  }

  function getAll(storeName) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx(storeName).getAll();
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    }));
  }

  function get(storeName, id) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx(storeName).get(id);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    }));
  }

  function add(storeName, data) {
    return open().then(() => new Promise((resolve, reject) => {
      const item = { ...data, createdAt: Date.now(), updatedAt: Date.now() };
      const req = tx(storeName, 'readwrite').add(item);
      req.onsuccess = e => resolve({ ...item, id: e.target.result });
      req.onerror = e => reject(e.target.error);
    }));
  }

  function update(storeName, data) {
    return open().then(() => new Promise((resolve, reject) => {
      const item = { ...data, updatedAt: Date.now() };
      const req = tx(storeName, 'readwrite').put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = e => reject(e.target.error);
    }));
  }

  function remove(storeName, id) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx(storeName, 'readwrite').delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = e => reject(e.target.error);
    }));
  }

  function getSetting(key) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx('settings').get(key);
      req.onsuccess = e => resolve(e.target.result ? e.target.result.value : null);
      req.onerror = e => reject(e.target.error);
    }));
  }

  function setSetting(key, value) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx('settings', 'readwrite').put({ key, value });
      req.onsuccess = () => resolve(value);
      req.onerror = e => reject(e.target.error);
    }));
  }

  return { open, getAll, get, add, update, remove, getSetting, setSetting };
})();
