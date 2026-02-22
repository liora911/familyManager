const CACHE = "v2";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/", "/icon-192.png", "/icon-512.png"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean old caches
      caches.keys().then((names) =>
        Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
      ),
    ])
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// Push notifications
self.addEventListener("push", (e) => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || "מנהל הבית";
  const options = {
    body: data.body || "יש לך תזכורת חדשה",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    dir: "rtl",
    lang: "he",
    tag: data.tag || "reminder",
    renotify: true,
    data: { url: data.url || "/" },
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open the app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
