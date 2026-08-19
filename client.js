/* Dependency-free Supabase REST client. Public anon key only; RLS protects tenant data. */
window.ARSCloud = (() => {
  const c = window.ARS_SUPABASE_CONFIG || {
    url: 'https://hgmrltewkxjmhlqevjrp.supabase.co',
    anonKey: 'sb_publishable_NWmfAur6bNoulNv0anC-nQ_11CkOtCT'
  };
  window.ARS_SUPABASE_CONFIG = c;
  let token = sessionStorage.getItem('ars-supabase-token') || '';
  const headers = (extra = {}) => ({
    apikey: c.anonKey,
    Authorization: `Bearer ${token||c.anonKey}`,
    'Content-Type': 'application/json',
    ...extra
  });
  async function request(path, options = {}) {
    const response = await fetch(`${c.url}${path}`, {
      ...options,
      headers: headers(options.headers)
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.msg || body?.message || body?.error_description || `Supabase error ${response.status}`);
    return body;
  }
  async function signIn(email, password) {
    const body = await request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.anonKey}`
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    token = body.access_token;
    sessionStorage.setItem('ars-supabase-token', token);
    return body.user;
  }
  async function signUp(email, password) {
    const body = await request('/auth/v1/signup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.anonKey}`
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    if (body.access_token) {
      token = body.access_token;
      sessionStorage.setItem('ars-supabase-token', token);
    }
    if (body.access_token && !body.session) {
      body.session = {
        access_token: body.access_token,
        user: body.user
      };
    }
    return body;
  }
  async function signOut() {
    if (token) await request('/auth/v1/logout', {
      method: 'POST'
    }).catch(() => {});
    token = '';
    sessionStorage.removeItem('ars-supabase-token');
  }
  async function sendPasswordReset(email, redirectTo) {
    return request('/auth/v1/recover', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.anonKey}`
      },
      body: JSON.stringify({
        email,
        redirect_to: redirectTo
      })
    });
  }

  function captureRecoverySession() {
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.get('type') === 'recovery' && params.get('access_token')) {
      token = params.get('access_token');
      sessionStorage.setItem('ars-supabase-token', token);
      history.replaceState({}, document.title, location.pathname);
      return true;
    }
    return false;
  }
  async function updatePassword(password) {
    if (!token) throw new Error('Your reset link is invalid or expired. Request a new password reset link.');
    return request('/auth/v1/user', {
      method: 'PUT',
      body: JSON.stringify({
        password
      })
    });
  }
  async function onboard(form) {
    return request('/rest/v1/rpc/onboard_my_farm', {
      method: 'POST',
      body: JSON.stringify({
        p_first_name: form.first_name,
        p_last_name: form.last_name,
        p_mobile_number: form.mobile_number,
        p_farm_name: form.farm_name,
        p_farm_address: form.farm_address,
        p_barangay: form.barangay,
        p_municipality: form.municipality,
        p_province: form.province,
        p_timezone: 'Asia/Manila'
      })
    });
  }
  async function joinFarmWithInvitation(code) {
    return request('/rest/v1/rpc/join_farm_with_invitation', {
      method: 'POST',
      body: JSON.stringify({
        p_invitation_code: code
      })
    });
  }
  async function hasFarm() {
    const r = await request('/rest/v1/farm_memberships?select=farm_id,role,farms(name)&limit=1');
    return Array.isArray(r) ? (r[0] || null) : null;
  }
  async function listPlatformUsers() {
    if (!token) return [];
    try {
      const res = await request("/rest/v1/rpc/list_platform_users", { method: "POST", body: "{}" });
      return Array.isArray(res) ? res : [];
    } catch (e) {
      console.warn("[ARSCloud] listPlatformUsers error:", e);
      return [];
    }
  }

  async function listFarms() {
    if (!token) return [];
    try {
      const res = await request('/rest/v1/farms?select=id,name,logo_url');
      return Array.isArray(res) ? res : [];
    } catch(e) {
      console.warn("[ARSCloud] listFarms error:", e);
      return [];
    }
  }

  async function isPlatformAdmin() {
    return request('/rest/v1/rpc/is_platform_admin', {
      method: 'POST',
      body: '{}'
    });
  }
  async function getFarmName(farmId) {
    const r = await request('/rest/v1/farms?id=eq.' + encodeURIComponent(farmId) + '&select=name&limit=1');
    return Array.isArray(r) ? (r[0]?.name || null) : null;
  }
  async function overridePigletLineage(payload) {
    return request('/rest/v1/rpc/override_piglet_lineage', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
  async function updateMemberAccess(farmId, userId, role, plan, isActive) {
    return request('/rest/v1/rpc/update_farm_member_access', {
      method: 'POST',
      body: JSON.stringify({
        p_farm_id: farmId,
        p_user_id: userId,
        p_role: role,
        p_plan: plan,
        p_is_active: isActive
      })
    });
  }
  async function vetReferenceSearch(payload) {
    return request('/functions/v1/vet-reference-search', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
  async function deleteFarm(farmId) {
    return request('/rest/v1/rpc/delete_my_farm', {
      method: 'POST',
      body: JSON.stringify({
        p_farm_id: farmId
      })
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     COMPREHENSIVE MULTI-ENTITY CLOUD PUSH (Deduplicated & Chunked)
     ═══════════════════════════════════════════════════════════════════════════ */
  async function pushFarm(farmId, farm) {
    if (!token || !farmId || !farm) return { success: false, reason: "Missing authentication or farm data" };

    const entityMap = {
      sows: "sow",
      piglets: "piglet_batch",
      feed: "feed_inventory",
      semen: "semen_inventory",
      transactions: "transaction",
      sales: "pos_sale",
      reminders: "reminder",
      medicines: "medicine",
      vaccinations: "vaccination",
      reservations: "reservation",
      semenSales: "semen_sale",
      semenResellers: "semen_reseller",
      semenResellerTx: "semen_reseller_tx",
      feedTrials: "feed_trial",
      feedOrders: "feed_order",
      boars: "boar",
      barns: "barn",
      movements: "movement",
      rfid_tags: "rfid_tag",
      rfid_scans: "rfid_scan",
      breedingRecords: "breeding_record",
      pigletLedger: "piglet_ledger",
      heatRecords: "heat_record",
      treatments: "treatment",
      med_movements: "med_movement",
      vaccination_events: "vaccination_event",
      vaxSchedules: "vax_schedule",
      vetCatalog: "vet_catalog",
      marketQuotes: "market_quote"
    };

    const rowsMap = new Map();

    // 1. Process all Array Collections
    Object.entries(entityMap).forEach(([key, type]) => {
      (farm[key] || []).forEach((payload, index) => {
        if (!payload || typeof payload !== 'object') return;
        let localId = String(payload.id || payload.no || payload.tag || payload.code || '');
        if (!localId || localId === 'undefined' || localId === 'null' || localId === '[object Object]') {
          if (type === 'reservation' && payload.no) {
            localId = payload.no;
          } else if (type === 'feed_inventory' && payload.type) {
            localId = `feed-${payload.type}`;
          } else {
            localId = `${type}-${index}`;
          }
        }
        let compoundKey = `${farmId}:::${type}:::${localId}`;
        if (rowsMap.has(compoundKey)) {
          localId = `${localId}-${index}`;
          compoundKey = `${farmId}:::${type}:::${localId}`;
        }

        // Guarantee updated_at timestamp on every record
        if (!payload.updated_at) payload.updated_at = new Date().toISOString();
        if (!payload.farm_id) payload.farm_id = String(farmId);

        rowsMap.set(compoundKey, {
          farm_id: String(farmId),
          entity_type: type,
          local_id: localId,
          payload,
          updated_by: null
        });
      });
    });

    // 2. Process Singleton: Custom Farm Logo
    const logoData = farm.logo || farm.logo_url || (window.STORE && STORE.getItem('ars-farm-logo-' + farmId)) || null;
    if (logoData) {
      rowsMap.set(`${farmId}:::farm_logo:::logo`, {
        farm_id: String(farmId),
        entity_type: 'farm_logo',
        local_id: 'logo',
        payload: { dataUrl: logoData, updated_at: new Date().toISOString() },
        updated_by: null
      });

      request(`/rest/v1/farms?id=eq.${encodeURIComponent(farmId)}`, {
        method: "PATCH",
        body: JSON.stringify({ logo_url: logoData, updated_at: new Date().toISOString() })
      }).catch(() => {});
    }

    // 3. Process Singleton: Feeding Program Plan
    if (farm.feedPlan && typeof farm.feedPlan === 'object') {
      rowsMap.set(`${farmId}:::feed_plan:::config`, {
        farm_id: String(farmId),
        entity_type: 'feed_plan',
        local_id: 'config',
        payload: farm.feedPlan,
        updated_by: null
      });
    }

    // 4. Process Singleton: Settings & Reminder Config
    if (farm.settings || farm.reminderSettings) {
      rowsMap.set(`${farmId}:::farm_settings:::config`, {
        farm_id: String(farmId),
        entity_type: 'farm_settings',
        local_id: 'config',
        payload: { settings: farm.settings || {}, reminderSettings: farm.reminderSettings || {} },
        updated_by: null
      });
    }

    const rows = Array.from(rowsMap.values());
    if (!rows.length) return { success: true, count: 0 };

    const CHUNK_SIZE = 50;
    try {
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        await request("/rest/v1/app_records?on_conflict=farm_id,entity_type,local_id", {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=minimal"
          },
          body: JSON.stringify(chunk)
        });
      }
      console.info(`[ARSCloud] Successfully pushed ${rows.length} total records to cloud for farm ${farmId}.`);
      return { success: true, count: rows.length };
    } catch (e) {
      console.warn("[ARSCloud] pushFarm error:", e);
      return { success: false, reason: e.message || String(e) };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     COMPREHENSIVE MULTI-ENTITY CLOUD PULL & RESTORATION
     ═══════════════════════════════════════════════════════════════════════════ */
  async function pullFarm(farmId) {
    if (!token) return { success: false, reason: "Authentication required" };
    if (!farmId) farmId = window.farmId || (window.STORE && STORE.getItem('arswine-active-farm')) || Object.keys(window.DB || {})[0] || 'farm-ars';
    try {
      // 1. Query records strictly for this farm_id
      const rows = await request(`/rest/v1/app_records?farm_id=eq.${encodeURIComponent(farmId)}&select=farm_id,entity_type,local_id,payload&limit=5000`).catch(() => []);

      if (!Array.isArray(rows)) {
        return { success: true, count: 0, farm: window.DB?.[farmId] || null };
      }

      const typeToKey = {
        sow: "sows",
        piglet_batch: "piglets",
        feed_inventory: "feed",
        semen_inventory: "semen",
        transaction: "transactions",
        pos_sale: "sales",
        reminder: "reminders",
        medicine: "medicines",
        vaccination: "vaccinations",
        reservation: "reservations",
        semen_sale: "semenSales",
        semen_reseller: "semenResellers",
        semen_reseller_tx: "semenResellerTx",
        feed_trial: "feedTrials",
        feed_order: "feedOrders",
        boar: "boars",
        barn: "barns",
        movement: "movements",
        rfid_tag: "rfid_tags",
        rfid_scans: "rfid_scans",
        rfid_scan: "rfid_scans",
        breeding_record: "breedingRecords",
        piglet_ledger: "pigletLedger",
        heat_record: "heatRecords",
        treatment: "treatments",
        med_movement: "med_movements",
        vaccination_event: "vaccination_events",
        vax_schedule: "vaxSchedules",
        vet_catalog: "vetCatalog",
        market_quote: "marketQuotes"
      };

      if (!window.DB[farmId]) {
        const farmName = (await getFarmName(farmId)) || "RM's Hog Farm";
        window.DB[farmId] = {
          name: farmName,
          sows: [], piglets: [], feed: [], semen: [], transactions: [], sales: [],
          reminders: [], medicines: [], vaccinations: [], reservations: [],
          semenSales: [], semenResellers: [], semenResellerTx: [], feedTrials: [], feedOrders: [],
          boars: [], barns: [], movements: [], rfid_tags: [], rfid_scans: [],
          breedingRecords: [], pigletLedger: [], heatRecords: [], treatments: [],
          med_movements: [], vaccination_events: [], vaxSchedules: [], vetCatalog: [], marketQuotes: []
        };
      }

      const f = window.DB[farmId];
      if (window.sanitizeFarm) window.sanitizeFarm(f);

      const bucket = {};
      let pulledLogo = null;
      let pulledFeedPlan = null;
      let pulledSettings = null;

      rows.forEach(r => {
        if (!r || !r.entity_type) return;
        // Strictly verify that the record belongs to this farmId
        if (r.farm_id && String(r.farm_id) !== String(farmId)) return;

        // Skip test sows generated during automated test suites
        const sowName = String(r.payload?.name || r.payload?.id || r.local_id || '').toLowerCase();
        if (sowName.includes('verify sow') || sowName.includes('live sync') || sowName.includes('lint verify') || sowName.includes('test sow') || sowName.includes('e2e live')) {
          return;
        }

        // Handle singletons
        if (r.entity_type === 'farm_logo' && r.payload?.dataUrl) {
          pulledLogo = r.payload.dataUrl;
          return;
        }
        if (r.entity_type === 'feed_plan' && r.payload) {
          pulledFeedPlan = r.payload;
          return;
        }
        if (r.entity_type === 'farm_settings' && r.payload) {
          pulledSettings = r.payload;
          return;
        }

        const k = typeToKey[r.entity_type] || r.entity_type;
        if (!bucket[k]) bucket[k] = [];
        if (r.payload) bucket[k].push(r.payload);
      });

      let loadedCount = 0;
      const deletedSet = new Set((f.deleted_ids || []).map(id => String(id).trim().toLowerCase()));

      Object.keys(bucket).forEach(k => {
        if (Array.isArray(bucket[k])) {
          const cloudList = bucket[k];
          const localList = Array.isArray(f[k]) ? f[k] : [];

          const getUniqueKey = (item) => {
            if (!item || typeof item !== 'object') return '';
            if (k === 'reservations') {
              return String(item.no || item.id || (item.customer + ':::' + item.date + ':::' + item.quantity + ':::' + item.batch_id)).trim().toLowerCase();
            }
            return String(item.id || item.no || item.tag || item.code || item.name || '').trim().toLowerCase();
          };

          const recordMap = new Map();

          // 1. Load existing local records onto map
          localList.forEach(item => {
            if (!item || typeof item !== 'object') return;
            const key = getUniqueKey(item);
            const rawId = String(item.id || item.name || '').trim().toLowerCase();
            if (deletedSet.has(key) || (rawId && deletedSet.has(rawId))) return;
            if (key) {
              recordMap.set(key, item);
            }
          });

          // 2. Merge cloud records using Last-Write-Wins and Tombstone check
          cloudList.forEach(cloudItem => {
            if (!cloudItem || typeof cloudItem !== 'object') return;
            const key = getUniqueKey(cloudItem);
            const rawId = String(cloudItem.id || cloudItem.name || '').trim().toLowerCase();
            if (!key) return;

            // If deleted tombstone, do not restore
            if (deletedSet.has(key) || (rawId && deletedSet.has(rawId)) || cloudItem.deleted_at || cloudItem.is_deleted || cloudItem.status === 'deleted') {
              recordMap.delete(key);
              return;
            }

            if (!recordMap.has(key)) {
              recordMap.set(key, cloudItem);
            } else {
              const localItem = recordMap.get(key);
              const cTime = cloudItem.updated_at ? new Date(cloudItem.updated_at).getTime() : 0;
              const lTime = localItem.updated_at ? new Date(localItem.updated_at).getTime() : 0;
              // Cloud wins if equal or newer
              if (cTime >= lTime) {
                recordMap.set(key, cloudItem);
              }
            }
          });

          f[k] = Array.from(recordMap.values()).filter(item => !item.deleted_at && !item.is_deleted && item.status !== 'deleted');
          loadedCount += f[k].length;
        }
      });

      // Restore singletons
      if (pulledLogo) {
        f.logo = pulledLogo;
        f.logo_url = pulledLogo;
        if (window.STORE) STORE.setItem('ars-farm-logo-' + farmId, pulledLogo);
        loadedCount++;
      }
      if (pulledFeedPlan) {
        f.feedPlan = pulledFeedPlan;
      }
      if (pulledSettings) {
        if (pulledSettings.settings) f.settings = pulledSettings.settings;
        if (pulledSettings.reminderSettings) f.reminderSettings = pulledSettings.reminderSettings;
      }

      if (window.save) {
        STORE.setItem('arswine-db-v1', JSON.stringify(DB));
        if (window.deviceWrite) deviceWrite(DB);
      }
      if (window.applyCustomLogo) window.applyCustomLogo();

      console.info(`[ARSCloud] Successfully synced ${loadedCount} items for ${f.name} from cloud.`);
      return { success: true, count: loadedCount, farm: f };
    } catch (e) {
      console.warn("[ARSCloud] pullFarm error:", e);
      return { success: false, reason: e.message || String(e) };
    }
  }

  async function getFarmMembers(farmId) {
    if (!token) return [];
    try {
      const res = await request(`/rest/v1/rpc/get_farm_members`, {
        method: "POST",
        body: JSON.stringify({ p_farm_id: farmId })
      }).catch(async () => {
        return await request(`/rest/v1/farm_memberships?farm_id=eq.${encodeURIComponent(farmId)}&select=user_id,role,plan,is_active,created_at`);
      });
      return Array.isArray(res) ? res : [];
    } catch (e) {
      console.warn("[ARSCloud] getFarmMembers error:", e);
      return [];
    }
  }

  async function ensureFarmInvitation(farmId, farmName) {
    return request('/rest/v1/rpc/ensure_farm_invitation', { method: 'POST', body: JSON.stringify({ p_farm_id: farmId, p_farm_name: farmName || '' }) });
  }
  async function regenerateFarmInvitation(farmId, farmName) {
    return request('/rest/v1/rpc/regenerate_farm_invitation', { method: 'POST', body: JSON.stringify({ p_farm_id: farmId, p_farm_name: farmName || '' }) });
  }
  async function deleteUser(email) {
    return request('/rest/v1/rpc/platform_delete_user', { method: 'POST', body: JSON.stringify({ p_email: email }) });
  }
  async function purgeTestAccounts() {
    return request('/rest/v1/rpc/platform_purge_test_accounts', { method: 'POST', body: '{}' });
  }
  async function deleteAppRecord(farmId, entityType, localId) {
    if (!token || !farmId || !entityType || !localId) return;
    try {
      await request(`/rest/v1/app_records?farm_id=eq.${encodeURIComponent(farmId)}&entity_type=eq.${encodeURIComponent(entityType)}&local_id=eq.${encodeURIComponent(localId)}`, {
        method: "DELETE"
      });
    } catch (e) {
      console.warn("[ARSCloud] deleteAppRecord note:", e);
    }
  }
  async function cleanCloudTestRecords(farmId) {
    if (!token || !farmId) return;
    try {
      await request(`/rest/v1/app_records?farm_id=eq.${encodeURIComponent(farmId)}&entity_type=eq.sow&or=(local_id.ilike.*verify*,local_id.ilike.*live_sync*,local_id.ilike.*test*)`, {
        method: "DELETE"
      });
    } catch (e) {
      console.warn("[ARSCloud] cleanCloudTestRecords note:", e);
    }
  }

  return {
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    captureRecoverySession,
    updatePassword,
    onboard,
    joinFarmWithInvitation,
    hasFarm,
    isPlatformAdmin,
    listFarms,
    getFarmName,
    overridePigletLineage,
    updateMemberAccess,
    vetReferenceSearch,
    deleteFarm,
    ensureFarmInvitation,
    regenerateFarmInvitation,
    deleteUser,
    purgeTestAccounts,
    deleteAppRecord,
    cleanCloudTestRecords,
    pushFarm,
    pullFarm,
    getFarmMembers,
    listPlatformUsers,
    configured: () => Boolean(c?.url && c?.anonKey)
  };
})();
