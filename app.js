function reportBootError(message) {
  console.warn('App startup note:', message);
  const box = document.getElementById('loginError'),
    status = document.getElementById('authStatus');
  if (box && message) {
    box.textContent = message;
    box.classList.add('show');
  }
  if (status) {
    status.textContent = 'Secure sign-in active';
    status.className = 'auth-status';
  }
}
/* The app also works inside sandboxed previews where browser STORE is unavailable. */
const STORE = (() => {
  try {
    const t = '__ars_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch (e) {
    const memory = new Map();
    return {
      getItem: k => memory.has(k) ? memory.get(k) : null,
      setItem: (k, v) => memory.set(k, String(v)),
      removeItem: k => memory.delete(k)
    };
  }
})();
window.STORE = STORE;
var farmId = STORE.getItem('arswine-active-farm') || 'farm-ars';
window.farmId = farmId;

// Synchronously grant access if authenticated session exists
if (STORE.getItem('ars-auth') === '1') {
  document.body.classList.add('farm-access-granted');
  window.currentFarmAssigned = true;
  const curEmail = (STORE.getItem('ars-current-email') || '').toLowerCase();
  if (curEmail === 'arswinetech@gmail.com') {
    window.platformAdminVerified = true;
    window.myFarmRole = 'platform';
  }
}
/* [REBUILD] The original pinned all date math to a hardcoded TODAY = '2026-07-21' (demo snapshot).
   A working copy needs the real clock; seed data still renders sensible dashboards. */
const TODAY = new Date().toISOString().slice(0, 10),
  d = s => {
    if (!s) return new Date();
    const str = String(s).trim();
    if (str.includes('T')) return new Date(str);
    return new Date(str + 'T00:00:00');
  },
  days = (a, b = TODAY) => {
    const da = d(a), db = d(b);
    if (isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
    return Math.round((db - da) / 864e5);
  },
  esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
  peso = x => new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(x || 0),
  isoOff = n => {
    let x = d(TODAY);
    x.setDate(x.getDate() + n);
    return x.toISOString().slice(0, 10);
  };
// Offline-first local database: durable IndexedDB snapshot plus the lightweight UI store.
const DEVICE_DB_NAME = 'arswinetech-device',
  DEVICE_STORE = 'snapshots',
  DEVICE_KEY = 'farm-data-v1';

function deviceDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DEVICE_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DEVICE_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error)
  })
}
async function deviceRead() {
  try {
    const db = await deviceDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DEVICE_STORE, 'readonly');
      const r = tx.objectStore(DEVICE_STORE).get(DEVICE_KEY);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error)
    })
  } catch (e) {
    return null
  }
}
async function deviceWrite(value) {
  try {
    const db = await deviceDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DEVICE_STORE, 'readwrite');
      tx.objectStore(DEVICE_STORE).put(value, DEVICE_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    console.warn('Offline device database unavailable', e)
  }
}
const seeds = {
  'farm-ars': {
    name: 'ARS Demo Farm · Ocampo',
    sows: [{
      id: 'S-001',
      name: 'Bella',
      sire: 'Thor',
      breed: 'Large White',
      dob: '2023-02-10',
      parity: 3,
      insemination: '2026-04-13',
      vaccine: 'Parvo',
      vaccineDate: '2026-05-12',
      notes: 'Good body condition'
    }, {
      id: 'S-002',
      name: 'Maya',
      sire: 'Atlas',
      breed: 'Landrace',
      dob: '2022-11-06',
      parity: 4,
      insemination: '2026-04-20'
    }, {
      id: 'S-003',
      name: 'Luna',
      sire: 'Thor',
      breed: 'Duroc',
      dob: '2023-05-14',
      parity: 2,
      insemination: '2026-05-04'
    }, {
      id: 'S-004',
      name: 'Daisy',
      sire: 'Apollo',
      breed: 'Yorkshire',
      dob: '2022-08-21',
      parity: 5,
      insemination: '2026-03-25'
    }, {
      id: 'S-005',
      name: 'Ginger',
      sire: 'Atlas',
      breed: 'Landrace',
      dob: '2024-03-08',
      parity: 1
    }],
    piglets: [{
      id: 'B-2601',
      sow: 'Bella',
      sire: 'Thor',
      semen: 'TH-245',
      birth: '2026-06-16',
      males: 6,
      females: 5,
      iron: false,
      castration: false,
      weaning: false,
      notes: ''
    }, {
      id: 'B-2602',
      sow: 'Maya',
      sire: 'Atlas',
      semen: 'AT-611',
      birth: '2026-07-02',
      males: 5,
      females: 6,
      iron: false,
      castration: false,
      weaning: false,
      notes: ''
    }, {
      id: 'B-2518',
      sow: 'Daisy',
      sire: 'Apollo',
      semen: 'AP-928',
      birth: '2026-05-30',
      males: 7,
      females: 5,
      iron: true,
      castration: true,
      weaning: false,
      notes: ''
    }],
    feed: [{
      type: 'Pre Starter',
      bags: 18,
      price: 1380
    }, {
      type: 'Starter',
      bags: 24,
      price: 1320
    }, {
      type: 'Grower',
      bags: 38,
      price: 1250
    }, {
      type: 'Finisher',
      bags: 15,
      price: 1230
    }, {
      type: 'Gestating',
      bags: 10,
      price: 1400
    }, {
      type: 'Lactating',
      bags: 13,
      price: 1450
    }],
    semen: [{
      boar: 'Thor',
      breed: 'Duroc',
      collection: '2026-07-14',
      expiration: '2026-07-25',
      bottles: 8
    }, {
      boar: 'Atlas',
      breed: 'Landrace',
      collection: '2026-07-17',
      expiration: '2026-07-31',
      bottles: 12
    }],
    transactions: [{
      date: '2026-07-04',
      type: 'Income',
      category: 'Piglet Sales',
      description: 'Batch B-2512',
      amount: 28600,
      paid: 22000
    }, {
      date: '2026-07-08',
      type: 'Expense',
      category: 'Feed',
      description: 'Grower feed delivery',
      amount: 11250,
      paid: 11250
    }, {
      date: '2026-07-12',
      type: 'Income',
      category: 'Hog Sales',
      description: '4 heads',
      amount: 43200,
      paid: 43200
    }, {
      date: '2026-07-17',
      type: 'Expense',
      category: 'Medicine',
      description: 'Vaccines',
      amount: 3800,
      paid: 3800
    }],
    sales: [{
      date: '2026-07-12',
      product: 'Market Hog × 4',
      qty: 4,
      total: 43200,
      paid: 43200,
      is_returned: false
    }, {
      date: '2026-07-04',
      product: 'Piglet batch B-2512',
      qty: 11,
      total: 28600,
      paid: 22000,
      is_returned: false
    }],
    reminders: [{
      title: 'Clean water lines',
      type: 'Weekly',
      schedule: 'Every Monday',
      active: true
    }, {
      title: 'Order Gestating feed',
      type: 'One Time',
      schedule: '2026-07-23',
      active: true
    }, {
      title: 'Check generator',
      type: 'Interval',
      schedule: 'Every 12 hours',
      active: true
    }]
  },
  'farm-sample': {
    name: 'San Isidro Hog Farm',
    sows: [{
      id: 'SI-01',
      name: 'Rosa',
      sire: 'Max',
      breed: 'Large White',
      dob: '2023-06-04',
      parity: 2,
      insemination: '2026-04-25'
    }],
    piglets: [{
      id: 'SI-B1',
      sow: 'Rosa',
      sire: 'Max',
      semen: 'MX-10',
      birth: '2026-06-01',
      males: 4,
      females: 4,
      iron: true,
      castration: true,
      weaning: false
    }],
    feed: [{
      type: 'Starter',
      bags: 9,
      price: 1300
    }, {
      type: 'Grower',
      bags: 16,
      price: 1200
    }],
    semen: [],
    transactions: [],
    sales: [],
    reminders: []
  }
}

function sanitizeFarm(f) {
  if (!f || typeof f !== 'object') return;
  if (!Array.isArray(f.sows)) f.sows = [];
  if (!Array.isArray(f.piglets)) f.piglets = [];
  if (!Array.isArray(f.feed)) f.feed = [];
  if (!Array.isArray(f.semen)) f.semen = [];
  if (!Array.isArray(f.transactions)) f.transactions = [];
  if (!Array.isArray(f.sales)) f.sales = [];
  if (!Array.isArray(f.reminders)) f.reminders = [];
  if (!Array.isArray(f.medicines)) f.medicines = [];
  if (!Array.isArray(f.vaccinations)) f.vaccinations = [];
  if (!Array.isArray(f.reservations)) f.reservations = [];
  if (!Array.isArray(f.semenSales)) f.semenSales = [];
  if (!Array.isArray(f.semenResellers)) f.semenResellers = [];
  if (!Array.isArray(f.semenResellerTx)) f.semenResellerTx = [];
  if (!Array.isArray(f.feedTrials)) f.feedTrials = [];
  if (!Array.isArray(f.feedOrders)) f.feedOrders = [];
  if (!Array.isArray(f.boars)) f.boars = [];
  if (!Array.isArray(f.barns)) f.barns = [];
  if (!Array.isArray(f.movements)) f.movements = [];
  if (!Array.isArray(f.rfid_tags)) f.rfid_tags = [];
  if (!Array.isArray(f.rfid_scans)) f.rfid_scans = [];
  if (!Array.isArray(f.breedingRecords)) f.breedingRecords = [];
  if (!Array.isArray(f.pigletLedger)) f.pigletLedger = [];
  if (!Array.isArray(f.heatRecords)) f.heatRecords = [];
  if (!Array.isArray(f.treatments)) f.treatments = [];
  if (!Array.isArray(f.med_movements)) f.med_movements = [];
  if (!Array.isArray(f.vaccination_events)) f.vaccination_events = [];
  if (!Array.isArray(f.vaxSchedules)) f.vaxSchedules = [];
  if (!Array.isArray(f.vetCatalog)) f.vetCatalog = [];
  if (!Array.isArray(f.marketQuotes)) f.marketQuotes = [];

  // Consolidate duplicate feed types into clean, unique inventory items
  if (Array.isArray(f.feed) && f.feed.length > 1) {
    const feedMap = new Map();
    f.feed.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const type = String(item.type || item.feed_name || item.name || '').trim();
      if (!type) return;
      const key = type.toLowerCase();
      if (!feedMap.has(key)) {
        feedMap.set(key, {
          id: item.id || `feed-${key.replace(/[^a-z0-9]/g, '-')}`,
          type: type,
          bags: +item.bags || 0,
          price: +item.price || 0
        });
      } else {
        const existing = feedMap.get(key);
        // If duplicate was created with 0 price or duplicate bags, preserve valid price and count
        if (item.price && (!existing.price || existing.price === 0)) {
          existing.price = +item.price;
        }
        if (item.bags && existing.bags === 0) {
          existing.bags = +item.bags;
        }
      }
    });
    f.feed = Array.from(feedMap.values());
  }
}

function purgeDemoSeedsFromFarm(f) {
  if (!f || typeof f !== 'object') return;
  const demoSowIds = new Set(['S-001', 'S-002', 'S-003', 'S-004', 'S-005']);
  const demoSowNames = new Set(['Bella', 'Maya', 'Luna', 'Daisy', 'Ginger']);
  const demoLitterIds = new Set(['B-2601', 'B-2602', 'B-2518']);

  if (Array.isArray(f.sows)) {
    const seen = new Set();
    f.sows = f.sows.filter(s => {
      if (!s || typeof s !== 'object') return false;
      const sName = String(s.name || s.id || '').toLowerCase();
      // Purge automated test sows
      if (sName.includes('verify sow') || sName.includes('live sync') || sName.includes('lint verify') || sName.includes('test sow') || sName.includes('e2e live') || sName.includes('e2e ')) {
        return false;
      }
      if (demoSowIds.has(s.id) && demoSowNames.has(s.name)) {
        return false;
      }
      // Deduplicate sows strictly by unique name or ID
      const key = String(s.id || s.name || '').trim().toLowerCase();
      if (key && seen.has(key)) return false;
      if (key) seen.add(key);
      return true;
    });
  }

  if (Array.isArray(f.piglets)) {
    f.piglets = f.piglets.filter(b => !(b && demoLitterIds.has(b.id)));
  }
}

async function cleanTestRecordsAction() {
  const f = F();
  if (!f) return;
  const beforeCount = (f.sows || []).length;
  purgeDemoSeedsFromFarm(f);
  const afterCount = (f.sows || []).length;
  save();
  if (window.ARSCloud && typeof ARSCloud.cleanCloudTestRecords === 'function' && farmId) {
    await ARSCloud.cleanCloudTestRecords(farmId).catch(() => {});
  }
  renderAll();
  if (window.refreshOpenDrilldown) window.refreshOpenDrilldown();
  toast(`✓ Cleaned ${beforeCount - afterCount} test records. ${afterCount} real sows active.`);
}
window.cleanTestRecordsAction = cleanTestRecordsAction;

function unifyAndRestoreRealHerd() {
  if (!DB || typeof DB !== 'object') return;
  const primaryId = 'ab814123-2498-4af3-9a41-616f293b15f4';

  if (!DB[primaryId]) {
    DB[primaryId] = {
      name: "RM's Hog Farm",
      sows: [], piglets: [], feed: [], semen: [], transactions: [], sales: [],
      reminders: [], medicines: [], vaccinations: [], reservations: [],
      semenSales: [], semenResellers: [], semenResellerTx: [], feedTrials: [], feedOrders: [],
      boars: [], barns: [], movements: [], rfid_tags: [], rfid_scans: [],
      breedingRecords: [], pigletLedger: [], heatRecords: [], treatments: [],
      med_movements: [], vaccination_events: [], vaxSchedules: [], vetCatalog: [], marketQuotes: [],
      deleted_ids: []
    };
  }

  const primary = DB[primaryId];
  primary.name = "RM's Hog Farm";
  primary.deleted_ids = primary.deleted_ids || [];
  const deletedSet = new Set(primary.deleted_ids.map(id => String(id).trim().toLowerCase()));

  const keys = [
    'sows', 'piglets', 'feed', 'semen', 'transactions', 'sales', 'reminders',
    'medicines', 'vaccinations', 'reservations', 'semenSales', 'semenResellers',
    'semenResellerTx', 'feedTrials', 'feedOrders', 'boars', 'barns', 'movements',
    'rfid_tags', 'rfid_scans', 'breedingRecords', 'pigletLedger', 'heatRecords',
    'treatments', 'med_movements', 'vaccination_events', 'vaxSchedules', 'vetCatalog', 'marketQuotes'
  ];

  const getUniqueKey = (item, entityKey) => {
    if (!item || typeof item !== 'object') return '';
    if (entityKey === 'reservations') {
      return String(item.no || item.id || (item.customer + ':::' + item.date + ':::' + item.quantity + ':::' + item.batch_id)).trim().toLowerCase();
    }
    if (entityKey === 'feed') {
      return String(item.id || item.type || item.feed_name || item.name || '').trim().toLowerCase();
    }
    return String(item.id || item.no || item.tag || item.code || item.name || '').trim().toLowerCase();
  };

  // Clean out any tombstoned records from primary collections first
  keys.forEach(k => {
    if (Array.isArray(primary[k])) {
      primary[k] = primary[k].filter(item => {
        if (!item || typeof item !== 'object') return false;
        const key = getUniqueKey(item, k);
        const rawId = String(item.id || item.name || '').trim().toLowerCase();
        return !deletedSet.has(key) && !(rawId && deletedSet.has(rawId));
      });
    }
  });

  // Safely merge records from 'farm-ars' or any other local bucket into primary
  Object.keys(DB).forEach(fId => {
    if (fId === primaryId) return;
    const source = DB[fId];
    if (!source || typeof source !== 'object') return;

    keys.forEach(k => {
      if (Array.isArray(source[k]) && source[k].length > 0) {
        if (!Array.isArray(primary[k])) primary[k] = [];

        const primaryKeys = new Set(primary[k].map(item => getUniqueKey(item, k)).filter(Boolean));

        source[k].forEach(srcItem => {
          if (!srcItem || typeof srcItem !== 'object') return;
          const sKey = getUniqueKey(srcItem, k);
          const rawId = String(srcItem.id || srcItem.name || '').trim().toLowerCase();

          // Skip if in deleted tombstones
          if (deletedSet.has(sKey) || (rawId && deletedSet.has(rawId))) {
            return;
          }

          if (sKey) {
            if (!primaryKeys.has(sKey)) {
              primaryKeys.add(sKey);
              primary[k].push(srcItem);
            }
          } else {
            primary[k].push(srcItem);
          }
        });
      }
    });

    if (source.logo || source.logo_url) {
      if (!primary.logo) primary.logo = source.logo || source.logo_url;
      if (!primary.logo_url) primary.logo_url = source.logo_url || source.logo;
    }
    if (source.feedPlan && !primary.feedPlan) {
      primary.feedPlan = source.feedPlan;
    }
  });

  // Reconcile and recover any reservation logged in piglet ledger or transactions
  if (Array.isArray(primary.pigletLedger)) {
    const existingResKeys = new Set((primary.reservations || []).map(r => getUniqueKey(r, 'reservations')).filter(Boolean));
    primary.pigletLedger.forEach(t => {
      if (t && t.type === 'reserved' && t.customer && !['undone', 'deleted'].includes(t.status)) {
        const resKey = String(t.reservation_no || t.no || t.id || (t.customer + ':::' + (t.date || t.created_at || '').slice(0, 10) + ':::' + t.quantity + ':::' + t.batch_id)).trim().toLowerCase();
        const rawCust = String(t.customer || '').trim().toLowerCase();
        const rawNo = String(t.reservation_no || t.no || '').trim().toLowerCase();

        // Skip if in deleted tombstones
        if (deletedSet.has(resKey) || deletedSet.has(rawCust) || (rawNo && deletedSet.has(rawNo))) {
          return;
        }

        if (!existingResKeys.has(resKey)) {
          existingResKeys.add(resKey);
          primary.reservations = primary.reservations || [];
          primary.reservations.push({
            id: t.reservation_id || t.id || ('RES-' + Date.now().toString().slice(-8)),
            no: t.reservation_no || t.no || ('RES-' + (t.date || '').replace(/[^0-9]/g, '').slice(0, 8)),
            customer: t.customer,
            contact: t.contact || '',
            batch_id: t.batch_id,
            source: t.source || 'breeder',
            gender: t.gender || 'Female',
            quantity: +t.quantity || 1,
            price: +t.price || +t.unit_price || 0,
            paid: +t.paid || +t.deposit || 0,
            total: (+t.quantity || 1) * (+t.price || +t.unit_price || 0),
            balance: Math.max(0, ((+t.quantity || 1) * (+t.price || +t.unit_price || 0)) - (+t.paid || +t.deposit || 0)),
            status: t.status === 'released' ? 'released' : (t.status === 'cancelled' ? 'cancelled' : 'pending'),
            date: (t.date || t.created_at || new Date().toISOString()).slice(0, 10),
            notes: t.notes || ''
          });
        }
      }
    });
  }

  // Clean out any demo seed entries (Bella, Maya, etc.) or automated test sows (Verify Sow, Live Sync)
  purgeDemoSeedsFromFarm(primary);
  sanitizeFarm(primary);

  farmId = primaryId;
  window.farmId = primaryId;
  if (window.STORE) STORE.setItem('arswine-active-farm', primaryId);
}
window.unifyAndRestoreRealHerd = unifyAndRestoreRealHerd;

function getBestFarmId() {
  return 'ab814123-2498-4af3-9a41-616f293b15f4';
}

function load() {
  let x = STORE.getItem('arswine-db-v1');
  let data = null;
  if (x) {
    try { data = JSON.parse(x); } catch (e) { data = null; }
  }
  if (!data || typeof data !== 'object') {
    data = {};
  }
  Object.keys(data).forEach(k => {
    sanitizeFarm(data[k]);
  });
  return data;
}

var DB = load();
unifyAndRestoreRealHerd();
farmId = 'ab814123-2498-4af3-9a41-616f293b15f4';
window.farmId = farmId;

const F = () => {
  if (!DB || typeof DB !== 'object') DB = load();
  const currentId = 'ab814123-2498-4af3-9a41-616f293b15f4';
  farmId = currentId;
  window.farmId = farmId;

  if (!DB[farmId]) {
    DB[farmId] = {
      name: "RM's Hog Farm",
      sows: [], piglets: [], feed: [], semen: [], transactions: [], sales: [],
      reminders: [], medicines: [], vaccinations: [], reservations: [],
      semenSales: [], semenResellers: [], semenResellerTx: [], feedTrials: [], feedOrders: [],
      boars: [], barns: [], movements: [], rfid_tags: [], rfid_scans: [],
      breedingRecords: [], pigletLedger: [], heatRecords: [], treatments: [],
      med_movements: [], vaccination_events: [], vaxSchedules: [], vetCatalog: [], marketQuotes: []
    };
  }
  sanitizeFarm(DB[farmId]);
  return DB[farmId];
};

window.DB = DB;
window.farmId = farmId;
window.F = F;
window.sanitizeFarm = sanitizeFarm;

function dueThisWeek(f) {
  if (!f || !Array.isArray(f.sows)) return [];
  const now = d(TODAY);
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return (f.sows || []).filter(x => {
    if (!x || !x.insemination || x.farrowingDate || x.lactationStart || x.culled) return false;
    const due = d(x.insemination);
    due.setDate(due.getDate() + 114);
    const dGest = days(x.insemination);
    return (due >= start && due <= end) || dGest >= 114;
  });
}
window.dueThisWeek = dueThisWeek;

function watchlistSows(f) {
  if (!f || !Array.isArray(f.sows)) return [];
  const pregnant = (f.sows || []).filter(x => {
    if (!x || x.culled || x.culledAt || String(x.status || '').toUpperCase() === 'CULLED') return false;
    if (!x.insemination || x.farrowingDate || x.lactationStart || x.weanedAt || x.lactationEndedAt) return false;
    const st = typeof status === 'function' ? status(x) : 'Pregnant';
    return st === 'Pregnant' || (!x.farrowingDate && !x.lactationStart);
  });
  return pregnant.sort((a, b) => days(b.insemination) - days(a.insemination));
}
window.watchlistSows = watchlistSows;

const isActiveSow = x => !x.culled && !x.culledAt && String(x.status || '').toUpperCase() !== 'CULLED';

function save() {
  STORE.setItem('arswine-db-v1', JSON.stringify(DB));
  deviceWrite(DB);
  if (window.ARSCloud && ARSCloud.configured()) ARSCloud.pushFarm(farmId, F()).catch(() => {})
}

function status(s) {
  if (!s || typeof s !== 'object') return 'Open';
  if (s.culled || s.status === 'CULLED' || s.status === 'Culled') return 'Culled';
  if (s.status === 'Reheat' || s.reheatDate || s.lifecycle === 'Reheat') return 'Reheat';
  if (s.status === 'Heat' || s.lifecycle === 'Heat') return 'Heat';
  if (s.lastHeatDate && (!s.insemination || days(s.lastHeatDate) <= days(s.insemination))) return 'Heat';
  if (s.status === 'Open' && s.lifecycle === 'Weaned') return 'Open';

  let linked = (F().piglets || []).filter(b => b && (b.dam_id === s.id || b.sow_id === s.id || b.sow === s.name || b.dam === s.name)),
    hasWeaned = linked.some(b => b.weanedAt || b.weaning_date || b.status === 'Weaned' || b.weaning),
    activeLitter = linked.some(b => !b.weanedAt && !b.weaning_date && b.status !== 'Weaned' && !b.weaning && !b.archived);

  if ((s.lactationEndedAt || s.weanedAt || (!activeLitter && hasWeaned)) && !s.insemination) return 'Open';

  let lactationDate = s.farrowingDate || s.lactationStart;
  if (lactationDate && !s.weanedAt && !s.lactationEndedAt && (activeLitter || !hasWeaned)) {
    return 'Lactating';
  }

  if (!s.insemination) return 'Open';
  let n = days(s.insemination);
  if (n >= 0) return n >= 33 ? 'Pregnant' : 'Inseminated';
  return 'Open';
}

function sowClass(s) {
  let st = status(s);
  return st === 'Pregnant' ? '' : st === 'Lactating' ? 'warn' : 'dark'
}

function fmtDate(v) {
  if (!v) return '—';
  try {
    const s = String(v).trim();
    if (!s || s === 'null' || s === 'undefined' || s === '—') return '—';
    const dateObj = s.includes('T') ? new Date(s) : new Date(s + 'T00:00:00');
    if (isNaN(dateObj.getTime())) return s;
    return dateObj.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return String(v || '—');
  }
}

function permittedFarmIds() {
  if (!DB || typeof DB !== 'object') return [];
  const keys = Object.keys(DB);
  if (!keys.length) return [];
  if (typeof isSuperAdmin === 'function' && isSuperAdmin()) return keys;
  if (farmId && DB[farmId]) return [farmId];
  return keys;
}

function setFarmSelect() {
  let sel = document.getElementById('farmSelect');
  if (!sel) return;
  let allowed = permittedFarmIds();
  if (!allowed.length && DB) {
    allowed = Object.keys(DB);
  }
  sel.innerHTML = allowed.map(id => `<option value="${id}">${DB[id]?.name || 'RM\'s Hog Farm'}</option>`).join('');
  if (!allowed.includes(farmId) && allowed.length) {
    farmId = allowed[0];
    window.farmId = farmId;
    STORE.setItem('arswine-active-farm', farmId);
  }
  sel.value = farmId;
  if (DB[farmId]) {
    const lbl = document.getElementById('farmLabel');
    if (lbl) lbl.textContent = DB[farmId].name + ' · SECURE WORKSPACE';
  }
}

function switchFarm(id) {
  if (!permittedFarmIds().includes(id)) {
    toast('Access denied: this farm is not assigned to your account.');
    setFarmSelect();
    return;
  }
  farmId = id;
  STORE.setItem('arswine-active-farm', id);
  setFarmSelect();
  renderAll();
  if (window.ARSCloud && ARSCloud.configured() && farmId && ARSCloud.pullFarm) {
    ARSCloud.pullFarm(farmId).then(() => {
      if (window.renderAll) renderAll();
    }).catch(() => {});
  }
  toast('Switched secure farm workspace');
}

/* [REBUILD] Removed the original first dashboard() definition; it was dead code —
   a later declaration overrides it (function hoisting: last definition wins). */

function financeSummary(short = false) {
  let t = F().transactions,
    income = t.filter(x => x.type === 'Income').reduce((a, x) => a + x.amount, 0),
    paid = t.filter(x => x.type === 'Income').reduce((a, x) => a + x.paid, 0),
    exp = t.filter(x => x.type === 'Expense').reduce((a, x) => a + x.amount, 0);
  return `<div class="summary-row"><span>Gross sales</span><b>${peso(income)}</b></div>${!short?`<div class="summary-row"><span>Actual cash collected</span><b>${peso(paid)}</b></div><div class="summary-row"><span>Outstanding receivables</span><b>${peso(income-paid)}</b></div>`:''}<div class="summary-row"><span>Total expenses</span><b>${peso(exp)}</b></div><div class="summary-row"><b>Net profit</b><strong class="net">${peso(income-exp)}</strong></div>`
}
const configs = {
  sows: {
    title: 'Sow Management',
    key: 'sows',
    add: 'Add sow',
    fields: [
      ['id', 'Sow ID', 'text'],
      ['name', 'Sow Name', 'text'],
      ['sire', 'Sire', 'text'],
      ['dam', 'Dam', 'text'],
      ['breed', 'Breed', 'select:Large White,Landrace,Duroc,Yorkshire,Crossbred,Custom / Other Breed'],
      ['customBreed', 'Specific / custom breed', 'text'],
      ['dob', 'Date of Birth', 'date'],
      ['parity', 'Parity', 'number'],
      ['insemination', 'Insemination Date', 'date'],
      ['vaccine', 'Vaccine', 'text'],
      ['vaccineDate', 'Vaccine Date', 'date'],
      ['notes', 'Notes', 'textarea']
    ]
  },
  piglets: {
    title: 'Piglet Batches',
    key: 'piglets',
    add: 'Add batch',
    fields: [
      ['id', 'Batch ID', 'text'],
      ['sow', 'Sow', 'text'],
      ['sire', 'Sire', 'text'],
      ['semen', 'Semen', 'text'],
      ['birth', 'Birth Date', 'date'],
      ['males', 'Number of Males', 'number'],
      ['females', 'Number of Females', 'number'],
      ['notes', 'Notes', 'textarea']
    ]
  },
  feed: {
    title: 'Feed Inventory',
    key: 'feed',
    add: 'Add feed stock',
    fields: [
      ['type', 'Feed Type', 'select:Pre Starter,Starter,Grower,Finisher,Booster,Gestating,Lactating'],
      ['bags', 'Bags', 'number'],
      ['price', 'Price Per Bag', 'number']
    ]
  },
  semen: {
    title: 'Boar Semen Inventory',
    key: 'semen',
    add: 'Add semen collection',
    fields: [
      ['boar', 'Boar Name', 'text'],
      ['breed', 'Breed', 'text'],
      ['collection', 'Collection Date', 'date'],
      ['expiration', 'Expiration Date', 'date'],
      ['bottles', 'Bottles Available', 'number']
    ]
  },
  reminders: {
    title: 'Reminders',
    key: 'reminders',
    add: 'Add reminder',
    fields: [
      ['title', 'Reminder title', 'text'],
      ['type', 'Type', 'select:One Time,Daily,Weekly,Monthly,Interval'],
      ['schedule', 'Schedule', 'text']
    ]
  },
  financials: {
    title: 'Financial Management',
    key: 'transactions',
    add: 'Record transaction',
    fields: [
      ['date', 'Date', 'date'],
      ['type', 'Transaction Type', 'select:Income,Expense'],
      ['category', 'Category', 'text'],
      ['description', 'Description', 'text'],
      ['amount', 'Amount (₱)', 'number'],
      ['paid', 'Cash Collected / Paid (₱)', 'number']
    ]
  },
  pos: {
    title: 'POS Sales',
    key: 'sales',
    add: 'New sale',
    fields: [
      ['date', 'Sale Date', 'date'],
      ['product', 'Product', 'text'],
      ['qty', 'Quantity', 'number'],
      ['total', 'Total (₱)', 'number'],
      ['paid', 'Payment received (₱)', 'number']
    ]
  }
};
window.configs = configs;

function crudPage(k) {
  let c = configs[k],
    f = F(),
    data = f[c.key];
  let extra = '';
  if (k === 'feed') {
    let val = data.reduce((a, x) => a + x.bags * x.price, 0);
    /* [REBUILD FEATURE] Feeding Guide Program panel (js/feeding-guide.js). */
    extra = `<div class="notice"><b>${peso(val)}</b> total inventory value · ${data.reduce((a,x)=>a+ +x.bags,0)} bags on hand${/* [REBUILD FIX 52] feed ordering tracker entry */''}${window.feedOrdersPageBtn ? feedOrdersPageBtn() : ''}</div>` + (window.feedGuidePanel ? window.feedGuidePanel() : '')
  }
  /* [REBUILD FIX 54] POS page opens with the semen-collectibles rollup
     (per-branch balances + Receipt / 💰 Payment actions) */
  if (k === 'pos') extra = (window.posCollectiblesPanel ? posCollectiblesPanel() : '');
  if (k === 'financials') extra = `<div class="metric-grid" style="margin-bottom:16px"><div class="panel metric"><span class="muted">Gross Sales</span><b>${peso(data.filter(x=>x.type==='Income').reduce((a,x)=>a+x.amount,0))}</b></div><div class="panel metric"><span class="muted">Receivables</span><b>${peso(data.filter(x=>x.type==='Income').reduce((a,x)=>a+x.amount-x.paid,0))}</b></div><div class="panel metric"><span class="muted">Net Profit</span><b style="color:var(--ok)">${peso(data.filter(x=>x.type==='Income').reduce((a,x)=>a+x.amount,0)-data.filter(x=>x.type==='Expense').reduce((a,x)=>a+x.amount,0))}</b></div></div>`;
  let headers, rows;
  if (k === 'sows') {
    headers = ['Sow', 'Breed', 'Parity', 'Insemination', 'Status'];
    rows = data.map((x, i) => [`<b>${x.name}</b><br><small class="muted">${x.id}</small>`, x.breed || '—', x.parity ?? 'N/A', fmtDate(x.insemination), `<span class="tag ${sowClass(x)}">${status(x)}</span>`, i])
  } else if (k === 'piglets') {
    headers = ['Batch', 'Parents', 'Born', 'Total Born', 'Care status'];
    rows = data.map((x, i) => [`<b>${x.id}</b>`, `${x.sow} × ${x.sire}`, fmtDate(x.birth), `${(+x.males||0)+(+x.females||0)} (${x.males}M/${x.females}F)`, `${x.iron?'✓ Iron':'Iron'} · ${x.castration?'✓ Castration':'Castration'} · ${x.weaning?'✓ Weaned':'Weaning'}`, i])
  } else if (k === 'feed') {
    headers = ['Feed Type', 'Bags', 'Price / bag', 'Inventory value'];
    rows = data.map((x, i) => [`<b>${x.type}</b>`, x.bags, peso(x.price), `<b>${peso(x.bags*x.price)}</b>`, i])
  } else if (k === 'semen') {
    headers = ['Boar', 'Breed', 'Collected', 'Expires', 'Bottles'];
    rows = data.map((x, i) => [`<b>${x.boar}</b>`, x.breed, fmtDate(x.collection), `<span class="${days(TODAY,x.expiration)<=7?'tag warn':''}">${fmtDate(x.expiration)}</span>`, x.bottles, i])
  } else if (k === 'financials') {
    headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Collected'];
    rows = data.map((x, i) => [fmtDate(x.date), `<span class="tag ${x.type==='Expense'?'dark':''}">${x.type}</span>`, x.category, x.description, peso(x.amount), peso(x.paid), i])
  } else if (k === 'pos') {
    headers = ['Date', 'Product', 'Qty', 'Total', 'Paid', 'Status'];
    rows = data.map((x, i) => [fmtDate(x.date), x.product, x.qty, peso(x.total), peso(x.paid), `<span class="tag ${x.is_returned?'dark':''}">${x.is_returned?'RETURNED':'Completed'}</span>`, i])
  } else {
    headers = ['Reminder', 'Type', 'Schedule', 'Action'];
    rows = data.map((x, i) => [`<b>${x.title}</b>`, `<span class="tag">${x.type}</span>`, x.schedule, `<button class="btn ghost" onclick="dismiss(${i})">GOT IT · DISMISS</button>`, i])
  }
  document.getElementById(k).innerHTML = `${extra}<div class="toolbar"><div class="toolbar-left"><input class="search" placeholder="Search ${c.title.toLowerCase()}" oninput="filterTable('${k}',this.value)"></div><button class="btn" onclick="openModal('${k}')">+ ${c.add}</button></div><div class="panel table-wrap"><table class="table" id="table-${k}"><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(r=>`<tr>${r.slice(0,-1).map(x=>`<td>${x}</td>`).join('')}<td class="right">${k==='sows'?`<button class="btn ghost" onclick="openSowProfile(${r.at(-1)})">Profile</button> `:''}<button class="btn ghost" onclick="editRecord('${k}',${r.at(-1)})">Edit</button> <button class="btn ghost delete-action" onclick="deleteRecord('${k}',${r.at(-1)})">Delete</button>${k==='pos'?` <button class="btn ghost" onclick="toggleReturn(${r.at(-1)})">Return</button>`:''}</td></tr>`).join('')||`<tr><td colspan="9" class="empty">No records in this farm yet.</td></tr>`}</tbody></table></div>`
}

function feedForecast(period = 30) {
  const f = F();
  const todayStr = (typeof TODAY !== 'undefined' ? TODAY : new Date().toISOString().slice(0, 10));
  const p = (f.feedPlan && f.feedPlan.configured) ? f.feedPlan : {
    sowGestKg: 2.5,
    sowLactKg: 3.5,
    boarKg: 2.0,
    boarFeedType: 'Gestating'
  };

  const totals = {
    'Pre Starter': 0,
    'Starter': 0,
    'Grower': 0,
    'Finisher': 0,
    'Gestating': 0,
    'Lactating': 0
  };

  const consumingGroups = {
    'Pre Starter': { heads: 0, batches: [] },
    'Starter': { heads: 0, batches: [] },
    'Grower': { heads: 0, batches: [] },
    'Finisher': { heads: 0, batches: [] },
    'Gestating': { heads: 0, sows: 0, boars: 0 },
    'Lactating': { heads: 0, sows: 0 }
  };

  const activeBatches = (f.piglets || []).filter(b => !b.archived && !b.deleted_at);
  const activeSows = (f.sows || []).filter(isActiveSow);
  const activeBoars = (f.boars || []).filter(b => String(b.status || 'Active') === 'Active');

  // Count current population eating each feed today
  activeBatches.forEach(b => {
    const age = days(b.birth);
    const ledger = f.pigletLedger || [];
    const dead = ledger.filter(x => x.batch_id === b.id && x.type === 'mortality' && !['undone', 'deleted'].includes(x.status)).reduce((a, x) => a + (+x.quantity || 0), 0);
    const sold = ledger.filter(x => x.batch_id === b.id && x.type === 'sold' && !['undone', 'deleted'].includes(x.status)).reduce((a, x) => a + (+x.quantity || 0), 0);
    const h = Math.max(0, (+b.males || 0) + (+b.females || 0) - dead - sold);
    if (h <= 0) return;

    if (age <= 30) {
      consumingGroups['Pre Starter'].heads += h;
      consumingGroups['Pre Starter'].batches.push({ id: b.id, age, heads: h, breed: b.breed });
    } else if (age <= 70) {
      consumingGroups['Starter'].heads += h;
      consumingGroups['Starter'].batches.push({ id: b.id, age, heads: h, breed: b.breed });
    } else if (age <= 120) {
      consumingGroups['Grower'].heads += h;
      consumingGroups['Grower'].batches.push({ id: b.id, age, heads: h, breed: b.breed });
    } else {
      consumingGroups['Finisher'].heads += h;
      consumingGroups['Finisher'].batches.push({ id: b.id, age, heads: h, breed: b.breed });
    }
  });

  activeSows.forEach(s => {
    const st = status(s);
    if (st === 'Lactating' || (s.insemination && days(s.insemination) >= 110)) {
      consumingGroups['Lactating'].sows++;
      consumingGroups['Lactating'].heads++;
    } else {
      consumingGroups['Gestating'].sows++;
      consumingGroups['Gestating'].heads++;
    }
  });

  consumingGroups['Gestating'].boars += activeBoars.length;
  consumingGroups['Gestating'].heads += activeBoars.length;

  // Day-by-day progression simulation across the forecast horizon
  for (let dayOffset = 0; dayOffset < period; dayOffset++) {
    // 1. Batches day-by-day stage transition
    activeBatches.forEach(b => {
      const ledger = f.pigletLedger || [];
      const dead = ledger.filter(x => x.batch_id === b.id && x.type === 'mortality' && !['undone', 'deleted'].includes(x.status)).reduce((a, x) => a + (+x.quantity || 0), 0);
      const sold = ledger.filter(x => x.batch_id === b.id && x.type === 'sold' && !['undone', 'deleted'].includes(x.status)).reduce((a, x) => a + (+x.quantity || 0), 0);
      const h = Math.max(0, (+b.males || 0) + (+b.females || 0) - dead - sold);
      if (h <= 0) return;

      const simAge = days(b.birth) + dayOffset;
      if (simAge >= 5 && simAge <= 30) {
        totals['Pre Starter'] += h * 0.35; // 350g/head/day prestarter
      } else if (simAge >= 31 && simAge <= 70) {
        totals['Starter'] += h * 1.10; // 1.1kg/head/day starter
      } else if (simAge >= 71 && simAge <= 120) {
        totals['Grower'] += h * 2.10; // 2.1kg/head/day grower
      } else if (simAge >= 121 && simAge <= 180) {
        totals['Finisher'] += h * 2.75; // 2.75kg/head/day finisher
      }
    });

    // 2. Sows day-by-day transition (Day 110 gestating -> lactating)
    activeSows.forEach(s => {
      const st = status(s);
      if (st === 'Lactating') {
        totals['Lactating'] += (p.sowLactKg || 3.5);
      } else if (s.insemination) {
        const simGestation = days(s.insemination) + dayOffset;
        if (simGestation >= 110) {
          totals['Lactating'] += (p.sowLactKg || 3.5);
        } else {
          totals['Gestating'] += (p.sowGestKg || 2.5);
        }
      } else {
        totals['Gestating'] += (p.sowGestKg || 2.5);
      }
    });

    // 3. Boars daily intake
    if (activeBoars.length > 0) {
      totals['Gestating'] += activeBoars.length * (p.boarKg || 2.0);
    }
  }

  return { totals, consumingGroups, activeBatches, activeSows, activeBoars };
}

function predictor(period = 30) {
  const sim = feedForecast(period);
  const t = sim.totals;
  const cGroups = sim.consumingGroups;
  const f = F();

  const totalPigletsHeads = sim.activeBatches.reduce((a, b) => {
    const dead = (f.pigletLedger || []).filter(x => x.batch_id === b.id && x.type === 'mortality' && !['undone', 'deleted'].includes(x.status)).reduce((la, x) => la + (+x.quantity || 0), 0);
    const sold = (f.pigletLedger || []).filter(x => x.batch_id === b.id && x.type === 'sold' && !['undone', 'deleted'].includes(x.status)).reduce((la, x) => la + (+x.quantity || 0), 0);
    return a + Math.max(0, (+b.males || 0) + (+b.females || 0) - dead - sold);
  }, 0);

  const totalHerdAnimals = sim.activeSows.length + sim.activeBoars.length + totalPigletsHeads;

  // Compute feed programs analysis
  const feedPrograms = [
    { type: 'Pre Starter', icon: '🥣', bagKg: 25, defaultPrice: 1350 },
    { type: 'Starter', icon: '🌾', bagKg: 50, defaultPrice: 1850 },
    { type: 'Grower', icon: '🌱', bagKg: 50, defaultPrice: 1650 },
    { type: 'Finisher', icon: '🥩', bagKg: 50, defaultPrice: 1550 },
    { type: 'Gestating', icon: '🐷', bagKg: 50, defaultPrice: 1500 },
    { type: 'Lactating', icon: '🍼', bagKg: 50, defaultPrice: 1750 }
  ];

  let totalRequiredKg = 0;
  let totalRequiredBags = 0;
  let totalProjectedCost = 0;
  let totalShortfallBags = 0;
  let totalShortfallCost = 0;
  let criticalAlertCount = 0;

  const analyzedFeeds = feedPrograms.map(fp => {
    const reqKg = t[fp.type] || 0;
    const reqBags = +(reqKg / fp.bagKg).toFixed(1);
    const stockItem = (f.feed || []).find(x => String(x.type).toLowerCase() === fp.type.toLowerCase());
    const stockBags = stockItem ? +stockItem.bags || 0 : 0;
    const price = stockItem ? +stockItem.price || fp.defaultPrice : fp.defaultPrice;
    const cost = reqBags * price;

    const dailyBurnKg = +(reqKg / period).toFixed(1);
    const dailyBurnBags = +(reqBags / period).toFixed(2);
    const daysOfStock = dailyBurnBags > 0 ? (stockBags / dailyBurnBags) : 999;
    const shortfallBags = Math.max(0, Math.ceil(reqBags - stockBags));
    const shortfallCost = shortfallBags * price;

    totalRequiredKg += reqKg;
    totalRequiredBags += reqBags;
    totalProjectedCost += cost;
    totalShortfallBags += shortfallBags;
    totalShortfallCost += shortfallCost;

    let statusTag = { cls: 'ok', label: `✓ STOCKED FOR ${period}d` };
    if (reqKg > 0) {
      if (stockBags <= 0) {
        statusTag = { cls: 'danger', label: '🚨 OUT OF STOCK' };
        criticalAlertCount++;
      } else if (daysOfStock < 3) {
        statusTag = { cls: 'danger', label: `🚨 CRITICAL (${daysOfStock.toFixed(1)}d LEFT)` };
        criticalAlertCount++;
      } else if (daysOfStock < 7) {
        statusTag = { cls: 'warn', label: `⚠️ REORDER SOON (${daysOfStock.toFixed(0)}d LEFT)` };
        criticalAlertCount++;
      } else if (shortfallBags > 0) {
        statusTag = { cls: 'warn', label: `📦 SHORT ${shortfallBags} BAGS` };
      }
    } else {
      statusTag = { cls: 'ok', label: '— No Active Demand' };
    }

    const cGroup = cGroups[fp.type] || { heads: 0 };
    const stockCoveragePct = reqBags > 0 ? Math.min(100, Math.round((stockBags / reqBags) * 100)) : 100;

    return {
      ...fp,
      reqKg,
      reqBags,
      stockBags,
      price,
      cost,
      dailyBurnKg,
      dailyBurnBags,
      daysOfStock,
      shortfallBags,
      shortfallCost,
      statusTag,
      cGroup,
      stockCoveragePct
    };
  });

  const dailyHerdIntakeKg = +(totalRequiredKg / period).toFixed(1);
  const dailyHerdIntakeBags = +(totalRequiredBags / period).toFixed(1);

  const container = document.getElementById('predictor');
  if (!container) return;

  container.innerHTML = `
    <!-- Top Header Card -->
    <div class="forecast-header-card" style="margin-bottom:14px">
      <div class="forecast-header-top">
        <div>
          <div class="eyebrow" style="color:var(--teal2);font-weight:800">FEED REQUIREMENTS &amp; CONSUMPTION PATTERN PREDICTOR</div>
          <h2 style="margin:2px 0 6px 0;font-size:24px">Feed Predictor &amp; Inventory Demand Forecast</h2>
          <p class="muted" style="margin:0">Real-time consumption simulation based on active herd population, daily burn rates, age-stage transitions &amp; stock-out forecasting.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${window.feedOrdersPageBtn ? window.feedOrdersPageBtn() : ''}
          <button type="button" class="btn ghost small" onclick="predictor(${period})">⟳ Re-Simulate</button>
        </div>
      </div>

      <!-- Hero KPI Summary Grid -->
      <div class="predictor-hero-grid">
        <div class="predictor-kpi-card">
          <small>Total Projected Demand</small>
          <b>${totalRequiredBags.toFixed(1)} Bags</b>
          <span>${totalRequiredKg.toFixed(1)} kg · ${peso(totalProjectedCost)}</span>
        </div>
        <div class="predictor-kpi-card">
          <small>Daily Herd Consumption</small>
          <b>${dailyHerdIntakeKg} kg / day</b>
          <span>~${dailyHerdIntakeBags} bags consumed daily</span>
        </div>
        <div class="predictor-kpi-card">
          <small>Consuming Population</small>
          <b>${totalHerdAnimals} Animals</b>
          <span>${sim.activeSows.length} Sows · ${sim.activeBoars.length} Boars · ${totalPigletsHeads} Piglets</span>
        </div>
        <div class="predictor-kpi-card" style="${totalShortfallBags > 0 ? 'border-color:rgba(239,68,68,0.5);background:rgba(239,68,68,0.08)' : ''}">
          <small>${totalShortfallBags > 0 ? '⚠️ Stock Shortfall' : 'Inventory Coverage'}</small>
          <b style="${totalShortfallBags > 0 ? 'color:#ef4444' : 'color:var(--teal2)'}">${totalShortfallBags > 0 ? totalShortfallBags + ' Bags Short' : '✓ Fully Covered'}</b>
          <span>${totalShortfallBags > 0 ? 'Order Est: ' + peso(totalShortfallCost) : `Covers next ${period} days`}</span>
        </div>
      </div>
    </div>

    <!-- Timeframe Switcher & Pattern Explanation -->
    <div class="forecast-filter-panel" style="margin-bottom:14px">
      <div class="forecast-filter-row" style="border-bottom:0;padding-bottom:0;margin-bottom:0">
        <span class="forecast-filter-title">Forecast Horizon:</span>
        <div class="forecast-pills" style="flex-wrap:wrap">
          ${[
            [7, '7 Days (This Week)'],
            [15, '15 Days (Bi-Weekly)'],
            [30, '30 Days (Monthly)'],
            [60, '60 Days (2 Months)'],
            [90, '90 Days (Quarterly)']
          ].map(([pDays, label]) => `
            <button type="button" class="period ${pDays === period ? 'active' : ''}" onclick="predictor(${pDays})">${label}</button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Pattern Insight Banner -->
    <div class="notice" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;background:rgba(13,141,145,0.08);border:1px solid rgba(13,141,145,0.3);border-radius:12px;padding:12px 16px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:18px">📊</span>
        <div>
          <b>Real-Time Population &amp; Consumption Pattern Analysis</b>
          <small class="muted" style="display:block">Simulates daily age progression across <b>${sim.activeBatches.length} active litters</b> (${totalPigletsHeads} heads) + <b>${sim.activeSows.length} sows</b> (switching to Lactating feed at Day 110) + <b>${sim.activeBoars.length} boars</b>.</small>
        </div>
      </div>
      ${criticalAlertCount > 0 ? `
        <span class="feed-pulse-tag danger">⚠️ ${criticalAlertCount} Feed Program(s) Require Reorder</span>
      ` : `
        <span class="feed-pulse-tag ok">✓ Stock Levels Healthy</span>
      `}
    </div>

    <!-- Feed Program Analysis Cards -->
    <div class="predictor-cards-list">
      ${analyzedFeeds.map(af => {
        if (af.reqKg === 0 && af.stockBags === 0) return '';
        const consumersLabel = af.type === 'Gestating'
          ? `${af.cGroup.sows} sows (${sim.activeSows.filter(s => status(s) !== 'Lactating').length} gestating/open) + ${af.cGroup.boars} boars`
          : af.type === 'Lactating'
          ? `${af.cGroup.sows} lactating &amp; transition sows`
          : `${af.cGroup.heads} piglets across ${af.cGroup.batches?.length || 0} active batch(es)`;

        return `
          <div class="predictor-feed-card ${af.statusTag.cls}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px">
              <div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:18px">${af.icon}</span>
                  <h3 style="margin:0;font-size:17px;color:var(--ink)">${af.type} Feed</h3>
                  <span class="feed-pulse-tag ${af.statusTag.cls}">${af.statusTag.label}</span>
                </div>
                <small class="muted" style="display:block;margin-top:3px">
                  Consuming population: <b>${consumersLabel}</b> · Daily intake: <b>${af.dailyBurnKg} kg/day</b> (~${af.dailyBurnBags} bags/day)
                </small>
              </div>
              <div style="text-align:right">
                <b style="font-size:17px;color:var(--ink)">${af.reqKg.toFixed(1)} kg</b>
                <small class="muted" style="display:block">${af.reqBags} bags · ${peso(af.cost)}</small>
              </div>
            </div>

            <!-- Stock vs Demand Visual Coverage Bar -->
            <div style="background:rgba(0,0,0,0.25);border-radius:10px;padding:10px 12px;margin:8px 0">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
                <span>Current Stock on Hand: <b style="color:var(--ink)">${af.stockBags} bags</b> (${(af.stockBags * af.bagKg)} kg)</span>
                <span>${af.daysOfStock < 999 ? `Stock Coverage: <b style="color:${af.daysOfStock < 7 ? '#f87171' : 'var(--teal2)'}">~${af.daysOfStock.toFixed(1)} days</b>` : 'No active burn'}</span>
              </div>
              <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;position:relative">
                <div style="height:100%;background:${af.stockBags >= af.reqBags ? 'var(--teal2)' : (af.stockBags > 0 ? '#f59e0b' : '#ef4444')};width:${af.stockCoveragePct}%;border-radius:999px"></div>
              </div>
            </div>

            <!-- Bottom Action & Shortfall Order Row -->
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:10px">
              <div>
                ${af.shortfallBags > 0 ? `
                  <span style="color:#ef4444;font-weight:750;font-size:12.5px">⚠️ Projected Shortfall: <b>${af.shortfallBags} bags</b> (${peso(af.shortfallCost)} estimated cost)</span>
                ` : `
                  <span style="color:var(--teal2);font-weight:600;font-size:12.5px">✓ Current inventory covers this ${period}-day simulation window.</span>
                `}
              </div>
              <div style="display:flex;gap:6px">
                ${window.openOrderForm ? `
                  <button type="button" class="btn small" style="background:${af.shortfallBags > 0 ? '#0ea5e9' : 'rgba(13,141,145,0.2)'};color:#fff" onclick="openOrderForm(null, '${esc(af.type)}', ${af.shortfallBags || 10})">
                    📦 Order ${af.type} (${af.shortfallBags > 0 ? af.shortfallBags + ' bags' : '+ Restock'})
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCTION & BREEDER OFFTAKE FORECAST HUB
   Interactive timelines, smart timeframe & breed filters, customer reservations
   and direct phone / Facebook Messenger outreach.
   ═══════════════════════════════════════════════════════════════════════════ */
window.forecastFilterState = window.forecastFilterState || {
  timeframe: '30',
  category: 'all',
  breed: 'all',
  searchQuery: '',
  monthPicker: ''
};

window.setForecastTimeframe = function(tf) {
  window.forecastFilterState.timeframe = tf;
  window.forecastFilterState.monthPicker = '';
  production();
};

window.setForecastCategory = function(cat) {
  window.forecastFilterState.category = cat;
  production();
};

window.setForecastBreed = function(br) {
  window.forecastFilterState.breed = br;
  production();
};

window.setForecastMonth = function(m) {
  if (m) {
    window.forecastFilterState.timeframe = 'month:' + m;
    window.forecastFilterState.monthPicker = m;
  } else {
    window.forecastFilterState.timeframe = '30';
    window.forecastFilterState.monthPicker = '';
  }
  production();
};

window.setForecastSearch = function(q) {
  window.forecastFilterState.searchQuery = q || '';
  production();
};

function production(periodOverride) {
  if (periodOverride && typeof periodOverride === 'number') {
    window.forecastFilterState.timeframe = String(periodOverride);
  }

  const f = F();
  const st = window.forecastFilterState;
  const todayStr = (typeof TODAY !== 'undefined' ? TODAY : new Date().toISOString().slice(0, 10));

  // Helper date calculators
  const dueDateCalc = s => {
    if (!s.insemination) return null;
    const z = new Date(s.insemination + (s.insemination.includes('T') ? '' : 'T00:00:00'));
    z.setDate(z.getDate() + 114);
    return z.toISOString().slice(0, 10);
  };

  const daysDiff = targetDate => {
    if (!targetDate) return 9999;
    const d1 = new Date(todayStr + 'T00:00:00');
    const d2 = new Date(targetDate + (targetDate.includes('T') ? '' : 'T00:00:00'));
    return Math.round((d2 - d1) / 864e5);
  };

  const addDaysToDate = (baseDateStr, daysCount) => {
    if (!baseDateStr) return '';
    const d = new Date(baseDateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + (+daysCount || 0));
    return d.toISOString().slice(0, 10);
  };

  const rawEvents = [];

  // 1. 🐷 Expected Farrowing Events
  (f.sows || []).forEach((s, idx) => {
    if (s.culled || s.status === 'CULLED' || !s.insemination || s.farrowingDate || s.lactationStart) return;
    const fDate = dueDateCalc(s);
    if (!fDate) return;
    const diff = daysDiff(fDate);
    const gestDay = Math.max(0, Math.round((new Date(todayStr + 'T00:00:00') - new Date(s.insemination + 'T00:00:00')) / 864e5));

    rawEvents.push({
      type: 'farrowing',
      id: s.id || s.name,
      title: s.name || s.id || `Sow #${idx + 1}`,
      breed: s.breed || 'Commercial Crossbred',
      date: fDate,
      daysDiff: diff,
      gestDay,
      parity: s.parity || 0,
      sire: s.sire || s.lastSemenBoarName || 'AI Service Boar',
      dam: s.dam || '—',
      estimatedHeads: 10,
      sowIndex: idx,
      sow: s,
      note: diff < 0 ? `Overdue by ${Math.abs(diff)} days!` : (diff === 0 ? 'Farrowing Expected Today!' : `Due in ${diff} days · Prepare farrowing pen`)
    });
  });

  // 2. 🍼 Scheduled Weaning Events
  (f.piglets || []).forEach(b => {
    if (b.archived || b.weaning || !b.birth) return;
    const weanDate = isoOff(days(b.birth) + 28);
    const diff = daysDiff(weanDate);
    const ageDays = Math.max(0, days(b.birth));
    const liveHeads = (Number(b.males || 0) + Number(b.females || 0));

    if (liveHeads > 0) {
      rawEvents.push({
        type: 'weaning',
        id: b.id,
        title: `Batch ${b.id}`,
        breed: b.breed || 'Crossbred',
        date: weanDate,
        daysDiff: diff,
        ageDays,
        heads: liveHeads,
        males: b.males || 0,
        females: b.females || 0,
        sow: b.dam_name || b.sow || '—',
        sire: b.sire_name || b.sire || '—',
        batch: b,
        note: diff <= 0 ? 'Ready to Wean Now · Move to Nursery' : `Weaning in ${diff} days (${ageDays}d old)`
      });
    }
  });

  // 3. ⭐ Breeder Stock Release / Offtake Events (Exclusively "Breeder" & 90+ Day Minimum Age)
  (f.piglets || []).forEach(b => {
    if (b.archived || !b.birth) return;
    const ledger = f.pigletLedger || [];
    const breederEntries = ledger.filter(x => x.batch_id === b.id && x.type === 'breeder' && !['undone', 'deleted'].includes(x.status));
    const breederM = breederEntries.filter(x => x.gender === 'male').reduce((a, x) => a + (+x.quantity || 0), 0);
    const breederF = breederEntries.filter(x => x.gender === 'female').reduce((a, x) => a + (+x.quantity || 0), 0);
    const breederHeads = breederM + breederF;

    // Strictly include only batches that have piglets assigned exclusively to "Breeder"
    if (breederHeads <= 0) return;

    const bRes = (f.reservations || []).filter(r => (r.batch_id === b.id || (Array.isArray(r.lines) && r.lines.some(l => l.batch_id === b.id))) && r.status !== 'Cancelled');
    const ageDays = Math.max(0, days(b.birth));

    // Target release date is strictly 90 days (3 months) from birth
    const target90Date = addDaysToDate(b.birth, 90);
    const releaseDate = (b.release_date && b.release_date >= target90Date) ? b.release_date : target90Date;
    const diff = daysDiff(releaseDate);
    const daysToRelease = Math.max(0, 90 - ageDays);
    const isReady = ageDays >= 90;

    rawEvents.push({
      type: 'breeder',
      id: b.id,
      title: `Batch ${b.id} (Breeder Offtake)`,
      breed: b.breed || 'F1 Breeder Stock',
      date: releaseDate,
      daysDiff: diff,
      ageDays,
      daysToRelease,
      isReady,
      heads: breederHeads,
      males: breederM,
      females: breederF,
      sow: b.dam_name || b.sow || '—',
      sire: b.sire_name || b.sire || '—',
      reservations: bRes,
      batch: b,
      note: isReady ? `⭐ Ready for Customer Release (${ageDays}d old · 3+ months mature)` : `⏳ Release in ${daysToRelease} days (${ageDays}/90d old · Target: ${fmtDate(releaseDate)})`
    });
  });

  // 4. 📈 Fattener Market Readiness Events
  (f.piglets || []).forEach(b => {
    if (b.archived || !b.birth) return;
    const ledger = f.pigletLedger || [];
    const fattenerEntries = ledger.filter(x => x.batch_id === b.id && x.type === 'fattener' && !['undone', 'deleted'].includes(x.status));
    const fattenerHeads = fattenerEntries.reduce((a, x) => a + (+x.quantity || 0), 0);
    const ageDays = Math.max(0, days(b.birth));

    if (fattenerHeads > 0) {
      const mktDate = isoOff(days(b.birth) + 160);
      const diff = daysDiff(mktDate);

      rawEvents.push({
        type: 'fattener',
        id: b.id,
        title: `Batch ${b.id} (Grow-Finish)`,
        breed: b.breed || 'Commercial Meat Hog',
        date: mktDate,
        daysDiff: diff,
        ageDays,
        heads: fattenerHeads,
        sow: b.dam_name || b.sow || '—',
        sire: b.sire_name || b.sire || '—',
        batch: b,
        note: diff <= 0 ? '📈 Market Harvest Ready (90–110 kg)' : `Market Target in ${diff} days (~${ageDays}d old)`
      });
    }
  });

  // Unique breeds for smart filtering
  const farmBreeds = Array.from(new Set([
    'All Breeds',
    'F1',
    'Large White',
    'Landrace',
    'Duroc',
    'Pietrain',
    'Crossbred',
    ...rawEvents.map(e => e.breed).filter(Boolean)
  ])).filter(Boolean);

  // Apply Filters
  const filteredEvents = rawEvents.filter(ev => {
    // 1. Timeframe Filter
    const diff = ev.daysDiff;
    if (st.timeframe === 'this_month') {
      const currentYM = todayStr.slice(0, 7);
      if (!ev.date.startsWith(currentYM)) return false;
    } else if (st.timeframe === 'next_month') {
      const d = new Date(todayStr + 'T00:00:00');
      d.setMonth(d.getMonth() + 1);
      const nextYM = d.toISOString().slice(0, 7);
      if (!ev.date.startsWith(nextYM)) return false;
    } else if (st.timeframe.startsWith('month:')) {
      const selYM = st.timeframe.replace('month:', '');
      if (!ev.date.startsWith(selYM)) return false;
    } else if (st.timeframe === 'today' && ev.date !== todayStr) {
      return false;
    } else if (st.timeframe === 'tomorrow' && diff !== 1) {
      return false;
    } else if (st.timeframe === '7' && (diff < 0 || diff > 7)) {
      return false;
    } else if (st.timeframe === '14' && (diff < 0 || diff > 14)) {
      return false;
    } else if (st.timeframe === '30' && (diff < 0 || diff > 30)) {
      return false;
    } else if (st.timeframe === '60' && (diff < 0 || diff > 60)) {
      return false;
    } else if (st.timeframe === '90' && (diff < 0 || diff > 90)) {
      return false;
    } else if (st.timeframe === '180' && (diff < 0 || diff > 180)) {
      return false;
    }

    // 2. Category Filter
    if (st.category !== 'all' && ev.type !== st.category) return false;

    // 3. Breed Filter
    if (st.breed !== 'all' && st.breed !== 'All Breeds') {
      if (!String(ev.breed || '').toLowerCase().includes(st.breed.toLowerCase())) return false;
    }

    // 4. Search Filter
    if (st.searchQuery) {
      const q = st.searchQuery.toLowerCase();
      const match = `${ev.title} ${ev.breed} ${ev.sow} ${ev.sire} ${ev.note} ${ev.id}`.toLowerCase();
      const resMatch = (ev.reservations || []).some(r => `${r.customer} ${r.contact} ${r.no}`.toLowerCase().includes(q));
      if (!match.includes(q) && !resMatch) return false;
    }

    return true;
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Compute Headline KPI Metrics
  const totalFarSows = rawEvents.filter(e => e.type === 'farrowing').length;
  const totalWeanPigs = rawEvents.filter(e => e.type === 'weaning').reduce((a, e) => a + (e.heads || 0), 0);
  const totalBreederHeads = rawEvents.filter(e => e.type === 'breeder').reduce((a, e) => a + (e.heads || 0), 0);
  const totalReservations = (f.reservations || []).filter(r => r.status !== 'Cancelled').length;

  // Month Picker Dropdown Options
  const monthOptions = [];
  const currD = new Date(todayStr + 'T00:00:00');
  for (let m = 0; m < 12; m++) {
    const dObj = new Date(currD.getFullYear(), currD.getMonth() + m, 1);
    const val = dObj.toISOString().slice(0, 7);
    const label = dObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push(`<option value="${val}" ${st.monthPicker === val || st.timeframe === 'month:' + val ? 'selected' : ''}>📅 ${label}</option>`);
  }

  // Compute specific breed breakdown for breeder offtakes in the current filtered events
  const breederEventsInView = filteredEvents.filter(e => e.type === 'breeder');
  const totalBreedersInView = breederEventsInView.reduce((a, e) => a + e.heads, 0);
  const totalBMInView = breederEventsInView.reduce((a, e) => a + e.males, 0);
  const totalBFInView = breederEventsInView.reduce((a, e) => a + e.females, 0);

  const breedBreakdown = {};
  breederEventsInView.forEach(e => {
    const br = e.breed || 'Crossbred';
    if (!breedBreakdown[br]) breedBreakdown[br] = { heads: 0, m: 0, f: 0 };
    breedBreakdown[br].heads += e.heads;
    breedBreakdown[br].m += e.males;
    breedBreakdown[br].f += e.females;
  });

  const container = document.getElementById('production');
  if (!container) return;

  container.innerHTML = `
    <!-- Top Hero Card & Summary -->
    <div class="forecast-header-card">
      <div class="forecast-header-top">
        <div>
          <div class="eyebrow" style="color:var(--teal2);font-weight:800">OPERATIONS &amp; OFFTAKE FORECASTING</div>
          <h2 style="margin:2px 0 6px 0;font-size:24px">Production &amp; Breeder Offtake Forecast</h2>
          <p class="muted" style="margin:0">Unified schedules for upcoming farrowings, weanings, breeder stock releases (min 90 days), and customer reservations.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button type="button" class="btn ghost small" onclick="production()">⟳ Refresh</button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="forecast-kpi-grid">
        <div class="forecast-kpi-box farrow" onclick="window.setForecastCategory('farrowing')" style="cursor:pointer">
          <small>Expected Farrowing</small>
          <b>${totalFarSows} Sows</b>
          <span>~${totalFarSows * 10} Estimated Piglets</span>
        </div>
        <div class="forecast-kpi-box wean" onclick="window.setForecastCategory('weaning')" style="cursor:pointer">
          <small>Scheduled Weaning</small>
          <b>${totalWeanPigs} Piglets</b>
          <span>Across ${rawEvents.filter(e => e.type === 'weaning').length} Active Batches</span>
        </div>
        <div class="forecast-kpi-box breeder" onclick="window.setForecastCategory('breeder')" style="cursor:pointer">
          <small>Breeder Stock Offtake</small>
          <b>${totalBreederHeads} Heads</b>
          <span>Exclusively Assigned Breeders</span>
        </div>
        <div class="forecast-kpi-box res" onclick="go('reservations')" style="cursor:pointer">
          <small>Customer Reservations</small>
          <b>${totalReservations} Orders</b>
          <span>Tap to Manage Reservations</span>
        </div>
      </div>
    </div>

    <!-- Smart Interactive Filter Panel -->
    <div class="forecast-filter-panel">
      <!-- 1. Category Filter Row -->
      <div class="forecast-filter-row">
        <span class="forecast-filter-title">Category:</span>
        <div class="forecast-pills">
          ${[
            ['all', '🌐 All Schedules'],
            ['breeder', '⭐ Breeder Offtake / Releases'],
            ['farrowing', '🐷 Expected Farrowing'],
            ['weaning', '🍼 Weaning Schedule'],
            ['fattener', '📈 Market Readiness']
          ].map(([k, l]) => `<button type="button" class="period ${st.category === k ? 'active' : ''}" onclick="window.setForecastCategory('${k}')">${l}</button>`).join('')}
        </div>
      </div>

      <!-- 2. Timeframe Selection Row (Month Chooser + Windows) -->
      <div class="forecast-filter-row">
        <span class="forecast-filter-title">Timeframe:</span>
        <div class="forecast-pills" style="flex-wrap:wrap">
          ${[
            ['this_month', '📅 This Month (' + new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }) + ')'],
            ['next_month', '📅 Next Month (' + new Date(new Date(todayStr + 'T00:00:00').getFullYear(), new Date(todayStr + 'T00:00:00').getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short' }) + ')'],
            ['30', '30 Days'],
            ['60', '60 Days'],
            ['90', '90 Days'],
            ['180', '6 Months'],
            ['all', 'All Schedules']
          ].map(([tf, l]) => `<button type="button" class="period ${st.timeframe === tf ? 'active' : ''}" onclick="window.setForecastTimeframe('${tf}')">${l}</button>`).join('')}
          <select class="select" id="forecastMonthChooser" style="padding:6px 12px;font-size:12px;font-weight:700" onchange="window.setForecastMonth(this.value)">
            <option value="">🗓 Select Month / Year…</option>
            ${monthOptions.join('')}
          </select>
        </div>
      </div>

      <!-- 3. Smart Breed Filter & Search Row -->
      <div class="forecast-filter-row" style="border-bottom:0;padding-bottom:0;margin-bottom:0">
        <span class="forecast-filter-title">Breed Filter:</span>
        <div class="forecast-pills" style="flex:1">
          ${farmBreeds.slice(0, 8).map(br => {
            const val = (br === 'All Breeds' ? 'all' : br);
            const active = (st.breed === val || (st.breed === 'all' && br === 'All Breeds'));
            return `<button type="button" class="period ${active ? 'active' : ''}" onclick="window.setForecastBreed('${val}')">${br === 'All Breeds' ? '✨ All Breeds' : br}</button>`;
          }).join('')}
        </div>
        <input type="search" class="search" style="min-width:220px;font-size:12.5px" placeholder="🔍 Search batch, customer, breed..." value="${esc(st.searchQuery)}" oninput="window.setForecastSearch(this.value)">
      </div>
    </div>

    <!-- Interactive Breeder Breed Breakdown Ribbon -->
    ${breederEventsInView.length ? `
      <div class="forecast-breeder-summary-tray" style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.06));border:1.5px solid rgba(245,158,11,0.4);border-radius:14px;padding:14px 16px;margin:14px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          <div>
            <div style="font-size:14px;font-weight:800;color:#f59e0b;display:flex;align-items:center;gap:6px">
              <span>⭐</span>
              <span>BREEDER OFFTAKE AVAILABLE IN THIS TIMEFRAME: <b>${totalBreedersInView} Heads</b></span>
            </div>
            <small class="muted">Exclusively assigned breeders · Gender split: <b>♂ ${totalBMInView} Males · ♀ ${totalBFInView} Females</b> · 90-day minimum release age</small>
          </div>
          <span class="badge" style="background:#f59e0b;color:#000;font-weight:800">${breederEventsInView.length} Breeder Batches</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${Object.entries(breedBreakdown).map(([br, stat]) => `
            <button type="button" class="btn ghost small" style="background:rgba(0,0,0,0.3);border:1.5px solid ${st.breed.toLowerCase() === br.toLowerCase() ? '#f59e0b' : 'rgba(245,158,11,0.35)'};border-radius:999px;padding:5px 12px;font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--ink)" onclick="window.setForecastBreed('${esc(br)}')">
              <b>${esc(br)}</b>: <span style="color:#f59e0b;font-weight:800">${stat.heads} head</span> <small class="muted">(♂${stat.m} · ♀${stat.f})</small>
            </button>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Active Filter Ribbon & Count -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px 0">
      <div class="eyebrow" style="color:var(--teal2);font-weight:800">
        SCHEDULED FORECAST EVENTS (${filteredEvents.length} RECORDS FOUND)
      </div>
      <small class="muted">
        ${st.breed !== 'all' ? `Filtered by Breed: <b>${st.breed}</b> · ` : ''}
        ${st.category !== 'all' ? `Category: <b>${st.category.toUpperCase()}</b> · ` : ''}
        Timeframe: <b>${st.timeframe === 'this_month' ? 'This Month' : (st.timeframe === 'next_month' ? 'Next Month' : (st.timeframe.startsWith('month:') ? st.timeframe.replace('month:', '') : st.timeframe === 'all' ? 'All Schedules' : st.timeframe + ' days'))}</b>
      </small>
    </div>

    <!-- Forecast Cards Grid -->
    <div class="forecast-card-grid">
      ${filteredEvents.map(ev => renderForecastCardHTML(ev, f)).join('') || `
        <div class="panel empty" style="grid-column:1/-1">
          <h3>No scheduled events match the current filter</h3>
          <p class="muted">Try selecting a broader timeframe (e.g. 60 or 90 days), choosing "All Breeds", or resetting your search.</p>
          <button type="button" class="btn ghost" onclick="window.setForecastTimeframe('90');window.setForecastBreed('all');window.setForecastCategory('all')">Reset All Filters</button>
        </div>
      `}
    </div>
  `;
}

function renderForecastCardHTML(ev, farm) {
  const isBreeder = ev.type === 'breeder';
  const isFarrowing = ev.type === 'farrowing';
  const isWeaning = ev.type === 'weaning';
  const isFattener = ev.type === 'fattener';

  const badgeIcon = isBreeder ? '⭐' : (isFarrowing ? '🐷' : (isWeaning ? '🍼' : '📈'));
  const badgeLabel = isBreeder ? 'Breeder Offtake' : (isFarrowing ? 'Expected Farrowing' : (isWeaning ? 'Scheduled Wean' : 'Market Ready'));

  // Linked Customer Reservations Box (Breeder & Batches)
  let reservationsHTML = '';
  if (ev.reservations && ev.reservations.length > 0) {
    reservationsHTML = `
      <div class="forecast-customer-box">
        <div class="forecast-customer-header">
          <b style="color:var(--teal2)">📜 Linked Customer Reservation (${ev.reservations.length})</b>
          <span class="badge ok" style="font-size:10.5px">Active Orders</span>
        </div>
        ${ev.reservations.map(r => {
          const cleanPhone = (r.contact || '').replace(/[^\d+]/g, '');
          const smsText = `Hello ${r.customer}, your reserved ${ev.breed} piglets from ${ev.title} at ${farm.name} are scheduled for release on ${fmtDate(ev.date)}. Total: ${r.quantity} heads. Balance: ₱${(r.price * r.quantity - (r.paid || 0))}. Thank you!`;
          return `
            <div style="padding:6px 0;border-top:1px dashed var(--line);margin-top:4px;font-size:12px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <b>👤 ${esc(r.customer)}</b>
                <span class="tag">${r.quantity} heads · ${r.gender || 'Any'}</span>
              </div>
              <small class="muted" style="display:block;margin-top:2px">
                Order #${esc(r.no || r.id)} · Status: <b>${esc(r.status || 'Confirmed')}</b> · Paid: <b>₱${r.paid || 0}</b> / ₱${(r.price || 0) * (r.quantity || 1)}
              </small>
              <div class="forecast-contact-tray">
                ${cleanPhone ? `
                  <a href="tel:${cleanPhone}" class="btn ghost small" style="text-decoration:none;padding:3px 8px;font-size:11px" title="Direct Phone Call">📞 Call (${cleanPhone})</a>
                  <a href="sms:${cleanPhone}?body=${encodeURIComponent(smsText)}" class="btn ghost small" style="text-decoration:none;padding:3px 8px;font-size:11px" title="Send SMS Update">✉️ SMS</a>
                ` : ''}
                <a href="https://m.me" target="_blank" class="btn small" style="background:#0084ff;color:#fff;text-decoration:none;padding:3px 9px;font-size:11px" title="Contact via Facebook Messenger / Business Suite">💬 Messenger</a>
                <button type="button" class="btn ghost small" style="padding:3px 7px;font-size:11px" onclick="navigator.clipboard?.writeText('${esc(smsText).replace(/'/g, "\\'")}'); toast('✓ Customer reminder message copied to clipboard!')">📋 Copy Msg</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (isBreeder) {
    reservationsHTML = `
      <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:8px 12px;margin:8px 0;display:flex;justify-content:space-between;align-items:center;font-size:12px">
        <span style="color:#b45309">✓ Available for Customer Reservation</span>
        <button type="button" class="btn small ghost" style="padding:3px 9px;font-size:11px" onclick="openReservationForBatch('${esc(ev.id)}')">＋ Reserve Now</button>
      </div>
    `;
  }

  return `
    <div class="forecast-item-card ${ev.type}">
      <!-- Top Title & Badge -->
      <div class="forecast-item-top">
        <div>
          <span class="forecast-badge ${ev.type}">${badgeIcon} ${badgeLabel}</span>
          <h3 style="margin:6px 0 2px 0;font-size:16.5px;color:var(--ink)">${esc(ev.title)}</h3>
          <small class="muted">Breed: <b style="color:var(--teal2)">${esc(ev.breed)}</b></small>
        </div>
        <div style="text-align:right">
          <b style="font-size:15px;color:var(--ink)">${fmtDate(ev.date)}</b>
          <small class="muted" style="display:block;font-size:11px">${esc(ev.note)}</small>
        </div>
      </div>

      <!-- Vitals Metadata Grid -->
      <div class="forecast-meta-grid">
        ${isFarrowing ? `
          <div><small>Inseminated</small><b>Day ${ev.gestDay} of 114</b></div>
          <div><small>Service Boar</small><b>${esc(ev.boar)}</b></div>
          <div><small>Estimated Litter</small><b>~${ev.estimatedHeads} Piglets</b></div>
          <div><small>Parity</small><b>Parity ${ev.parity}</b></div>
        ` : isWeaning ? `
          <div><small>Live Piglets</small><b>${ev.heads} Heads</b></div>
          <div><small>Gender Split</small><b>♂ ${ev.males} · ♀ ${ev.females}</b></div>
          <div><small>Current Age</small><b>${ev.ageDays} Days Old</b></div>
          <div><small>Dam × Sire</small><b>${esc(ev.sow)} × ${esc(ev.sire)}</b></div>
        ` : isBreeder ? `
          <div style="grid-column:1/-1;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:8px 12px;margin-bottom:4px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <small style="font-weight:700;color:#f59e0b">3-Month Biological Maturity (Min 90 Days):</small>
              <b style="font-size:12px;color:${ev.isReady ? 'var(--teal2)' : '#f59e0b'}">${ev.isReady ? '🏆 Ready for Release (90+ Days Old)' : `${ev.ageDays} / 90 Days (${ev.daysToRelease}d remaining)`}</b>
            </div>
            <div style="background:rgba(0,0,0,0.3);height:6px;border-radius:999px;overflow:hidden">
              <div style="background:${ev.isReady ? 'var(--teal2)' : '#f59e0b'};height:100%;width:${Math.min(100, Math.round(ev.ageDays / 90 * 100))}%"></div>
            </div>
          </div>
          <div><small>Breeder Stock</small><b>${ev.heads} Heads (Breeder Only)</b></div>
          <div><small>Gender Split</small><b>♂ ${ev.males} · ♀ ${ev.females}</b></div>
          <div><small>Target 90d Release</small><b>${fmtDate(ev.date)}</b></div>
          <div><small>Lineage (Dam × Sire)</small><b>${esc(ev.sow)} × ${esc(ev.sire)}</b></div>
        ` : `
          <div><small>Heads in Group</small><b>${ev.heads} Fatteners</b></div>
          <div><small>Current Age</small><b>~${ev.ageDays} Days</b></div>
          <div><small>Target Weight</small><b>90–110 kg</b></div>
          <div><small>Harvest Date</small><b>${fmtDate(ev.date)}</b></div>
        `}
      </div>

      <!-- Customer Reservations Box -->
      ${reservationsHTML}

      <!-- Bottom Interactive Action Toolbar -->
      <div class="forecast-actions-row">
        ${isFarrowing ? `
          <button type="button" class="btn small" onclick="openLinkedPigletModal(null,'${esc(ev.sow_id||ev.title)}')">🐷 Record Farrowing</button>
          <button type="button" class="btn ghost small" onclick="openSowProfile(${ev.sowIndex})">👁️ Gestation Dossier</button>
          <button type="button" class="btn ghost small" onclick="window.openMovementWizard && window.openMovementWizard('${esc(ev.sow_id||ev.title)}','sow')">🚚 Move Stall</button>
        ` : isWeaning ? `
          <button type="button" class="btn small" onclick="openBatchHub('${esc(ev.id)}')">🍼 Record Weaning</button>
          <button type="button" class="btn ghost small" onclick="window.openMovementWizard && window.openMovementWizard('${esc(ev.id)}','batch')">🚚 Move to Nursery</button>
          <button type="button" class="btn ghost small" onclick="openBatchPerformance('${esc(ev.id)}')">⚖️ Scale Weigh-In</button>
        ` : isBreeder ? `
          <button type="button" class="btn small" onclick="openAllocation('${esc(ev.id)}','breeder')">⭐ Breeder Allocation</button>
          <button type="button" class="btn ghost small" onclick="openBatchPerformance('${esc(ev.id)}')">⚖️ Performance &amp; Ear Notches</button>
          <button type="button" class="btn ghost small" onclick="openBatchHub('${esc(ev.id)}')">📊 Batch Hub</button>
        ` : `
          <button type="button" class="btn small" onclick="openFattenerCenter('${esc(ev.id)}')">📈 Fattener Center &amp; Selling</button>
          <button type="button" class="btn ghost small" onclick="openBatchHub('${esc(ev.id)}')">Batch Details</button>
        `}
      </div>
    </div>
  `;
}
window.production = production;

function toggleCustomBreed(value) {
  let f = document.getElementById('customBreedField');
  if (f) f.style.display = value === 'Custom / Other Breed' ? 'block' : 'none'
}

function normalizeSowKey(v) {
  return String(v || '').trim().toLowerCase()
}

function sowDuplicate(field, value, index) {
  let key = normalizeSowKey(value);
  if (!key) return false;
  return (F().sows || []).some((x, i) => i !== index && normalizeSowKey(field === 'id' ? x.id : x.name) === key)
}

function attachSowDuplicateGuard(index) {
  let form = document.getElementById('recordForm'),
    button = form.querySelector('.actions button:last-child'),
    idInput = form.querySelector('[name="id"]'),
    nameInput = form.querySelector('[name="name"]'),
    timer;

  function mark(input, duplicate, message) {
    let host = input.closest('.field'),
      hint = host.querySelector('.duplicate-hint') || document.createElement('small');
    hint.className = 'duplicate-hint';
    if (!hint.parentNode) host.appendChild(hint);
    input.classList.toggle('duplicate-input', duplicate);
    input.classList.toggle('available-input', !!input.value.trim() && !duplicate);
    hint.textContent = duplicate ? `⚠ ${message}` : input.value.trim() ? '✓ Available in this farm' : '';
    hint.classList.toggle('error', duplicate);
    let invalid = sowDuplicate('id', idInput.value, index) || sowDuplicate('name', nameInput.value, index);
    button.disabled = invalid;
    button.classList.toggle('blocked-breed', invalid)
  }

  function check() {
    mark(idInput, sowDuplicate('id', idInput.value, index), 'A sow with this ID already exists in this farm.');
    mark(nameInput, sowDuplicate('name', nameInput.value, index), 'A sow with this name already exists in this farm.')
  } [idInput, nameInput].forEach(input => {
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(check, 350)
    });
    input.addEventListener('blur', check)
  });
  check()
}

function openModal(k, index = null) {
  let c = configs[k],
    r = index === null ? {} : F()[c.key][index];
  document.getElementById('modalTitle').textContent = index === null ? c.add : 'Edit record';
  document.getElementById('modalDesc').textContent = `Saved securely to ${F().name}; records are scoped by farm_id.`;
  document.getElementById('formFields').innerHTML = c.fields.map(([key, label, type]) => {
    let field;
    if (type.startsWith('select:')) {
      let options = type.slice(7).split(','),
        current = r[key] || '',
        selected = (key === 'breed' && current && !options.includes(current)) ? 'Custom / Other Breed' : current;
      field = `<select name="${key}" required ${key==='breed'?'onchange=\"toggleCustomBreed(this.value)\"':''}><option value="">Select…</option>${options.map(q=>`<option ${selected===q?'selected':''}>${q}</option>`).join('')}</select>`
    } else if (type === 'textarea') field = `<textarea name="${key}">${r[key]||''}</textarea>`;
    else field = `<input name="${key}" type="${type}" value="${r[key]??(key==='date'?TODAY:'')}" ${key==='id'||key==='type'||key==='title'||key==='product'||key==='boar'?'required':''}>`;
    let customValue = (key === 'customBreed' ? (r.customBreed || (!['Large White', 'Landrace', 'Duroc', 'Yorkshire', 'Crossbred'].includes(r.breed || '') ? r.breed || '' : '')) : '');
    if (key === 'customBreed' && customValue) {
      field = `<input name="customBreed" type="text" value="${customValue}" placeholder="Enter breed name">`
    }
    let style = key === 'customBreed' && (!r.breed || ['Large White', 'Landrace', 'Duroc', 'Yorkshire', 'Crossbred'].includes(r.breed)) ? 'style="display:none"' : '';
    return `<div id="${key==='customBreed'?'customBreedField':''}" class="field ${type==='textarea'?'full':''}" ${style}><label>${label}${key==='customBreed'?' (required for Custom / Other Breed)':''}</label>${field}</div>`
  }).join('');
  if (k === 'sows') attachSowDuplicateGuard(index);
  document.getElementById('recordForm').onsubmit = e => {
    e.preventDefault();
    let obj = Object.fromEntries(new FormData(e.target));
    if (k === 'sows' && (sowDuplicate('id', obj.id, index) || sowDuplicate('name', obj.name, index))) {
      toast('Duplicate sow ID or name detected in this farm.');
      return
    }
    if (k === 'sows' && obj.breed === 'Custom / Other Breed') {
      if (!obj.customBreed?.trim()) {
        toast('Enter the specific breed name.');
        return
      }
      obj.breed = obj.customBreed.trim()
    }
    for (let q of ['bags', 'price', 'parity', 'males', 'females', 'bottles', 'amount', 'paid', 'qty', 'total'])
      if (q in obj) obj[q] = +obj[q];
    if (k === 'piglets' && index === null) {
      obj.iron = false;
      obj.castration = false;
      obj.weaning = false
    }
    if (k === 'reminders' && index === null) obj.active = true;
    if (k === 'pos' && index === null) obj.is_returned = false;
    if (index === null) F()[c.key].push(obj);
    else F()[c.key][index] = Object.assign(F()[c.key][index], obj);
    save();
    closeModal();
    renderAll();
    toast(index === null ? 'Record added' : 'Record updated')
  };
  document.getElementById('modalBg').classList.add('open')
}

function editRecord(k, i) {
  openModal(k, i)
}

function closeModal() {
  document.getElementById('modalBg').classList.remove('open')
}

function dismiss(i) {
  F().reminders.splice(i, 1);
  save();
  crudPage('reminders');
  toast('Reminder dismissed')
}

function toggleReturn(i) {
  F().sales[i].is_returned = !F().sales[i].is_returned;
  save();
  crudPage('pos');
  toast('Return status updated')
}

function filterTable(k, v) {
  document.querySelectorAll(`#table-${k} tbody tr`).forEach(x => x.style.display = x.textContent.toLowerCase().includes(v.toLowerCase()) ? '' : 'none')
}
let titles = {
  dashboard: 'Farm Overview',
  sows: 'Sow Management',
  piglets: 'Piglet Batches',
  /* [REBUILD FIX 36] Vaccination Program center. */
  vaccination: 'Vaccination Program',
  barns: 'Multi-Barn Movements & Biosecurity',
  rfid: 'RFID & EID Ear-Tag Center',
  pedigree: 'Pedigree & Breeding',
  feed: 'Feed Inventory',
  medicine: 'Medicine & Treatments',
  predictor: 'Feed Predictor',
  production: 'Production Forecast',
  semen: 'Boar Semen Inventory',
  financials: 'Financial Management',
  pos: 'POS Sales',
  reminders: 'Reminders',
  reservations: 'Reservations',
  subscription: 'Subscription',
  useradmin: 'User Access'
};

/* [REBUILD] Removed the original first go() definition; dead code —
   the guarded second go() (modal cleanup + premium gate) overrides it. */

function renderAll() {
  if (!document.body.classList.contains('farm-access-granted')) return;
  try { dashboard(); } catch (e) { console.error('Dashboard error:', e); }
  for (let k of ['sows', 'piglets', 'feed', 'semen', 'financials', 'pos', 'reminders']) {
    try { crudPage(k); } catch (e) { console.error('CrudPage error on ' + k, e); }
  }
  try { if (window.predictor) predictor(); } catch (e) {}
  try { if (window.production) production(); } catch (e) {}
  try { if (window.subscriptionPage) subscriptionPage(); } catch (e) {}
  try { if (window.adminPage) adminPage(); } catch (e) {}
  try { if (window.applyAccess) applyAccess(); } catch (e) {}
  try { if (window.injectDashboardReminders) injectDashboardReminders(); } catch (e) {}
}

function toast(s) {
  let x = document.getElementById('toast');
  if (!x) return;
  x.textContent = s;
  x.classList.add('show');
  setTimeout(() => x.classList.remove('show'), 2400);
}

function openDueWatchlist() {
  const f = (typeof F === 'function' && F()) ? F() : {};
  const due = dueThisWeek(f);
  if (!due.length) {
    toast('No sows currently due this week or overdue in this farm.');
    return;
  }
  const modalHTML = `
    <div class="due-modal-bg open" id="dueWatchlistModal" onclick="if(event.target===this)this.remove()">
      <div class="due-modal" style="max-width:680px;width:95%">
        <div class="modal-top">
          <div>
            <div class="eyebrow">FARROWING SCHEDULE · ${esc(f.name || "RM's Hog Farm")}</div>
            <h2>Sows Due This Week & Overdue</h2>
            <p class="muted">${due.length} sow${due.length > 1 ? 's' : ''} in the 110–114+ day gestation window</p>
          </div>
          <button class="close-reminder" onclick="document.getElementById('dueWatchlistModal').remove()">×</button>
        </div>
        <div class="panel table-wrap" style="margin-top:15px;max-height:60vh">
          <table class="table">
            <thead><tr><th>Sow</th><th>Parity</th><th>Gestation</th><th>Status / Due</th><th>Actions</th></tr></thead>
            <tbody>
              ${due.map((x) => {
                const gDays = days(x.insemination);
                const isOverdue = gDays > 114;
                const sowIdx = (f.sows || []).findIndex(s => s.id === x.id || s.name === x.name);
                return `<tr>
                  <td><b>${esc(x.name)}</b><br><small class="muted">${esc(x.id)} · ${esc(x.breed || 'Breed')}</small></td>
                  <td>${x.parity ?? '1'}</td>
                  <td><b>${gDays} days</b><br><small class="muted">${fmtDate(x.insemination)}</small></td>
                  <td><span class="tag ${isOverdue ? 'danger' : 'warn'}">${isOverdue ? 'OVERDUE (' + (gDays - 114) + 'd)' : 'Due ' + fmtDate(isoOff(114 - gDays))}</span></td>
                  <td style="white-space:nowrap">
                    <button type="button" class="btn ghost small" onclick="document.getElementById('dueWatchlistModal').remove();if(window.openSowProfile)openSowProfile(${sowIdx})">👁 Dossier</button>
                    <button type="button" class="btn small" onclick="document.getElementById('dueWatchlistModal').remove();if(window.openLinkedPigletModal)openLinkedPigletModal(null,'${esc(x.id)}')">🐷 Farrow</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.querySelectorAll('#dueWatchlistModal').forEach(m => m.remove());
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}
window.openDueWatchlist = openDueWatchlist;

function dashboard() {
  const f = (typeof F === 'function' && F()) ? F() : (window.DB && window.DB[window.farmId]) || {};
  if (!f) return;
  if (window.sanitizeFarm) sanitizeFarm(f);

  try {
    const ledAct = (f.pigletLedger || []).filter(x => x && !['undone', 'deleted'].includes(x.status));
    const lsum = (bid, t) => ledAct.filter(x => x.batch_id === bid && x.type === t).reduce((a, x) => a + (+x.quantity || 0), 0);
    const lsrc = (bid, t, src) => ledAct.filter(x => x.batch_id === bid && x.type === t && x.source === src).reduce((a, x) => a + (+x.quantity || 0), 0);

    const activeSows = (f.sows || []).filter(isActiveSow);
    const pregnant = (f.sows || []).filter(x => status(x) === 'Pregnant');
    const lact = (f.sows || []).filter(x => status(x) === 'Lactating');
    const pig = (f.piglets || []).filter(x => !x.archived);

    const totalPig = pig.reduce((a, x) => {
      if (window.getPigletCounts) {
        const counts = window.getPigletCounts(x);
        return a + (counts ? counts.alive : 0);
      }
      const m = +x.males || +x.male_count || 0;
      const fem = +x.females || +x.female_count || 0;
      return a + Math.max(0, m + fem - lsum(x.id, 'mortality') - lsum(x.id, 'sold'));
    }, 0);

    const boars = (f.boars || []).filter(b => b && (!b.status || String(b.status).toLowerCase() === 'active')).length;

    const fatAssigned = pig.reduce((a, b) => {
      if (window.getPigletCounts) {
        const counts = window.getPigletCounts(b);
        return a + (counts ? counts.fattener : 0);
      }
      return a + Math.max(0, lsum(b.id, 'fattener') - lsrc(b.id, 'reserved', 'fattener') + lsrc(b.id, 'cancel_reservation', 'fattener'));
    }, 0);
    const fatteners = fatAssigned;

    const totalFeedBags = (f.feed || []).reduce((a, x) => a + (+x.bags || +x.quantity || +x.qty || 0), 0);
    const feedVal = (f.feed || []).reduce((a, x) => {
      const bags = +(x.bags ?? x.quantity ?? x.qty ?? 0) || 0;
      const price = +(x.price ?? x.price_per_bag ?? x.unit_price ?? 0) || 1400;
      return a + bags * price;
    }, 0);

    const semenBottles = (f.semen || []).reduce((a, x) => {
      if (!x || typeof x !== 'object') return a;
      const count = +(x.available_bottles !== undefined ? x.available_bottles : (x.bottles || 0));
      return a + Math.max(0, count);
    }, 0);

    const tx = [...(f.transactions || []), ...(f.sales || []).map(s => ({
      type: s.is_returned ? 'Expense' : 'Income',
      amount: +s.total || +s.amount || 0,
      paid: +s.paid || +s.total || 0,
      date: s.date
    }))];
    const income = tx.filter(x => x && (x.type === 'Income' || !x.type)).reduce((a, x) => a + (+x.amount || 0), 0);
    const collected = tx.filter(x => x && (x.type === 'Income' || !x.type)).reduce((a, x) => a + (+x.paid || 0), 0);
    const expenses = tx.filter(x => x && x.type === 'Expense').reduce((a, x) => a + (+x.amount || 0), 0);
    const receivables = Math.max(0, income - collected);
    const netProfit = income - expenses;

    const dueList = dueThisWeek(f);
    const dueCount = dueList.length;
    const ironDue = window.pigletCareDue ? pigletCareDue() : pig.filter(x => (!x.iron || !x.castration) && days(x.birth) >= 3 && days(x.birth) <= 25).length;
    const vaxOverdue = (window.vaxOverdueCount ? vaxOverdueCount() : 0);

    // Compute dynamic health score
    let healthScore = 96;
    if (vaxOverdue > 0) healthScore -= Math.min(15, vaxOverdue * 5);
    if (dueList.some(s => days(s.insemination) > 114)) healthScore -= 4;
    if (totalFeedBags <= 0) healthScore -= 10;
    healthScore = Math.max(70, Math.min(100, healthScore));

    const attention = [
      ['🐖', 'Sows Due This Week', dueCount, 'openDueWatchlist()'],
      ['💉', 'Iron & Castration', ironDue, 'openPigletCare()'],
      ['🐖', 'Piglet Batches — Stage Planner', pig.length + (pig.length === 1 ? ' batch' : ' batches'), 'openFeedStagePlanner()'],
      ['◉', 'Active Reminders', (f.reminders || []).length, "go('reminders')"]
    ];

    // Herd population distribution
    const totalHerd = activeSows.length + boars + totalPig;
    const sowPct = totalHerd > 0 ? ((activeSows.length / totalHerd) * 100).toFixed(1) : '0';
    const boarPct = totalHerd > 0 ? ((boars / totalHerd) * 100).toFixed(1) : '0';
    const pigPct = totalHerd > 0 ? (((totalPig - fatteners) / totalHerd) * 100).toFixed(1) : '0';
    const fatPct = totalHerd > 0 ? ((fatteners / totalHerd) * 100).toFixed(1) : '0';

    // Post-AI 16th/21st day monitoring counts
    const todayDate = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');
    let postAICount = 0;
    activeSows.forEach(s => {
      if (!s.insemination) return;
      const insemDate = new Date(String(s.insemination).slice(0, 10) + 'T00:00:00');
      const d = Math.round((todayDate - insemDate) / 86400000);
      if (d >= 15 && d <= 24) postAICount++;
    });

    const dashEl = document.getElementById('dashboard');
    if (!dashEl) return;

    dashEl.innerHTML = `
      <div class="dash-hero">
        <div class="panel health-card">
          <div class="score-ring interactive-ring" onclick="openFarmSummaryModal()" title="Click to view full Farm Biosecurity & Operations Summary" style="background: conic-gradient(var(--teal) 0 ${healthScore * 3.6}deg, #17383a ${healthScore * 3.6}deg)">
            <div class="ring-glow-pulse"></div>
            <div class="score-inner"><strong id="dashHealthScoreNum">${healthScore}</strong><small>/100</small></div>
          </div>
          <div class="health-copy">
            <h2>${healthScore >= 90 ? 'Excellent' : healthScore >= 80 ? 'Good' : 'Needs Attention'}</h2>
            <p>Herd biosecurity & health status for <b>${esc(f.name || "RM's Hog Farm")}</b>.</p>
            <button class="btn ghost" onclick="openFarmSummaryModal()">View breakdown →</button>
          </div>
          <div class="checklist">
            <span class="${vaxOverdue ? 'bad' : ''} check-item" style="cursor:pointer" onclick="openVaccinationCenter()" title="Click to view Vaccination Program"><span class="check-ico">${vaxOverdue ? '⚠' : '✓'}</span> ${vaxOverdue ? vaxOverdue + ' vaccine follow-ups overdue' : 'No overdue vaccinations'}</span>
            <span class="check-item" style="cursor:pointer" onclick="openFeedStockSummaryModal()" title="Click to view Current Feed Stock Inventory"><span class="check-ico">✓</span> Feed inventory: ${totalFeedBags} bags</span>
            <span class="check-item" style="cursor:pointer" onclick="openMedicineSummaryModal()" title="Click to view Medicine &amp; Treatments"><span class="check-ico">✓</span> No pending treatments</span>
            <span class="check-item ${postAICount > 0 ? 'hl' : ''}" style="cursor:pointer" onclick="openPostAIMonitoringModal()" title="Click to monitor sows at 16th and 21st day post-AI milestones"><span class="check-ico">✓</span> Post-AI Monitoring${postAICount > 0 ? `: ${postAICount} on watch` : ''}</span>
          </div>
          <div id="sowMonitorPanel" class="sowmon-panel ${window.__monOpen ? 'open' : ''}"></div>
          <div id="feedShortPanel" class="sowmon-panel feed-panel"></div>
        </div>

        <div class="panel attention">
          <h3>⚠ &nbsp; ATTENTION REQUIRED</h3>
          <div class="attention-items">
            ${attention.map(x => `<div class="attention-item"${x[3] ? ` style="cursor:pointer" onclick="${x[3]}" title="Tap to open"` : ''}><span class="alert-icon">${x[0]}</span><div><b>${x[2]}</b><small>${x[1]}</small></div></div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Live Herd Population Composition Bar -->
      <div class="herd-comp-box">
        <div class="herd-comp-head">
          <span>LIVESTOCK HEADCOUNT BREAKDOWN</span>
          <span><b>${totalHerd}</b> Total Heads on Farm</span>
        </div>
        <div class="herd-comp-bar">
          <div class="herd-seg sows" style="width:${sowPct}%" title="Sows: ${activeSows.length} (${sowPct}%)"></div>
          <div class="herd-seg boars" style="width:${boarPct}%" title="Boars: ${boars} (${boarPct}%)"></div>
          <div class="herd-seg piglets" style="width:${pigPct}%" title="Piglets: ${Math.max(0, totalPig - fatteners)} (${pigPct}%)"></div>
          <div class="herd-seg fatteners" style="width:${fatPct}%" title="Fatteners: ${fatteners} (${fatPct}%)"></div>
        </div>
        <div class="herd-legend">
          <div class="herd-legend-item" style="cursor:pointer" onclick="go('sows')"><span class="herd-dot" style="background:#1cd5c2"></span> Sows: <b>${activeSows.length}</b> (${sowPct}%)</div>
          <div class="herd-legend-item" style="cursor:pointer" onclick="go('semen')"><span class="herd-dot" style="background:#3eabda"></span> Boars: <b>${boars}</b> (${boarPct}%)</div>
          <div class="herd-legend-item" style="cursor:pointer" onclick="go('piglets')"><span class="herd-dot" style="background:#68cd61"></span> Piglets: <b>${Math.max(0, totalPig - fatteners)}</b> (${pigPct}%)</div>
          <div class="herd-legend-item" style="cursor:pointer" onclick="openFattenerCenter()"><span class="herd-dot" style="background:#b87bf8"></span> Fatteners: <b>${fatteners}</b> (${fatPct}%)</div>
        </div>
      </div>

      <div class="dash-section-title">AT A GLANCE · BREEDING HERD</div>
      <div class="glance-grid">
        <div class="panel glance interactive-card" onclick="go('sows')" title="View all active sows">
          <span class="symbol">🐷</span><small>Total Sows</small><b>${activeSows.length}</b><small>Live farm count →</small>
        </div>
        <div class="panel glance interactive-card" onclick="go('sows')" title="View pregnant sows">
          <span class="symbol">❤</span><small>Pregnant Sows</small><b>${pregnant.length}</b><small>In gestation cycle →</small>
        </div>
        <div class="panel glance interactive-card" onclick="go('sows')" title="View lactating sows">
          <span class="symbol">🍼</span><small>Lactating Sows</small><b>${lact.length}</b><small>Nursing litters →</small>
        </div>
        <div class="panel glance interactive-card" onclick="go('semen')" title="View registered boars">
          <span class="symbol">♂</span><small>Active Boars</small><b>${boars}</b><small>Registered active boars →</small>
        </div>
      </div>

      <div class="section split">
        <div>
          <div class="dash-section-title">PIG PRODUCTION & GROW-FINISH</div>
          <div class="glance-grid" style="grid-template-columns:repeat(2,1fr)">
            <div class="panel glance interactive-card" onclick="go('piglets')" title="Open Piglet batches">
              <span class="symbol">🐖</span><small>Piglets Alive</small><b>${totalPig}</b><small>Across ${pig.length} active batches →</small>
            </div>
            <div class="panel glance interactive-card" onclick="openFattenerCenter()" title="Open the Fattener & grow-finish center">
              <span class="symbol">📈</span><small>Fatteners in Grow-Finish</small><b>${fatteners}</b><small>${fatAssigned ? fatAssigned + ' in batch ledger' : 'Fattener tracking active'} →</small>
            </div>
          </div>
        </div>
        <div>
          <div class="dash-section-title">FEED & SEMEN INVENTORY</div>
          <div class="glance-grid" style="grid-template-columns:repeat(2,1fr)">
            <div class="panel glance interactive-card" onclick="go('feed')" title="Open Feed Inventory">
              <span class="symbol">🛍</span><small>Feed Stock</small><b>${totalFeedBags} <small>bags</small></b><small>${peso(feedVal)} value →</small>
            </div>
            <div class="panel glance interactive-card" onclick="go('semen')" title="Open Boar Semen Inventory">
              <span class="symbol"><img src="assets/semen-bottle.png" alt="Boar Semen" style="height:30px;width:auto;object-fit:contain;vertical-align:middle;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35))"></span><small>Boar Semen</small><b>${semenBottles} <small>doses</small></b><small>Available in stock →</small>
            </div>
          </div>
        </div>
      </div>

      <div class="dash-section-title">FINANCIAL PERFORMANCE</div>
      <div class="business-grid">
        <div class="panel stat interactive-card" onclick="go('financials')" title="Open Financials">
          <span class="label">Gross Sales</span><strong class="money">${peso(income)}</strong><div class="trend">▲ Cash & receivables →</div>
        </div>
        <div class="panel stat interactive-card" onclick="go('pos')" title="Open POS Sales">
          <span class="label">Actual Collected</span><strong class="money">${peso(collected)}</strong><div class="trend">▲ Cash in hand →</div>
        </div>
        <div class="panel stat interactive-card" onclick="go('pos')" title="Open POS Sales">
          <span class="label">Outstanding Receivables</span><strong class="money" style="color:#f0b64b">${peso(receivables)}</strong><div class="trend" style="color:#f0b64b">Follow up customers →</div>
        </div>
        <div class="panel stat interactive-card" onclick="go('financials')" title="Open Financials">
          <span class="label">Net Operating Profit</span><strong class="money">${peso(netProfit)}</strong><div class="trend">${income > expenses ? 'Healthy operating margin' : 'Operating margin tracker'} →</div>
        </div>
      </div>

      <div class="section dashboard-bottom-grid">
        <div>
          <div class="section-head">
            <div><h2>Pregnant sow watchlist</h2><p>Gestation progress · Tap row to view dossier</p></div>
            <button class="btn ghost" onclick="go('sows')">Manage sows →</button>
          </div>
          <div class="panel table-wrap">
            <table class="table">
              <thead><tr><th>Sow</th><th>Parity</th><th>Inseminated</th><th>Gestation</th><th>Status / Due</th><th>Action</th></tr></thead>
              <tbody>
                ${watchlistSows(f).map(x => {
                  const gDays = days(x.insemination);
                  const isOverdue = gDays > 114;
                  const isNearDue = gDays >= 110;
                  const sowIdx = (f.sows || []).findIndex(s => s.id === x.id || s.name === x.name);
                  return `
                    <tr class="watchlist-row" onclick="if(window.openSowProfile)openSowProfile(${sowIdx})">
                      <td><b>${esc(x.name)}</b><br><small class="muted">${esc(x.id)}${x.breed ? ' · ' + esc(x.breed) : ''}</small></td>
                      <td>${x.parity ?? '1'}</td>
                      <td>${fmtDate(x.insemination)}<br><small class="muted">${esc(x.semen || x.sire || 'Boar semen')}</small></td>
                      <td><b>${gDays} days</b><br><small class="muted">${gDays <= 114 ? (114 - gDays) + 'd to farrow' : (gDays - 114) + 'd overdue'}</small></td>
                      <td><span class="tag ${isOverdue ? 'danger' : (isNearDue ? 'warn' : '')}">${isOverdue ? 'OVERDUE (' + (gDays - 114) + 'd)' : (isNearDue ? 'DUE SOON' : 'Expected ' + fmtDate(isoOff(114 - gDays)))}</span></td>
                      <td style="white-space:nowrap" onclick="event.stopPropagation()">
                        <button type="button" class="btn ghost small" onclick="if(window.openSowProfile)openSowProfile(${sowIdx})">👁 Dossier</button>
                        ${isNearDue || isOverdue ? `<button type="button" class="btn small" onclick="if(window.openLinkedPigletModal)openLinkedPigletModal(null,'${esc(x.id)}')">🐷 Farrow</button>` : ''}
                      </td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="6" class="empty">No pregnant sows recorded in this farm.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div class="section-head">
            <div><h2>Today’s tasks & reminders</h2><p>Operational schedule for ${esc(f.name || 'this farm')}</p></div>
            <button class="btn ghost" onclick="openModal('reminders')">+ Add task</button>
          </div>
          <div class="panel summary">
            ${(f.reminders || []).slice(0, 5).map(x => `
              <div class="summary-row interactive-card" style="cursor:pointer" onclick="go('reminders')">
                <span>◉ &nbsp; <b>${esc(x.title || x.name || 'Task')}</b><br><small class="muted">${esc(x.type || x.reminder_type || 'One Time')} · ${esc(x.schedule || fmtDate(x.next_trigger || x.date || TODAY))}</small></span>
                <b style="color:#57d48d">Active</b>
              </div>
            `).join('') || '<div class="empty">No active tasks scheduled. <button class="btn ghost small" style="margin-top:8px" onclick="openModal(\'reminders\')">+ Add Task</button></div>'}
          </div>
        </div>
      </div>
    `;

    if (window.__monOpen && window.renderMonitorPanel) {
      window.renderMonitorPanel();
      const el = document.getElementById('sowMonitorPanel');
      const chip = document.getElementById('sowMonChip');
      if (el) el.classList.add('open');
      if (chip) chip.classList.add('on');
    }
  } catch (err) {
    console.error('Dashboard render error:', err);
  }
}
window.dashboard = dashboard;

/* [REBUILD] Removed the original first login() definition; dead code AND a security footgun —
   it granted access without any credential check. The async Supabase login() below wins. */

async function logout() {
  // 1. Flush and save any pending data to both local storage and cloud before logging out
  try {
    save();
    if (window.ARSCloud && ARSCloud.configured() && farmId && F()) {
      await ARSCloud.pushFarm(farmId, F());
    }
  } catch(e) {}

  STORE.removeItem('ars-auth');
  if (window.ARSCloud) {
    try { await ARSCloud.signOut(); } catch(e) {}
  }
  window.currentFarmAssigned = false;
  window.platformAdminVerified = false;
  document.body.classList.remove('farm-access-granted');
  if (window.closeDueReminderAlert) window.closeDueReminderAlert();
  clearLoginError();
  const authStatus = document.getElementById('authStatus');
  if (authStatus) {
    authStatus.textContent = 'Secure sign-in active';
    authStatus.className = 'auth-status';
  }
  document.querySelectorAll('.login-screen .logo-img, .reset-screen .logo-img, .onboard-screen .logo-img').forEach(img => {
    img.src = 'assets/arswinetech-logo.png';
  });
  document.getElementById('loginScreen').style.display = 'grid';
  toast('You have been logged out');
}

function toggleTheme() {
  document.documentElement.classList.toggle('light-theme');
  STORE.setItem('ars-theme', document.documentElement.classList.contains('light-theme') ? 'light' : 'dark')
}
if (STORE.getItem('ars-theme') === 'light') document.documentElement.classList.add('light-theme'); /* Never restore dashboard access from a local flag; a verified Supabase membership is required. */
const SUPER_ADMIN_EMAIL = 'arswinetech@gmail.com';
const baseUsers = [{
  id: 'u-owner',
  email: 'arswinetech@gmail.com',
  name: 'ARSwineTech Administrator',
  farmId: 'platform',
  role: 'super_admin',
  plan: 'platform',
  access: true
}, {
  id: 'u-andy',
  email: 'manager@arswine.ph',
  name: 'Farm Manager',
  farmId: 'farm-ars',
  role: 'owner',
  plan: 'starter',
  access: true
}, {
  id: 'u-worker',
  email: 'staff@arswine.ph',
  name: 'Juan Dela Cruz',
  farmId: 'farm-ars',
  role: 'staff',
  plan: 'starter',
  access: true
}, {
  id: 'u-isidro',
  email: 'owner@sanisidro.ph',
  name: 'San Isidro Owner',
  farmId: 'farm-sample',
  role: 'owner',
  plan: 'full',
  access: true
}];

function users() {
  let u = STORE.getItem('ars-users-v1');
  if (!u) {
    STORE.setItem('ars-users-v1', JSON.stringify(baseUsers));
    return structuredClone(baseUsers)
  }
  try {
    return JSON.parse(u)
  } catch (e) {
    return structuredClone(baseUsers)
  }
}

function saveUsers(u) {
  STORE.setItem('ars-users-v1', JSON.stringify(u))
}

function currentEmail() {
  return (STORE.getItem('ars-current-email') || 'manager@arswine.ph').toLowerCase()
}

function isSuperAdmin() {
  return window.platformAdminVerified === true
}

function myUser() {
  return users().find(u => u.email.toLowerCase() === currentEmail())
}

function planForCurrentFarm() {
  return F().subscription || myUser()?.plan || 'starter'
}

function applyAccess() {
  let admin = document.getElementById('adminNav');
  if (admin && admin.style) admin.style.display = isSuperAdmin() ? 'flex' : 'none';
  let u = myUser(),
    full = isSuperAdmin() || planForCurrentFarm() === 'full' || planForCurrentFarm() === 'platform';
  document.querySelectorAll('.nav [data-page]').forEach(b => {
    if (!b || !b.style) return;
    let premium = ['predictor', 'production', 'semen', 'financials', 'pos'].includes(b.dataset.page);
    if (premium && !full) {
      b.style.opacity = '.45';
      b.title = 'Full Access subscription required';
    } else if (b.dataset.page !== 'useradmin') b.style.opacity = '';
  });
  let header = document.querySelector('.user span');
  if (header) {
    header.innerHTML = `${isSuperAdmin()?'ARSwineTech Admin':(u?.name||'Farm User')}<br><b style="color:var(--ink)">${isSuperAdmin()?'Platform Owner':(u?.role||'Staff')}</b>`;
  }
}

function subscriptionPage() {
  let current = planForCurrentFarm(),
    plans = [
      ['starter', 'Starter', '₱499 / month', ['Dashboard and herd records', 'Sows, piglets and feed', 'Reminders and local offline data']],
      ['full', 'Full Access', '₱1,299 / month', ['All pages and forecasting', 'Finance, POS and semen inventory', 'Cloud backup and multi-device sync', 'Priority farm support']],
      ['platform', 'Platform Admin', 'Private', ['All Full Access features', 'User and farm administration', 'Available only to ARSwineTech']]
    ];
  document.getElementById('subscription').innerHTML = `<div class="panel subscription-hero"><div><div class="eyebrow">YOUR FARM PLAN</div><h2>${current==='full'?'Full Access':'Starter'} subscription</h2><p class="muted">Upgrade when you are ready to unlock your farm’s complete operational toolkit.</p></div><span class="tag">${current==='full'?'ACTIVE · FULL ACCESS':current==='platform'?'PLATFORM ADMIN':'ACTIVE · STARTER'}</span></div><div class="section subscription-plans">${plans.map(p=>`<div class="panel plan-card ${p[0]==='full'?'featured':''}"><div class="plan-label">${p[0]==='full'?'MOST COMPLETE':'ARSWINETECH PRO'}</div><h2>${p[1]}</h2><div class="price">${p[2]}</div><ul>${p[3].map(x=>`<li>${x}</li>`).join('')}</ul>${p[0]==='platform'?'<button class="btn ghost" disabled>Administrator only</button>':p[0]===current?'<button class="btn ghost" disabled>Current plan</button>':`<button class="btn" onclick="choosePlan('${p[0]}')">${p[0]==='full'?'Upgrade to Full Access':'Select Starter'}</button>`}</div>`).join('')}</div><p class="muted" style="font-size:12px;margin-top:16px">Prototype checkout: selecting a plan updates access immediately. Production checkout should connect to Google Play Billing, Apple In-App Purchase, or a PCI-compliant payment provider and validate the subscription on the server.</p>`
}

function choosePlan(plan) {
  if (isSuperAdmin()) return;
  F().subscription = plan;
  let list = users(),
    u = list.find(x => x.email.toLowerCase() === currentEmail());
  if (u) u.plan = plan;
  saveUsers(list);
  save();
  applyAccess();
  subscriptionPage();
  toast(plan === 'full' ? 'Full Access activated' : 'Starter plan selected')
}

async function adminPage() {
  if (!isSuperAdmin()) {
    document.getElementById("useradmin").innerHTML = "<div class=\"panel empty\">Administrator access is required.</div>";
    return;
  }

  let us = users().filter(u => !String(u.email || '').toLowerCase().includes('@arswine-test.ph'));
  const userMap = new Map(us.map(u => [String(u.email || '').trim().toLowerCase(), u]));

  // 1. Fetch live registered platform users from Supabase or cloud controller
  if (window.ARSCloud && typeof ARSCloud.listPlatformUsers === "function") {
    try {
      const liveList = await ARSCloud.listPlatformUsers();
      if (Array.isArray(liveList) && liveList.length > 0) {
        liveList.forEach(u => {
          if (!u || !u.email) return;
          const email = String(u.email || '').trim().toLowerCase();
          if (email.includes('@arswine-test.ph')) return;
          const fName = u.farm_name || (u.farm_id === 'platform' ? 'ARSwineTech Platform' : (DB[u.farm_id]?.name || (u.farm_id && u.farm_id !== 'null' ? u.farm_id : "RM's Hog Farm")));
          userMap.set(email, {
            user_id: u.id,
            id: u.id,
            name: u.name || (u.email ? u.email.split("@")[0] : "User"),
            email: u.email,
            farmId: u.farm_id || u.farmId,
            farmName: fName,
            role: u.role || 'staff',
            plan: u.plan || 'starter',
            access: u.is_active !== false,
            created_at: u.created_at
          });
        });
      }
    } catch (e) {
      console.warn("Live user list fetch note:", e);
    }
  }

  // 2. Query team members across all registered farms (e.g. invite-code joins)
  if (window.ARSCloud && typeof ARSCloud.getFarmMembers === "function" && window.DB) {
    try {
      for (const fId of Object.keys(DB)) {
        if (fId.includes('e2e') || fId.includes('lint')) continue;
        const farmName = DB[fId]?.name || fId;
        const members = await ARSCloud.getFarmMembers(fId).catch(() => []);
        if (Array.isArray(members)) {
          members.forEach(m => {
            if (!m || !m.email) return;
            const email = String(m.email).trim().toLowerCase();
            if (email.includes('@arswine-test.ph')) return;
            const existing = userMap.get(email);
            if (!existing) {
              userMap.set(email, {
                user_id: m.user_id,
                id: m.user_id,
                name: email.split('@')[0],
                email: m.email,
                farmId: fId,
                farmName: farmName,
                role: m.role || 'staff',
                plan: m.plan || 'starter',
                access: m.is_active !== false,
                created_at: m.created_at || new Date().toISOString()
              });
            } else {
              if (m.user_id && !existing.user_id) {
                existing.user_id = m.user_id;
                existing.id = m.user_id;
              }
              if (fId && (!existing.farmId || existing.farmId === 'unassigned' || existing.farmId === 'platform')) {
                if (existing.role !== 'super_admin') {
                  existing.farmId = fId;
                  existing.farmName = farmName;
                }
              }
              if (m.role && existing.role !== 'super_admin') existing.role = m.role;
              if (m.is_active !== undefined) existing.access = m.is_active !== false;
            }
          });
        }
      }
    } catch (e) {
      console.warn("Farm members sync note:", e);
    }
  }

  // 3. Fetch members across all farms and invitation code registrations (local/demo storage)
  try {
    const demoMemberships = JSON.parse(STORE.getItem('ars-demo-memberships-v1') || '{}');
    Object.entries(demoMemberships).forEach(([em, m]) => {
      const email = String(em).trim().toLowerCase();
      if (email.includes('@arswine-test.ph')) return;
      const fName = (window.DB && m.farm_id && DB[m.farm_id]?.name) || (m.farm_id === 'platform' ? 'ARSwineTech Platform' : (m.farm_id ? m.farm_id : "RM's Hog Farm"));
      if (!userMap.has(email)) {
        userMap.set(email, {
          name: email.split('@')[0],
          email: email,
          farmId: m.farm_id,
          farmName: fName,
          role: m.role || 'staff',
          plan: 'starter',
          access: true,
          created_at: new Date().toISOString()
        });
      } else {
        const u = userMap.get(email);
        if (m.farm_id && u.role !== 'super_admin') {
          u.farmId = m.farm_id;
          u.farmName = fName;
        }
        if (m.role && u.role !== 'super_admin') u.role = m.role;
      }
    });
  } catch(e) {}

  us = Array.from(userMap.values()).filter(u => !String(u.email || '').toLowerCase().includes('@arswine-test.ph'));
  saveUsers(us);

  const container = document.getElementById("useradmin");
  if (!container) return;
  container.innerHTML = `
    <div class="panel admin-banner">♚ <div><b>ARSwineTech Platform Administration</b><br><span class="muted">Manage registered users, farm roles, access status and subscription entitlement in real-time.</span></div></div>
    <div class="toolbar">
      <div class="toolbar-left"><input class="search" placeholder="Search registered users" oninput="filterTable('useradmin',this.value)"></div>
      <div class="toolbar-right" style="display:flex;gap:8px;align-items:center;">
        <button type="button" class="btn ghost" onclick="purgeTestAccountsAdmin()" title="Purge any leftover test accounts and dummy test farms">🧹 Purge Test Data</button>
        <button type="button" class="btn ghost" onclick="adminPage()" title="Refresh live cloud user list">⟳ Refresh</button>
        <div class="tag">${us.length} registered users</div>
      </div>
    </div>
    <div class="panel table-wrap"><table class="table" id="table-useradmin"><thead><tr><th>User</th><th>Farm</th><th>Role</th><th>Plan / Access</th><th>Actions</th></tr></thead><tbody>
    ${us.map((u, i) => `
      <tr>
        <td><b>${esc(u.name)}</b><br><small class="muted">${esc(u.email)}</small></td>
        <td>${esc(u.farmName && u.farmName !== 'null' ? u.farmName : (u.farmId === "platform" ? "ARSwineTech Platform" : (DB[u.farmId]?.name || (u.farmId && u.farmId !== 'null' ? u.farmId : "RM's Hog Farm"))))}</td>
        <td>
          <select class="select" ${u.role === "super_admin" ? "disabled" : ""} onchange="changeUser(${i},'role',this.value)">
            ${["owner", "manager", "staff", "viewer", "super_admin"].map(r => `<option value="${r}" ${u.role === r ? "selected" : ""}>${r.replace("_", " ").toUpperCase()}</option>`).join("")}
          </select>
        </td>
        <td>
          <select class="select" ${u.role === "super_admin" ? "disabled" : ""} onchange="changeUser(${i},'plan',this.value)">
            <option value="starter" ${u.plan === "starter" ? "selected" : ""}>Starter</option>
            <option value="full" ${u.plan === "full" ? "selected" : ""}>Full Access</option>
            <option value="platform" ${u.plan === "platform" || u.role === "super_admin" ? "selected" : ""}>Platform</option>
          </select>
          <label style="margin-left:9px;font-size:12px">
            <input class="access-toggle" type="checkbox" ${u.access ? "checked" : ""} ${u.role === "super_admin" ? "disabled" : ""} onchange="changeUser(${i},'access',this.checked)"> Active
          </label>
        </td>
        <td style="white-space:nowrap">
          <button class="btn ghost" onclick="saveUserAccessRow(${i})">Save</button>
          <button type="button" class="btn ghost delete-action" title="Permanently delete this user" ${u.email.toLowerCase() === currentEmail() ? "disabled" : ""} onclick="deleteUserComplete('${esc(u.email)}')">🗑</button>
        </td>
      </tr>
    `).join("")}
    </tbody></table></div>
    <div class="admin-farm-sec">
      <div class="dash-section-title">REGISTERED FARMS · ADMIN ONLY</div>
      <p class="muted admin-farm-note">Complete erase removes the farm and <b>all</b> of its data — on this device and in the cloud. This cannot be undone.</p>
      <div class="panel table-wrap"><table class="table" id="table-farmadmin"><thead><tr><th>Farm</th><th>Records</th><th>Batches</th><th>Sows</th><th>Delete</th><th>Invite code</th></tr></thead><tbody>${window.farmAdminRowsHTML ? farmAdminRowsHTML() : ""}</tbody></table></div>
    </div>
    <div class="notice" style="margin-top:15px"><b>Security:</b><span>Platform users and farm roles are synchronized in real-time with PostgreSQL authentication and RLS tenant policies.</span></div>
  `;
}

async function purgeTestAccountsAdmin() {
  if (!confirm("Purge all test accounts (*@arswine-test.ph) and test farm records from cloud and local storage?")) return;
  try {
    if (window.ARSCloud && typeof ARSCloud.purgeTestAccounts === "function") {
      await ARSCloud.purgeTestAccounts();
    }
    // Clean local users
    const filtered = users().filter(u => !String(u.email || '').toLowerCase().includes('@arswine-test.ph'));
    saveUsers(filtered);

    // Clean local DB test farms
    Object.keys(DB || {}).forEach(k => {
      if (k.includes('e2e') || k.includes('lint') || DB[k]?.name?.includes('E2E Live') || DB[k]?.name?.includes('Lint Verify')) {
        delete DB[k];
      }
    });
    save();
    toast("✓ Successfully purged test accounts and dummy test farms.");
    adminPage();
  } catch (e) {
    console.warn("Purge test accounts note:", e);
    toast("✓ Local test accounts purged.");
    adminPage();
  }
}
window.purgeTestAccountsAdmin = purgeTestAccountsAdmin;

async function changeUser(i, key, value) {
  let us = users();
  let u = us[i];
  if (!u || u.role === "super_admin") return;
  u[key] = value;
  saveUsers(us);

  if (key === "plan" && DB[u.farmId]) {
    DB[u.farmId].subscription = value;
    save();
  }

  // Real-time sync of role/plan/access to Supabase backend
  if (window.ARSCloud && ARSCloud.updateMemberAccess && u.farmId && (key === 'role' || key === 'plan' || key === 'access')) {
    try {
      await ARSCloud.updateMemberAccess(u.farmId, u.user_id || u.id || u.email, u.role, u.plan, u.access);
      toast(`✓ Updated ${u.name} role to ${String(u.role).toUpperCase()}`);
    } catch (e) {
      console.warn("[User Access Sync] updateMemberAccess error:", e);
    }
  }
}
window.changeUser = changeUser;

async function saveUserAccessRow(i) {
  let us = users();
  let u = us[i];
  if (!u) return;
  saveUsers(us);
  if (window.ARSCloud && ARSCloud.updateMemberAccess && u.farmId) {
    try {
      await ARSCloud.updateMemberAccess(u.farmId, u.user_id || u.id || u.email, u.role, u.plan, u.access);
    } catch(e) {
      console.warn("Cloud member access update note:", e);
    }
  }
  toast(`✓ Access confirmed for ${u.name} (${String(u.role).toUpperCase()})`);
}
window.saveUserAccessRow = saveUserAccessRow;


function go(page) {
  document.querySelectorAll('#reservationDetail,#batchHub,#drillModal,#dueReminderModal,#reservationModal,#allocationModal,#releaseModal,.due-modal-bg,.drill-bg').forEach(x => x.remove());
  document.body.classList.remove('app-modal-open');
  document.body.style.pointerEvents = '';
  document.body.style.overflow = '';
  if (page === 'dashboard') {
    dashboard();
    setTimeout(() => window.decorateDashboard?.(), 0);
  }
  if (page === 'barns') {
    setTimeout(() => window.renderBarns?.(), 0);
  }
  if (page === 'rfid') {
    setTimeout(() => window.renderRFID?.(), 0);
  }
  if (page === 'useradmin') {
    setTimeout(() => adminPage(), 0);
  }
  const premium = ['predictor', 'production', 'semen', 'financials', 'pos'];
  if (premium.includes(page) && !isSuperAdmin() && planForCurrentFarm() !== 'full' && planForCurrentFarm() !== 'platform') {
    page = 'subscription';
    toast('Full Access subscription required for that feature')
  }
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  document.getElementById(page).classList.add('active');
  document.querySelectorAll('[data-page]').forEach(x => x.classList.toggle('active', x.dataset.page === page));
  document.getElementById('pageTitle').textContent = titles[page];
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}
// override login to register the signed-in address in the local directory and apply platform permissions.
function showLoginError(message) {
  let box = document.getElementById('loginError');
  if (box) {
    box.textContent = message;
    box.classList.add('show')
  }
}

function clearLoginError() {
  let box = document.getElementById('loginError');
  if (box) {
    box.textContent = '';
    box.classList.remove('show')
  }
}

function authError(id, message) {
  let box = document.getElementById(id);
  if (box) {
    box.textContent = message;
    box.classList.add('show')
  }
}

function clearAuthError(id) {
  let box = document.getElementById(id);
  if (box) {
    box.textContent = '';
    box.classList.remove('show')
  }
}
async function finishAuthenticated(email) {
  let us = users();
  if (!us.find(u => u.email.toLowerCase() === email)) {
    us.push({
      id: 'u-' + Date.now(),
      email,
      name: email.split('@')[0],
      farmId: null,
      role: 'owner',
      plan: 'starter',
      access: true
    });
    saveUsers(us)
  }
  let account = us.find(u => u.email.toLowerCase() === email);
  if (account && !account.access) {
    showLoginError('This account has been disabled. Contact your farm administrator.');
    return
  }
  STORE.setItem('ars-auth', '1');
  STORE.setItem('ars-current-email', email);
  document.getElementById('loginScreen').style.display = 'none';
  if (email !== SUPER_ADMIN_EMAIL) {
    try {
      let membership = await ARSCloud.hasFarm();
      if (!membership) {
        document.getElementById('onboardScreen').classList.add('open');
        return
      }
      farmId = membership.farm_id;
      account.farmId = farmId;
      saveUsers(us)
    } catch (err) {
      showLoginError('Signed in, but the farm check failed. Please refresh and try again.');
      document.getElementById('loginScreen').style.display = 'grid';
      return
    }
  }
  setFarmSelect();
  renderAll();
  applyAccess();
  toast(`Welcome back, ${account?.name||'Farm User'}`)
}
async function login(e) {
  if (e) e.preventDefault();
  clearLoginError();
  let field = document.querySelector('.login-card input[type="email"]'),
    password = document.querySelector('.login-card input[type="password"]')?.value || '',
    email = (field?.value || '').trim().toLowerCase();
  if (!email || !password) {
    showLoginError('Enter your email address and password, then try again.');
    return;
  }
  if (!window.ARSCloud) {
    showLoginError('The cloud sign-in service did not load. Refresh this page and try again.');
    return;
  }
  try {
    await ARSCloud.signIn(email, password);
    await finishAuthenticated(email);
  } catch (err) {
    const msg = err && err.message ? err.message : '';
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
      showLoginError('Invalid email or password. Please verify your password or reset it in Supabase Auth.');
    } else {
      showLoginError(msg || 'Unable to sign in. Check your email and password.');
    }
  }
}
async function registerAccount() {
  clearLoginError();
  let email = document.querySelector('.login-card input[type="email"]')?.value.trim().toLowerCase(),
    password = document.querySelector('.login-card input[type="password"]')?.value || '';
  if (!email || !password || password.length < 6) {
    showLoginError('Enter an email and a password with at least 6 characters.');
    return;
  }
  if (!window.ARSCloud) {
    showLoginError('The cloud registration service did not load. Refresh this page and try again.');
    return;
  }
  try {
    let result = await ARSCloud.signUp(email, password);
    if (result && (result.session || result.access_token)) {
      await finishAuthenticated(email);
    } else {
      showLoginError('Account created! Please sign in with your password.');
    }
  } catch (err) {
    const msg = err && err.message ? err.message : '';
    if (msg.includes('User already registered') || msg.includes('user_already_exists')) {
      showLoginError('This email is already registered in Supabase. Please sign in with your password.');
    } else {
      showLoginError(msg || 'Unable to create account.');
    }
  }
}

function showResetRequest() {
  clearAuthError('resetError');
  document.getElementById('resetScreen').classList.add('open');
  document.getElementById('resetRequestForm').style.display = 'block';
  document.getElementById('resetNewForm').style.display = 'none';
  document.getElementById('resetTitle').textContent = 'Reset your password';
  document.getElementById('resetText').textContent = 'Enter your account email and we will send a secure password reset link.';
  document.getElementById('resetEmail').value = document.querySelector('.login-card input[type="email"]')?.value || ''
}

function closeReset() {
  document.getElementById('resetScreen').classList.remove('open')
}
async function requestPasswordReset() {
  clearAuthError('resetError');
  let email = document.getElementById('resetEmail').value.trim();
  if (!email) {
    authError('resetError', 'Enter the email address for your ARSwineTech account.');
    return
  }
  try {
    await ARSCloud.sendPasswordReset(email, location.origin + location.pathname);
    document.getElementById('resetRequestForm').style.display = 'none';
    document.getElementById('resetText').textContent = 'If that email belongs to an account, Supabase has sent a secure reset link. Check your inbox and spam folder.'
  } catch (err) {
    authError('resetError', err.message || 'Could not send a reset link. Try again.')
  }
}

function openNewPassword() {
  clearAuthError('resetError');
  document.getElementById('resetScreen').classList.add('open');
  document.getElementById('resetRequestForm').style.display = 'none';
  document.getElementById('resetNewForm').style.display = 'block';
  document.getElementById('resetTitle').textContent = 'Create a new password';
  document.getElementById('resetText').textContent = 'This page is protected by your one-time Supabase recovery link.'
}
async function completePasswordReset() {
  clearAuthError('resetError');
  let a = document.getElementById('newPassword').value,
    b = document.getElementById('confirmPassword').value;
  if (a.length < 6) {
    authError('resetError', 'Use at least 6 characters for your new password.');
    return
  }
  if (a !== b) {
    authError('resetError', 'The passwords do not match.');
    return
  }
  try {
    await ARSCloud.updatePassword(a);
    document.getElementById('resetText').textContent = 'Password updated successfully. You can now sign in.';
    document.getElementById('resetNewForm').style.display = 'none';
    setTimeout(closeReset, 1800)
  } catch (err) {
    authError('resetError', err.message || 'The reset link is invalid or expired. Request a new one.')
  }
}
async function completeOnboarding(e) {
  e.preventDefault();
  let data = Object.fromEntries(new FormData(e.target));
  let err = document.getElementById('onboardError');
  err.classList.remove('show');
  try {
    let id = await ARSCloud.onboard(data);
    DB[id] = {
      name: data.farm_name,
      sows: [],
      piglets: [],
      feed: [],
      semen: [],
      transactions: [],
      sales: [],
      reminders: [],
      subscription: 'starter'
    };
    farmId = id;
    STORE.setItem('arswine-active-farm', farmId);
    save();
    let list = users(),
      u = list.find(x => x.email.toLowerCase() === currentEmail());
    if (u) {
      u.name = `${data.first_name} ${data.last_name}`;
      u.farmId = id;
      u.role = 'owner';
      u.plan = 'starter';
      saveUsers(list)
    }
    document.getElementById('onboardScreen').classList.remove('open');
    setFarmSelect();
    renderAll();
    applyAccess();
    toast('Your secure farm workspace is ready.')
  } catch (ex) {
    err.textContent = ex.message || 'Could not create your farm workspace. Please try again.';
    err.classList.add('show')
  }
}
if (window.ARSCloud && ARSCloud.captureRecoverySession()) setTimeout(openNewPassword, 50);
async function startApp() {
  const offlineSnapshot = await deviceRead();
  if (offlineSnapshot && typeof offlineSnapshot === 'object') {
    Object.entries(offlineSnapshot).forEach(([k, v]) => {
      if (v && typeof v === 'object') {
        if (!DB[k]) {
          DB[k] = v;
        } else {
          const curCount = (DB[k].sows?.length || 0) + (DB[k].boars?.length || 0);
          const offCount = (v.sows?.length || 0) + (v.boars?.length || 0);
          if (offCount > curCount) {
            DB[k] = v;
          }
        }
      }
    });
  }

  // Pre-fill remembered email into login screen
  const rememberedEmail = (STORE.getItem('ars-current-email') || '').toLowerCase();
  const emailInput = document.getElementById('loginEmailInput') || document.querySelector('.login-card input[type="email"]');
  if (emailInput && rememberedEmail) {
    emailInput.value = rememberedEmail;
  }

  // Set active farm to the one with the real data
  farmId = getBestFarmId();
  window.farmId = farmId;
  STORE.setItem('arswine-active-farm', farmId);

  // Restore authenticated session on page refresh/boot
  const isAuthenticated = STORE.getItem('ars-auth') === '1';
  const currentEmailStr = (STORE.getItem('ars-current-email') || '').toLowerCase();
  
  if (isAuthenticated && currentEmailStr) {
    window.currentFarmAssigned = true;
    if (currentEmailStr === 'arswinetech@gmail.com') {
      window.platformAdminVerified = true;
      window.myFarmRole = 'platform';
    }
    document.body.classList.add('farm-access-granted');
    const loginScr = document.getElementById('loginScreen');
    if (loginScr) loginScr.style.display = 'none';
  }

  setFarmSelect();
  applyAccess();

  if (document.body.classList.contains('farm-access-granted')) {
    renderAll();
  }

  // Background cloud synchronization if session was previously restored
  if (window.ARSCloud && ARSCloud.configured() && isAuthenticated) {
    try {
      if (farmId && ARSCloud.pullFarm) {
        const res = await ARSCloud.pullFarm(farmId);
        if (res && res.success !== false) {
          if (window.applyCustomLogo) window.applyCustomLogo();
          if (window.renderAll) renderAll();
        }
      }
    } catch(e) {
      console.warn("[startApp] Cloud sync note:", e);
    }
  }
}
let st = document.getElementById('authStatus');
if (st) {
  st.textContent = '✓ Secure cloud sign-in ready';
  st.className = 'auth-status ready';
}
document.querySelectorAll('[data-page]').forEach(x => x.onclick = () => go(x.dataset.page));

function bootApp() {
  startApp().then(() => {
    if (document.body.classList.contains('farm-access-granted')) {
      renderAll();
    }
  }).catch(e => console.warn('App boot note:', e));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  setTimeout(bootApp, 30);
}

window.renderAll = renderAll;
window.crudPage = crudPage;
window.dashboard = dashboard;
window.predictor = predictor;
window.production = production;
window.subscriptionPage = subscriptionPage;
window.adminPage = adminPage;
window.applyAccess = applyAccess;
window.go = go;
window.save = save;
window.status = status;
window.fmtDate = fmtDate;
window.d = d;
window.days = days;
window.peso = peso;
window.isActiveSow = isActiveSow;
window.esc = esc;
window.isoOff = isoOff;
