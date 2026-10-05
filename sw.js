/* Service worker: caché offline + notificaciones push */
const CACHE = "soccerelite-v1";
const ASSETS = ["./", "./index.html", "./css/styles.css", "./js/data.js", "./js/app.js", "./manifest.json", "./assets/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Red primero, caché como respaldo (los marcadores deben estar frescos)
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});

// Push desde un servidor (Web Push / Firebase Cloud Messaging)
self.addEventListener("push", (e) => {
  let data = { title: "Soccer Elite FC", body: "Nueva actualización del partido" };
  try { data = { ...data, ...e.data.json() }; } catch { if (e.data) data.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "assets/icon.svg", badge: "assets/icon.svg", data: { url: data.url || "./#envivo" } }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./#envivo";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const c = list.find((w) => "focus" in w);
      if (c) { c.navigate(url); return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
