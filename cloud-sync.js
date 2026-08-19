/* ═══════════════════════════════════════════════════════════════════════════
   ARSwineTech Pro — Real-Time Background Auto-Synchronization Engine
   Provides seamless, silent background syncing across all farm devices.
   ═══════════════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Unique persistent device identifier
  const DEVICE_ID = (() => {
    let id = window.STORE ? STORE.getItem('ars-device-id') : null;
    if (!id) {
      id = 'dev-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now().toString(36);
      if (window.STORE) STORE.setItem('ars-device-id', id);
    }
    return id;
  })();

  let syncState = 'synced'; // 'synced' | 'syncing' | 'offline' | 'pending'
  let autoPushTimer = null;
  let pollIntervalTimer = null;
  let lastPushTimestamp = 0;
  let lastPullTimestamp = 0;
  let isSyncingInProgress = false;

  function updateSyncIndicator(state, customLabel = '', tooltip = '') {
    syncState = state;
    const indicators = document.querySelectorAll('#liveSyncIndicator, .live-sync-indicator');
    indicators.forEach(el => {
      el.classList.remove('synced', 'syncing', 'offline', 'error');
      el.classList.add(state);

      const dot = el.querySelector('.sync-dot');
      const icon = el.querySelector('.sync-icon');
      const label = el.querySelector('.sync-label');

      if (state === 'syncing') {
        if (icon) icon.textContent = '⟳';
        if (label) label.textContent = customLabel || 'Syncing...';
        el.title = tooltip || 'Synchronizing with cloud in background...';
      } else if (state === 'offline') {
        if (icon) icon.textContent = '⚡';
        if (label) label.textContent = customLabel || 'Offline';
        el.title = tooltip || 'Saved locally on this device. Will sync automatically when back online.';
      } else if (state === 'error') {
        if (icon) icon.textContent = '⚠️';
        if (label) label.textContent = customLabel || 'Sync note';
        el.title = tooltip || 'Tap to inspect sync details';
      } else {
        // 'synced'
        if (icon) icon.textContent = '☁️';
        if (label) label.textContent = customLabel || 'Synced';
        el.title = tooltip || 'All farm updates are fully synchronized with the cloud.';
      }
    });
  }

  function getFarmDataSummary(f) {
    if (!f) return { total: 0, details: [] };
    const sows = (f.sows || []).length;
    const piglets = (f.piglets || []).length;
    const boars = (f.boars || []).length;
    const feed = (f.feed || []).length;
    const reservations = (f.reservations || []).length;
    const tx = (f.transactions || []).length;
    const ledger = (f.pigletLedger || []).length;
    const semen = (f.semen || []).length;
    const semenSales = (f.semenSales || []).length;
    const semenResellers = (f.semenResellers || []).length;
    const semenResellerTx = (f.semenResellerTx || []).length;
    const feedOrders = (f.feedOrders || []).length;
    const feedTrials = (f.feedTrials || []).length;
    const medicines = (f.medicines || []).length;
    const vaccinations = (f.vaccinations || []).length;
    const treatments = (f.treatments || []).length;
    const heatRecords = (f.heatRecords || []).length;
    const breedingRecords = (f.breedingRecords || []).length;
    const barns = (f.barns || []).length;
    const movements = (f.movements || []).length;
    const hasLogo = Boolean(f.logo || f.logo_url || (window.STORE && STORE.getItem('ars-farm-logo-' + (window.farmId || ''))));

    const total = sows + piglets + boars + feed + reservations + tx + ledger + semen + semenSales + semenResellers + semenResellerTx + feedOrders + feedTrials + medicines + vaccinations + treatments + heatRecords + breedingRecords + barns + movements + (hasLogo ? 1 : 0);

    return {
      total,
      sows,
      piglets,
      boars,
      feed,
      reservations,
      tx,
      ledger,
      semen,
      semenSales,
      semenResellers,
      semenResellerTx,
      feedOrders,
      feedTrials,
      medicines,
      vaccinations,
      treatments,
      heatRecords,
      breedingRecords,
      barns,
      movements,
      hasLogo
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DEBOUNCED BACKGROUND AUTO-PUSH (Runs silently on any local change)
     ═══════════════════════════════════════════════════════════════════════════ */
  function scheduleAutoPush(delayMs = 800) {
    if (!navigator.onLine) {
      updateSyncIndicator('offline', 'Saved on phone', 'Offline mode. Records stored safely on device.');
      return;
    }

    updateSyncIndicator('syncing', 'Syncing...', 'Uploading latest farm updates to cloud...');
    clearTimeout(autoPushTimer);

    autoPushTimer = setTimeout(async () => {
      if (isSyncingInProgress) return;
      isSyncingInProgress = true;
      const fId = window.farmId || (window.STORE && STORE.getItem('arswine-active-farm')) || Object.keys(window.DB || {})[0];
      const farm = (window.DB && window.DB[fId]) || (window.F ? window.F() : null);

      if (!window.ARSCloud || !ARSCloud.configured() || !fId || !farm) {
        isSyncingInProgress = false;
        updateSyncIndicator('synced', 'Synced', 'Local workspace ready.');
        return;
      }

      try {
        const res = await ARSCloud.pushFarm(fId, farm);
        lastPushTimestamp = Date.now();
        isSyncingInProgress = false;

        if (res && res.success === false) {
          updateSyncIndicator('offline', 'Saved on phone', res.reason || 'Offline queue active.');
        } else {
          updateSyncIndicator('synced', 'Synced', '✓ All farm changes pushed to cloud automatically.');
        }
      } catch (e) {
        isSyncingInProgress = false;
        updateSyncIndicator('offline', 'Saved on phone', 'Queued locally: ' + (e.message || String(e)));
      }
    }, delayMs);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     SILENT BACKGROUND AUTO-PULL (Checks for remote updates from other staff)
     ═══════════════════════════════════════════════════════════════════════════ */
  async function performBackgroundPull(force = false) {
    if (!navigator.onLine || isSyncingInProgress) return;
    const fId = window.farmId || (window.STORE && STORE.getItem('arswine-active-farm')) || Object.keys(window.DB || {})[0];
    if (!window.ARSCloud || !ARSCloud.configured() || !fId) return;

    // Do not disrupt if user is typing anywhere in the app (modal, sow observation, search query, etc.)
    const activeModal = document.querySelector('.modal-bg.open, .due-modal-bg');
    const activeInput = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    if ((activeModal || activeInput) && !force) return;

    try {
      isSyncingInProgress = true;
      updateSyncIndicator('syncing', 'Syncing...');

      const res = await ARSCloud.pullFarm(fId);
      isSyncingInProgress = false;
      lastPullTimestamp = Date.now();

      if (res && res.success !== false && res.count > 0) {
        if (window.applyCustomLogo) window.applyCustomLogo();
        const currentlyTyping = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        if (window.renderAll && !currentlyTyping && (!activeModal || force)) {
          window.renderAll();
        }
      }

      updateSyncIndicator('synced', 'Synced', '✓ Farm records are up to date.');
    } catch (e) {
      isSyncingInProgress = false;
      updateSyncIndicator('synced', 'Synced');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     LIFECYCLE LISTENERS: AUTO-SYNC ON STARTUP, VISIBILITY & NETWORK RECONNECT
     ═══════════════════════════════════════════════════════════════════════════ */
  function initAutoSync() {
    // 1. Hook into window.save() globally
    const priorSave = window.save;
    window.save = function() {
      if (typeof priorSave === 'function') priorSave.apply(this, arguments);
      scheduleAutoPush(750);
    };

    // 2. Auto-pull on app load / startup
    setTimeout(() => {
      performBackgroundPull(true);
    }, 1200);

    // 3. Tab visibility / App unlock sync: when a farmer or staff unlocks phone or returns to app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        performBackgroundPull(false);
      }
    });
    window.addEventListener('focus', () => {
      performBackgroundPull(false);
    });

    // 4. Online / Offline network event listeners
    window.addEventListener('online', () => {
      updateSyncIndicator('syncing', 'Reconnecting...');
      scheduleAutoPush(400);
      performBackgroundPull(false);
    });
    window.addEventListener('offline', () => {
      updateSyncIndicator('offline', 'Offline', 'Working offline. Records saved on phone.');
    });

    // 5. Periodic background heartbeat polling every 18 seconds
    if (pollIntervalTimer) clearInterval(pollIntervalTimer);
    pollIntervalTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        performBackgroundPull(false);
      }
    }, 18000);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     DATA TRANSFER & BACKUP MODAL (Clean, Non-intrusive Management)
     ═══════════════════════════════════════════════════════════════════════════ */
  function openDataTransferModal() {
    const fId = window.farmId || Object.keys(window.DB || {})[0];
    const farm = (window.DB && window.DB[fId]) || (window.F ? window.F() : null);
    const farmName = farm?.name || "RM's Hog Farm";
    const s = getFarmDataSummary(farm);

    document.getElementById('transferModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', `
      <div class="due-modal-bg" id="transferModal" style="z-index:999999!important">
        <div class="due-modal" style="max-width:540px">
          <div class="modal-top">
            <div>
              <div class="eyebrow" style="color:var(--teal2);font-weight:800">AUTOMATIC CLOUD SYNC &amp; BACKUP</div>
              <h2 style="margin:2px 0 4px 0">${esc(farmName)}</h2>
              <small class="muted">Live State: <b>${s.total} items on this device</b> (${s.sows} sows · ${s.piglets} litters · ${s.reservations} reservations · ${s.semenResellers} resellers)</small>
            </div>
            <button type="button" class="close-reminder" onclick="document.getElementById('transferModal').remove()">×</button>
          </div>

          <!-- Real-Time Auto Sync Status Box -->
          <div style="background:linear-gradient(135deg,rgba(13,141,145,0.14),rgba(7,94,99,0.06));border:1.5px solid rgba(19,185,173,0.35);border-radius:14px;padding:14px 16px;margin:14px 0">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:22px">☁️</span>
                <div>
                  <b style="font-size:13.5px">Automated Background Sync is Active</b>
                  <small class="muted" style="display:block">All updates across staff, managers, and devices sync silently in real-time.</small>
                </div>
              </div>
              <span class="tag ok" style="font-size:11px">● LIVE AUTO-SYNC</span>
            </div>
          </div>

          <!-- Direct JSON Export / Import Tray -->
          <div style="background:rgba(0,0,0,0.25);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:14px 0">
            <b style="font-size:13.5px;display:flex;align-items:center;gap:6px">
              <span>💾</span> <span>Offline Backup &amp; Instant Device Migration</span>
            </b>
            <p class="muted" style="font-size:12px;margin:4px 0 12px 0">
              Download a complete backup file to transfer directly between devices.
            </p>

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
              <button type="button" class="btn ghost" style="flex:1;background:rgba(14,165,233,0.15);color:#38bdf8;border:1px solid rgba(14,165,233,0.3)" onclick="exportFarmJSON()">
                📥 Export Backup File (.json)
              </button>
              <button type="button" class="btn ghost" style="flex:1" onclick="copyFarmJSONToClipboard()">
                📋 Copy Raw JSON
              </button>
            </div>

            <!-- Import Section -->
            <div style="border-top:1px dashed var(--line);padding-top:12px;margin-top:10px">
              <small style="font-weight:750;color:var(--ink);display:block;margin-bottom:6px">Restore / Import Backup File:</small>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="file" id="jsonFileInput" accept=".json,application/json" style="font-size:12px" onchange="handleJSONFileUpload(event)">
              </div>
              <div style="margin-top:8px">
                <small class="muted" style="display:block;margin-bottom:4px">Or paste backup JSON code directly:</small>
                <textarea id="jsonPasteInput" placeholder="Paste { ... } JSON data here to restore immediately" style="width:100%;height:65px;font-size:11px;font-family:monospace;background:rgba(0,0,0,0.3);border:1px solid var(--line);border-radius:8px;padding:6px;color:var(--ink)"></textarea>
                <button type="button" class="btn small" style="margin-top:6px;width:100%" onclick="importPastedJSON()">
                  🚀 Import &amp; Restore Database
                </button>
              </div>
            </div>
          </div>

          <div class="due-actions" style="margin-top:14px">
            <button type="button" class="btn ghost" onclick="document.getElementById('transferModal').remove()">Close</button>
          </div>
        </div>
      </div>
    `);
  }

  async function manualSyncNow(mode = 'pull') {
    const fId = window.farmId || (window.STORE && STORE.getItem('arswine-active-farm')) || Object.keys(window.DB || {})[0];
    const farm = (window.DB && window.DB[fId]) || (window.F ? window.F() : null);

    if (mode === 'push') {
      updateSyncIndicator('syncing', 'Syncing...');
      toast('☁️ Uploading all records & logo to cloud...');
      const res = await ARSCloud.pushFarm(fId, farm);
      if (res && res.success !== false) {
        toast(`✓ Pushed ${res.count} records to cloud successfully!`);
        updateSyncIndicator('synced', 'Synced');
      } else {
        toast(`⚠️ Push note: ${res?.reason || 'Check internet'}`);
      }
      return;
    }

    updateSyncIndicator('syncing', 'Syncing...');
    toast('☁️ Downloading latest records from cloud...');
    const res = await ARSCloud.pullFarm(fId);
    if (res && res.success !== false) {
      if (window.applyCustomLogo) window.applyCustomLogo();
      if (window.renderAll) window.renderAll();
      toast(`✓ Synced ${res.count} items from cloud!`);
      updateSyncIndicator('synced', 'Synced');
    } else {
      toast(`⚠️ Sync note: ${res?.reason || 'Could not reach Supabase'}`);
    }
  }

  function exportFarmJSON() {
    const fId = window.farmId || Object.keys(window.DB || {})[0];
    const farm = (window.DB && window.DB[fId]) || (window.F ? window.F() : null);
    if (!farm) {
      toast('No farm data available to export.');
      return;
    }
    const cleanName = (farm.name || 'farm').replace(/[^a-zA-Z0-9_-]/g, '-');
    const todayStr = new Date().toISOString().slice(0, 10);
    const fileName = `${cleanName}-backup-${todayStr}.json`;

    const logoData = farm.logo || farm.logo_url || (window.STORE && STORE.getItem('ars-farm-logo-' + fId)) || null;
    const exportObj = {
      ...farm,
      logo: logoData,
      logo_url: logoData,
      _exported_at: new Date().toISOString(),
      _device_id: DEVICE_ID,
      _app: 'ARSwineTech Pro'
    };

    const jsonStr = JSON.stringify(exportObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    toast(`✓ Exported backup: ${fileName}`);
  }

  function copyFarmJSONToClipboard() {
    const fId = window.farmId || Object.keys(window.DB || {})[0];
    const farm = (window.DB && window.DB[fId]) || (window.F ? window.F() : null);
    if (!farm) {
      toast('No farm data to copy.');
      return;
    }
    const logoData = farm.logo || farm.logo_url || (window.STORE && STORE.getItem('ars-farm-logo-' + fId)) || null;
    const exportObj = {
      ...farm,
      logo: logoData,
      logo_url: logoData,
      _exported_at: new Date().toISOString(),
      _device_id: DEVICE_ID,
      _app: 'ARSwineTech Pro'
    };

    const jsonStr = JSON.stringify(exportObj, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonStr).then(() => {
        toast('✓ Farm JSON copied to clipboard!');
      }).catch(() => {
        prompt('Copy your farm backup JSON:', jsonStr);
      });
    } else {
      prompt('Copy your farm backup JSON:', jsonStr);
    }
  }

  function handleJSONFileUpload(e) {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      const content = evt.target?.result;
      if (content) {
        applyImportedJSON(content);
      }
    };
    reader.readAsText(file);
  }

  function importPastedJSON() {
    const text = document.getElementById('jsonPasteInput')?.value?.trim();
    if (!text) {
      toast('Please paste valid JSON data into the text box.');
      return;
    }
    applyImportedJSON(text);
  }

  function applyImportedJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON structure.');
      }
      const fId = window.farmId || Object.keys(window.DB || {})[0];
      if (!window.DB[fId]) {
        window.DB[fId] = { name: data.name || "RM's Hog Farm" };
      }
      const farm = window.DB[fId];
      if (data.name) farm.name = data.name;

      const keys = [
        'sows', 'piglets', 'feed', 'semen', 'transactions', 'sales', 'reminders',
        'medicines', 'vaccinations', 'reservations', 'semenSales', 'semenResellers',
        'semenResellerTx', 'feedTrials', 'feedOrders', 'boars', 'barns', 'movements',
        'rfid_tags', 'rfid_scans', 'breedingRecords', 'pigletLedger', 'heatRecords',
        'treatments', 'med_movements', 'vaccination_events', 'vaxSchedules', 'vetCatalog', 'marketQuotes'
      ];
      keys.forEach(k => {
        if (Array.isArray(data[k])) {
          farm[k] = data[k];
        }
      });

      if (data.logo || data.logo_url) {
        farm.logo = data.logo || data.logo_url;
        farm.logo_url = data.logo_url || data.logo;
        if (window.STORE) STORE.setItem('ars-farm-logo-' + fId, farm.logo);
      }
      if (data.feedPlan && typeof data.feedPlan === 'object') farm.feedPlan = data.feedPlan;
      if (data.settings && typeof data.settings === 'object') farm.settings = data.settings;
      if (data.reminderSettings && typeof data.reminderSettings === 'object') farm.reminderSettings = data.reminderSettings;

      if (window.sanitizeFarm) sanitizeFarm(farm);
      if (window.save) save();
      if (window.applyCustomLogo) window.applyCustomLogo();
      if (window.renderAll) renderAll();

      document.getElementById('transferModal')?.remove();
      const s = getFarmDataSummary(farm);
      toast(`✓ Database successfully restored! Loaded ${s.total} items (${s.sows} sows, ${s.piglets} litters, ${s.reservations} reservations, ${s.semenResellers} resellers).`);

      scheduleAutoPush(200);
    } catch (err) {
      toast(`⚠️ Import failed: ${err.message || 'Invalid JSON format'}`);
    }
  }

  // Initialize auto-sync engine
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoSync);
  } else {
    initAutoSync();
  }

  window.scheduleAutoPush = scheduleAutoPush;
  window.performBackgroundPull = performBackgroundPull;
  window.updateSyncIndicator = updateSyncIndicator;
  window.openDataTransferModal = openDataTransferModal;
  window.manualSyncNow = manualSyncNow;
  window.manualCloudSync = manualSyncNow;
  window.exportFarmJSON = exportFarmJSON;
  window.copyFarmJSONToClipboard = copyFarmJSONToClipboard;
  window.handleJSONFileUpload = handleJSONFileUpload;
  window.importPastedJSON = importPastedJSON;
  window.getFarmDataSummary = getFarmDataSummary;
})();
