/* Critical tenant guard: no dashboard access and no implicit farm assignment without a membership. */
(function() {
  window.currentFarmAssigned = false;

  function ensureUser(email) {
    let us = users(),
      u = us.find(x => x.email.toLowerCase() === email);
    if (!u) {
      u = {
        id: 'u-' + Date.now(),
        email,
        name: email.split('@')[0],
        farmId: null,
        role: 'owner',
        plan: 'starter',
        access: true
      };
      us.push(u);
      saveUsers(us)
    }
    return {
      u,
      us
    }
  }

  function setupMarkup(mode = 'choose') {
    let el = document.getElementById('onboardScreen');
    if (!el) return;
    let content = mode === 'join' ? `<form class="onboard-card" onsubmit="joinExistingFarm(event)"><div class="eyebrow">SECURE FARM INVITATION</div><h2>Join an existing farm</h2><p>You can join a farm only with a valid invitation code from its owner or manager.</p><div class="onboard-form"><div class="field full"><label>Invitation code *</label><input name="invitation_code" required placeholder="e.g. ARS-A1B2C3" style="text-transform:uppercase"></div><div class="form-error" id="onboardError"></div></div><div class="actions"><button type="button" class="btn ghost" onclick="showFarmSetup('create')">Create new farm instead</button><button class="btn">Join securely</button></div></form>` : `<form class="onboard-card" onsubmit="secureCreateFarm(event)"><div class="eyebrow">FIRST-TIME FARM SETUP</div><h2>Create your private farm workspace</h2><p>This creates a new farm and makes you its Owner. No existing farm is selected or assigned.</p><div class="onboard-form"><div class="field"><label>First name *</label><input name="first_name" required></div><div class="field"><label>Last name *</label><input name="last_name" required></div><div class="field"><label>Farm name *</label><input name="farm_name" required placeholder="e.g. Riverside Hog Farm"></div><div class="field"><label>Farm owner name *</label><input name="owner_name" required placeholder="Owner / operator"></div><div class="field full"><label>Farm location (optional)</label><textarea name="farm_address" placeholder="Barangay, municipality/city, province"></textarea></div><div class="field"><label>Mobile number</label><input name="mobile_number" type="tel"></div><div class="field"><label>Province</label><input name="province"></div><div class="form-error" id="onboardError"></div></div><div class="actions"><button type="button" class="btn ghost" onclick="showFarmSetup('join')">Join with invitation code</button><button class="btn">Create secure farm</button></div></form>`;
    el.innerHTML = content;
    el.classList.add('open')
  }

  function showFarmSetup(mode = 'create') {
    setupMarkup(mode)
  }

  async function grantAccess(email, membership, farmName) {
    let {
      u,
      us
    } = ensureUser(email);
    if (!membership?.farm_id) return showFarmSetup('create');
    farmId = membership.farm_id;
    /* [REBUILD FIX 64] keep the caller's live membership role — gates the farm
       invitation-code button (farm owner + platform developer only). */
    window.myFarmRole = membership?.role || null;
    farmName = farmName || membership?.farms?.name || membership?.farms?.[0]?.name || null;
    if (!farmName || farmName === 'Your Farm') {
      try {
        farmName = await ARSCloud.getFarmName(farmId)
      } catch (e) {}
    }
    farmName = farmName || DB[farmId]?.name || "Your Farm";
    if (!DB[farmId]) {
      DB[farmId] = {
        name: farmName,
        sows: [],
        piglets: [],
        feed: [],
        semen: [],
        transactions: [],
        sales: [],
        reminders: [],
        medicines: [],
        vaccinations: [],
        reservations: [],
        semenSales: [],
        feedTrials: [],
        boars: [],
        barns: [],
        movements: [],
        rfid_tags: [],
        rfid_scans: [],
        breedingRecords: [],
        pigletLedger: [],
        heatRecords: [],
        subscription: "starter"
      };
    } else if (farmName && farmName !== 'Your Farm') {
      DB[farmId].name = farmName;
    }

    // Pull all cloud records from Supabase for this farm!
    if (window.ARSCloud && ARSCloud.configured() && ARSCloud.pullFarm) {
      try {
        await ARSCloud.pullFarm(farmId);
      } catch (e) {
        console.warn("[ARSCloud] pullFarm note:", e);
      }
    }

    u.farmId = farmId;
    saveUsers(us);
    STORE.setItem('arswine-active-farm', farmId);
    /* [REBUILD FIX 22] Persist the workspace immediately. */
    save();
    window.currentFarmAssigned = true;
    document.body.classList.add('farm-access-granted');
    document.getElementById('onboardScreen')?.classList.remove('open');
    document.getElementById('loginScreen').style.display = 'none';
    setFarmSelect();
    renderAll();
    applyAccess();
    toast(`Welcome to your secure farm workspace, ${u.name}`);
  }

  async function finishAuthenticated(email) {
    let {
      u
    } = ensureUser(email);
    if (u && !u.access) {
      showLoginError('This account has been disabled. Contact your farm administrator.');
      return;
    }
    STORE.setItem('ars-auth', '1');
    STORE.setItem('ars-current-email', email);
    try {
      window.platformAdminVerified = await ARSCloud.isPlatformAdmin();
      if (window.platformAdminVerified === true) {
        window.myFarmRole = 'platform';
        window.currentFarmAssigned = true;
        document.body.classList.add('farm-access-granted');
        document.getElementById('loginScreen').style.display = 'none';

        // 1. Fetch all farms from cloud for platform admin
        try {
          if (ARSCloud.listFarms) {
            const cloudFarms = await ARSCloud.listFarms();
            if (Array.isArray(cloudFarms) && cloudFarms.length > 0) {
              cloudFarms.forEach(cf => {
                if (!DB[cf.id]) {
                  DB[cf.id] = {
                    name: cf.name,
                    sows: [], piglets: [], feed: [], semen: [], transactions: [], sales: [],
                    reminders: [], medicines: [], vaccinations: [], reservations: [],
                    semenSales: [], feedTrials: [], boars: [], barns: [], movements: [],
                    rfid_tags: [], rfid_scans: [], breedingRecords: [], pigletLedger: [], heatRecords: []
                  };
                } else {
                  DB[cf.id].name = cf.name;
                }
              });
            }
          }
        } catch(e) {
          console.warn("[Platform Admin] listFarms note:", e);
        }

        // 2. Select preferred active farm
        const activeFId = STORE.getItem('arswine-active-farm') || Object.keys(DB).find(k => k !== 'farm-ars' && k !== 'farm-sample') || Object.keys(DB)[0];
        if (activeFId) {
          farmId = activeFId;
          STORE.setItem('arswine-active-farm', farmId);
          if (ARSCloud.pullFarm) {
            try {
              await ARSCloud.pullFarm(activeFId);
            } catch(e) {}
          }
        }

        setFarmSelect();
        renderAll();
        applyAccess();
        return;
      }

      let membership = await ARSCloud.hasFarm();
      if (!membership) {
        u.farmId = null;
        saveUsers(users());
        document.getElementById('loginScreen').style.display = 'none';
        showFarmSetup('create');
        return;
      }
      await grantAccess(email, membership);
    } catch (e) {
      showLoginError(`Secure farm membership check failed: ${e.message||'database access error'}. Dashboard access remains blocked.`);
      STORE.removeItem('ars-auth');
    }
  }

  async function secureCreateFarm(e) {
    e.preventDefault();
    let data = Object.fromEntries(new FormData(e.target)),
      err = document.getElementById('onboardError');
    err.classList.remove('show');
    try {
      let id = await ARSCloud.onboard({
        ...data,
        barangay: '',
        municipality: ''
      });
      await grantAccess(currentEmail(), {
        farm_id: id,
        role: 'owner'
      }, data.farm_name)
    } catch (ex) {
      err.textContent = ex.message || 'Farm creation failed. No farm was assigned.';
      err.classList.add('show')
    }
  }

  async function joinExistingFarm(e) {
    e.preventDefault();
    let data = Object.fromEntries(new FormData(e.target)),
      err = document.getElementById('onboardError');
    err.classList.remove('show');
    try {
      let id = await ARSCloud.joinFarmWithInvitation(data.invitation_code);
      await grantAccess(currentEmail(), {
        farm_id: id,
        role: 'staff'
      }, data.farm_name)
    } catch (ex) {
      err.textContent = ex.message || 'Access denied. A valid invitation code is required.';
      err.classList.add('show')
    }
  }

  const priorGo = window.go;
  window.go = function(page) {
    if (!window.currentFarmAssigned && !isSuperAdmin()) {
      showFarmSetup('create');
      return;
    }
    return priorGo(page);
  };
  window.finishAuthenticated = finishAuthenticated;
  window.grantAccess = grantAccess;
  window.showFarmSetup = showFarmSetup;
  window.secureCreateFarm = secureCreateFarm;
  window.joinExistingFarm = joinExistingFarm;
  // Existing app shell is visible only when authenticated session is granted
  if (window.STORE && STORE.getItem('ars-auth') === '1') {
    window.currentFarmAssigned = true;
    document.body.classList.add('farm-access-granted');
    const loginScr = document.getElementById('loginScreen');
    if (loginScr) loginScr.style.display = 'none';
  } else {
    window.platformAdminVerified = false;
    window.currentFarmAssigned = false;
    document.body.classList.remove('farm-access-granted');
  }
})();
