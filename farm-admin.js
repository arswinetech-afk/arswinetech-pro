/* ═══════════════════════════════════════════════════════════════════════════
   [REBUILD FIX 25] js/farm-admin.js — Delete an entire farm and all its data.

   Platform admins (User Access page) can permanently erase any farm workspace:
     • the cloud farm row, memberships, invitations and every synced record
       (via the delete_my_farm RPC — owner or platform admin, RLS-secured);
     • the local workspace DB entry on this device;
     • user-registry links pointing at the farm (they re-enter onboarding);
     • the uploaded farm logo for that farm;
     • demo-mode memberships for that farm.

   Safety rails:
     • super admin only — the button never renders for anyone else;
     • the farm NAME must be typed exactly to confirm (no accidental taps);
     • the LAST remaining farm on the device cannot be deleted (the app would
       have no workspace to render — clear site data for a full wipe instead);
     • deleting the ACTIVE farm switches to the next remaining farm first;
     • cloud deletion errors never block the local erase (the mismatch is
       reported in the toast so the admin can re-run if needed after running
       the updated supabase/setup.sql).

   NOTE: DB / farmId / STORE are top-level `let`/`const` bindings in app.js —
   they are NOT on `window`, so this module touches them as bare globals
   (classic-script load order guarantees app.js has already run).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* Table rows for the User Access page's "Farms" section. Super admin only. */
  function farmAdminRowsHTML() {
    if (!(typeof isSuperAdmin === 'function' && isSuperAdmin())) return '';
    let ids = Object.keys(DB || {});
    if (!ids.length) return '<tr><td colspan="6" class="empty">No farms on this device.</td></tr>';
    return ids.map(id => {
      let f = DB[id] || {},
        records = ['sows', 'piglets', 'feed', 'semen', 'transactions', 'sales', 'reminders']
          .reduce((a, k) => a + ((f[k] || []).length), 0),
        last = ids.length <= 1;
      return `<tr>` +
        `<td><b>${esc(f.name || id)}</b><br><small class="muted">${esc(id)}${id === farmId ? ' · ACTIVE' : ''}</small></td>` +
        `<td>${records} records</td>` +
        `<td>${(f.piglets || []).length} batches</td>` +
        `<td>${(f.sows || []).length} sows</td>` +
        `<td><button type="button" class="btn ghost delete-action" ${last ? 'disabled title="The last remaining farm cannot be deleted — clear site data for a full wipe instead"' : ''} onclick="deleteFarmComplete(${JSON.stringify(id).replace(/"/g, '&quot;')})">🗑 Delete farm</button></td>` +
        `<td><button type="button" class="btn ghost" title="View / copy this farm's secure invitation code" onclick="openInviteModal(${JSON.stringify(id).replace(/"/g, '&quot;')})">🔑 Code</button></td>` +
        `</tr>`;
    }).join('');
  }

  async function deleteFarmComplete(id) {
    if (!(typeof isSuperAdmin === 'function' && isSuperAdmin())) { toast('Administrator access is required.'); return; }
    let all = Object.keys(DB || {});
    if (all.length <= 1) {
      toast('This is the last farm on this device — it cannot be deleted. Clear site data for a full wipe.');
      return;
    }
    let f = DB[id];
    if (!f) { toast('Farm not found on this device.'); return; }
    let name = f.name || id;

    /* Hard confirm: exact name must be typed — irreversible, everything erased. */
    let typed = prompt(
      `PERMANENTLY DELETE "${name}"?\n\nThis erases the ENTIRE farm — every sow, piglet batch, feed record, treatment, sale, reminder and report — from this device AND from the cloud. User links to it are removed.\n\nThis cannot be undone.\n\nType the farm name exactly to confirm:`
    );
    if (typed === null) return;
    if (typed.trim() !== name) { toast('Name did not match — deletion cancelled.'); return; }
    if (!confirm(`Final check: erase "${name}" and ALL of its data now?`)) return;

    /* ── cloud erase (live backend) — best effort, never blocks local ── */
    let cloudMsg = '';
    if (window.ARSCloud && typeof ARSCloud.deleteFarm === 'function') {
      try { await ARSCloud.deleteFarm(id); cloudMsg = ' Cloud data erased too.'; }
      catch (e) {
        cloudMsg = (ARSCloud.configured && ARSCloud.configured())
          ? ' Cloud erase failed (' + (e.message || 'error') + ') — run the updated supabase/setup.sql, then retry.'
          : '';
      }
    }

    /* ── local erase ── */
    delete DB[id];
    try { STORE.removeItem('ars-farm-logo-' + id); } catch (e) {}

    /* unlink every user pinned to that farm → they re-enter onboarding */
    try {
      saveUsers(users().map(u => u.farmId === id ? { ...u, farmId: null } : u));
    } catch (e) {}

    /* if the erased farm was active, hop to the next one before rendering */
    if (farmId === id) {
      let next = Object.keys(DB)[0];
      farmId = next;
      STORE.setItem('arswine-active-farm', next);
    }

    save();
    setFarmSelect();
    renderAll();
    adminPage(); /* rebuild the farms table */
    toast(`Farm "${name}" deleted — all its data is gone.${cloudMsg}`);
  }

  window.farmAdminRowsHTML = farmAdminRowsHTML;
  window.deleteFarmComplete = deleteFarmComplete;
})();
