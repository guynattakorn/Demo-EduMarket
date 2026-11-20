(function () {
  const STORAGE_KEY = 'edu-marketplace-classroom-v2';
  let isSyncing = false;
  let syncTimeout = null;
  let dbStatus = { status: 'checking', database: 'unknown' };

  // A brand-new browser/phone has no local copy yet. The React app writes its built-in
  // sample data to localStorage right away; that sample must NOT be pushed over the real
  // server data. Pushes stay blocked until the first server copy has been loaded.
  let bootstrapping = !localStorage.getItem(STORAGE_KEY);
  let failedValue = null; // last value that could not be pushed (offline) — retried later
  let lastLocalWriteAt = 0;
  let skipNextPush = false; // set by the app right before it stores a state pulled from the server

  function pushState(value) {
    let state;
    try {
      state = JSON.parse(value);
    } catch (e) {
      return;
    }
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    })
      .then((r) => r.json())
      .then(() => {
        if (failedValue === value) failedValue = null;
        updateBadgeStatus(true);
      })
      .catch((err) => {
        console.warn('[SyncBridge] Sync error:', err.message);
        failedValue = value;
        updateBadgeStatus(false);
      });
  }

  // 1. Intercept localStorage.setItem for automatic two-way sync
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    originalSetItem(key, value);
    if (key === STORAGE_KEY && !isSyncing) {
      if (skipNextPush) {
        skipNextPush = false;
        return;
      }
      if (bootstrapping) return;
      lastLocalWriteAt = Date.now();
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        syncTimeout = null;
        pushState(value);
      }, 400);
    }
  };

  // 2. Initial state sync from Database if localStorage is empty
  async function initDatabaseSync() {
    try {
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        dbStatus = await healthRes.json();
      }
    } catch (e) {
      dbStatus = { status: 'offline', database: 'local_storage' };
    }

    publishStatus();

    // First visit on this device: load the server copy, then reload so React picks it up.
    if (bootstrapping) {
      try {
        const stateRes = await fetch('/api/state');
        if (stateRes.ok) {
          const state = await stateRes.json();
          isSyncing = true;
          originalSetItem(STORAGE_KEY, JSON.stringify(state));
          isSyncing = false;
          // Reload page to let React pick up the initial state
          window.location.reload();
          return;
        }
      } catch (e) {
        console.warn('[SyncBridge] Could not fetch initial state:', e);
      }
      // Server unreachable: work locally; local changes are pushed once it is back.
      bootstrapping = false;
    }
  }

  // 3. Database status (no floating badge on screen any more — Phase 1).
  //    The admin page reads window.__EDUMARKET_DB_STATUS__ and can trigger a pull via window.EduMarketSync.
  function publishStatus(extra) {
    dbStatus = Object.assign({}, dbStatus, extra || {});
    window.__EDUMARKET_DB_STATUS__ = dbStatus;
    try {
      window.dispatchEvent(new CustomEvent('edumarket:db-status', { detail: dbStatus }));
    } catch (e) {}
  }

  async function pullFromServer() {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const freshState = await res.json();
    isSyncing = true;
    originalSetItem(STORAGE_KEY, JSON.stringify(freshState));
    isSyncing = false;
    window.location.reload();
  }

  /** Server copy without touching localStorage (the app merges it in place, no reload). */
  async function fetchServerState() {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  /** True while a local change is waiting to reach the server — never pull over it. */
  function hasPendingChanges() {
    return bootstrapping || Boolean(syncTimeout) || Boolean(failedValue) || Date.now() - lastLocalWriteAt < 2500;
  }

  // Retry a push that failed while offline.
  function retryFailed() {
    if (!failedValue) return;
    pushState(localStorage.getItem(STORAGE_KEY) || failedValue);
  }
  window.addEventListener('online', retryFailed);
  setInterval(retryFailed, 15000);

  function updateBadgeStatus(success) {
    publishStatus({ lastSyncOk: Boolean(success), lastSyncAt: new Date().toISOString() });
  }

  window.EduMarketSync = {
    getStatus: function () {
      return dbStatus;
    },
    pullFromServer: pullFromServer,
    fetchServerState: fetchServerState,
    hasPendingChanges: hasPendingChanges,
    skipNextPush: function () {
      skipNextPush = true;
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDatabaseSync);
  } else {
    initDatabaseSync();
  }
})();
