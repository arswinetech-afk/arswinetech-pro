# 🐷 ARSwineTech Pro — Re-Engineered PWA

**ARSwineTech Pro** is a modern, offline-first Progressive Web App (PWA) designed for swine farm operations management, pedigree genetics, RFID ear-tag scanning, multi-barn biosecurity movements, feed forecasting, POS sales, and clinical veterinary support.

---

## 📦 What's Included

* **App Shell & Manifest:** `index.html`, `manifest.webmanifest`, `favicon.ico`, `assets/`, `icons/`
* **PWA Service Worker:** `sw.js` (Cache v73 — Network-first for code, cache-first for media)
* **Custom Design System:** `css/app.css` (Teal/Dark theme, responsive mobile drawer & bottom nav)
* **Hardware & Facilities Integrations:**
  * `js/rfid-scanner.js` (Web Bluetooth ISO 11784/11785 stick readers, Web NFC, Camera QR/Barcode)
  * `js/barn-movements.js` (Spatial barn/pen mapping, sanitation downtime, movement wizard)
* **Swine Operations & Biology Modules:**
  * `js/pedigree.js` & `js/lineage.js` (Wright's inbreeding coefficient calculation & 3-gen family tree)
  * `js/sow-tools.js` & `js/sow-monitoring.js` (114d gestation math, 16–21d reheat surveillance)
  * `js/piglet-ledger.js` & `js/foster-batch.js` (Litter management, foster/nurse sows, ear-notch roster)
  * `js/fattener-center.js` (Grow-finish tracking, multi-feed trial comparisons, ADG & FCR calculations)
  * `js/feeding-guide.js` & `js/feed-orders.js` (30-day herd feed consumption forecast & re-orders)
  * `js/vaccination-center.js` & `js/vet-library.js` (Complete health protocols, 16 disease monographs)
  * `js/ai-vet-search.js` (Google Gemini AI veterinary search assistant)
  * `js/semen-sales.js` & `js/reservations.js` (POS sales, 58mm thermal receipts, certificate generation)
* **Cloud & Security Layers:**
  * `supabase/config.js` & `supabase/client.js` (Supabase PostgreSQL, RLS, GoTrue Auth)
  * `js/demo-cloud.js` (Self-contained offline demo database with seed data)

---

## 🚀 Quick Deployment Guide

### Requirement: HTTPS
PWAs, Service Workers, Web Bluetooth (`navigator.bluetooth`), Web NFC (`NDEFReader`), and Camera permissions **require a secure HTTPS origin** (or `localhost` for local development).

---

### Option A: Deploy to Cloudflare Pages (Recommended · 100% Free)
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.
2. Click **Create Application** ➔ **Pages** ➔ **Upload assets**.
3. Create a project name (e.g. `my-swine-farm`).
4. Drag and drop the extracted folder (containing `index.html`, `js/`, `css/`, etc.).
5. Click **Deploy site**. Your PWA is instantly live on `https://<your-project>.pages.dev` with free SSL!

---

### Option B: Deploy to Vercel or Netlify (1-Click Drag & Drop)
* **Netlify:** Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the folder into the browser.
* **Vercel:** Run `npx vercel` inside the folder or link your GitHub repository.

---

### Option C: Deploy to your own VPS / Nginx Server
Place the files in `/var/www/arswinetech` and ensure SSL is enabled via Let's Encrypt (`certbot`).

Sample Nginx Configuration:
```nginx
server {
    listen 80;
    server_name farm.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name farm.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/farm.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/farm.yourdomain.com/privkey.pem;

    root /var/www/arswinetech;
    index index.html;

    # Correct MIME types for PWA
    location /manifest.webmanifest {
        types { application/manifest+json webmanifest; }
    }

    location /sw.js {
        add_header Cache-Control "no-cache";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 📱 How to Install the PWA on Devices

### Android (Chrome / Edge / Samsung Internet):
1. Open your HTTPS URL in Chrome.
2. Tap the **"Install App"** banner at the bottom or open the Chrome menu (⋮) and tap **"Install App"** / **"Add to Home screen"**.
3. ARSwineTech will install as a standalone app with native splash screen and offline storage.

### iOS (iPhone & iPad Safari):
1. Open your HTTPS URL in **Safari**.
2. Tap the **Share** icon (square with arrow up).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add**. The app opens full-screen without Safari browser address bars.

### Windows / Mac / Linux (Desktop Chrome & Edge):
1. Open the URL in Chrome or Edge.
2. Click the **Install** icon on the right side of the address bar.
3. The app opens in its own clean desktop window.

---

## 📡 Hardware & Cloud Setup

### 1. Bluetooth & NFC RFID Readers:
* **Bluetooth:** Tap **"📡 Scan EID"** in the topbar or open the **RFID / EID Center**. Click **"Pair Bluetooth"** and select your ISO 11784/11785 FDX-B stick reader (Allflex, Tru-Test, Agrident).
* **NFC:** Tap **"Enable NFC"** on Android Chrome and hold the ear tag against the back of your phone.
* **Camera:** Tap **"Open Camera"** to scan QR-barcoded ear tags.

### 2. Supabase Backend Connection (Optional):
The app runs completely in offline mode by default with local mock accounts (`manager@arswine.ph` / `password`). To connect your live Supabase cloud database:
1. Open `supabase/config.js`.
2. Add your project URL and publishable anon key:
   ```javascript
   window.ARS_SUPABASE_CONFIG = {
     url: 'https://<your-project>.supabase.co',
     anonKey: '<your-anon-key>'
   };
   ```
3. Cloud synchronization will automatically activate for all farm records!
