const CACHE = "tehillim-v23";
const EXT = "tehillim-ext";            // פירוש שטיינזלץ מספריא - נשמר גם בין גרסאות
const CORE = ["./", "index.html", "meta.js?v=12", "text.json", "font-tx5.woff2", "font-ui.woff2", "font-nk5-s.woff2", "font-nk5-d.woff2", "font-nk5-sd.woff2", "font-nk5-q.woff2", "font-nk5-dq.woff2", "logo.png", "manifest.webmanifest", "icon-v2-192.png", "icon-v2-512.png", "icon-v2-180.png"];
const MAL = Array.from({ length: 150 }, (_, i) => "mal/" + (i + 1) + ".json");
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(async c => { await c.addAll(CORE); await Promise.allSettled(MAL.map(u => c.add(u))); }).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE && x !== EXT).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === "https://www.sefaria.org") {   // קודם רשת, ובלי חיבור - מהמטמון
    e.respondWith(fetch(req).then(n => { if (n.ok) { const c = n.clone(); caches.open(EXT).then(x => x.put(req, c)); } return n; }).catch(() => caches.match(req)));
    return;
  }
  if (u.origin !== location.origin) return;
  const isPage = req.mode === "navigate" || /\/(index\.html|meta\.js|manifest\.webmanifest)?$/.test(u.pathname);
  if (isPage) {
    e.respondWith(fetch(req, { cache: "no-cache" }).then(n => { const c = n.clone(); caches.open(CACHE).then(x => x.put(req, c)); return n; }).catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { if (n.ok) { const c = n.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return n; })));
});
