/* ═══════════════════════════════════════════════════════════════════════════
   ARSwineTech Pro — Per-Farm Isolated Custom Logo Engine (js/logo-custom.js)

   Rules:
   • Sign-in / Welcome screens ALWAYS show the official ARSwineTech app logo.
   • Each registered farm has its own private, isolated logo that loads only
     when that specific farm workspace is active.
   • Custom logos persist permanently in memory, localStorage, IndexedDB,
     and cloud sync.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  function getActiveFarmId() {
    return window.farmId || (window.STORE && STORE.getItem('arswine-active-farm')) || 'farm-ars';
  }

  function getFarmObj() {
    try {
      if (typeof F === 'function') return F();
      if (window.F && typeof window.F === 'function') return window.F();
      const id = getActiveFarmId();
      return (window.DB && window.DB[id]) || null;
    } catch (e) {
      return null;
    }
  }

  function apply() {
    const id = getActiveFarmId();
    const f = getFarmObj();

    // 1. Get logo strictly belonging to the active farm (No cross-farm leakage)
    const farmLogoSrc = (f && (f.logo || f.logo_url)) || (window.STORE && STORE.getItem('ars-farm-logo-' + id)) || null;

    // 2. Apply ONLY to the active farm sidebar and farm workspace
    document.querySelectorAll('.sidebar .logo-img, .shell .brand .logo-img').forEach(img => {
      if (!img.dataset.defaultSrc) img.dataset.defaultSrc = img.src;
      if (farmLogoSrc) {
        img.src = farmLogoSrc;
      } else {
        img.src = img.dataset.defaultSrc || 'assets/arswinetech-logo.png';
      }
    });

    // 3. Ensure Auth & Sign-in screens ALWAYS display the official ARSwineTech app logo
    document.querySelectorAll('.login-screen .logo-img, .reset-screen .logo-img, .onboard-screen .logo-img').forEach(img => {
      img.src = 'assets/arswinetech-logo.png';
    });
  }

  function choose() {
    const id = getActiveFarmId();
    const f = getFarmObj();
    const farmName = (f && f.name) || id;

    let input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = () => {
      let file = input.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        if (window.toast) toast('Logo must be 2 MB or smaller.');
        return;
      }
      let r = new FileReader();
      r.onload = () => {
        const dataUrl = r.result;

        // 1. Save strictly to this farm ID in localStorage
        if (window.STORE) {
          STORE.setItem('ars-farm-logo-' + id, dataUrl);
        }

        // 2. Save directly inside farm DB object
        if (f) {
          f.logo = dataUrl;
          f.logo_url = dataUrl;
        }

        // 3. Persist to IndexedDB and push to Supabase cloud!
        if (window.save && typeof window.save === 'function') window.save();

        // 4. Apply to active sidebar
        apply();
        if (window.toast) toast(`✓ Custom logo saved for ${farmName}!`);
      };
      r.readAsDataURL(file);
    };
    input.click();
  }

  // Attach logo changer ONLY to the sidebar inside an active farm workspace
  function bindSidebarBrand() {
    document.querySelectorAll('.sidebar .brand').forEach(b => {
      b.title = 'Tap to change farm logo';
      b.style.cursor = 'pointer';
      b.onclick = choose;
    });
  }

  const oldSetFarmSelect = window.setFarmSelect;
  window.setFarmSelect = function () {
    if (typeof oldSetFarmSelect === 'function') oldSetFarmSelect();
    bindSidebarBrand();
    apply();
  };

  const oldRenderAll = window.renderAll;
  window.renderAll = function () {
    if (typeof oldRenderAll === 'function') oldRenderAll();
    bindSidebarBrand();
    apply();
  };

  // Run on initial load
  bindSidebarBrand();
  apply();

  window.changeFarmLogo = choose;
  window.applyCustomLogo = apply;
})();
