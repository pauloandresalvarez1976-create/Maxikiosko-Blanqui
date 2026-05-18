// Service Worker — Maxikiosko Blanqui
// Permite recibir notificaciones aunque la app esté en segundo plano o pantalla bloqueada

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Cuando llega una notificación push (desde Firebase Cloud Messaging u otro servicio)
self.addEventListener("push", (event) => {
  let data = { title: "Maxikiosko Blanqui", body: "Tenés una novedad en tu pedido." };
  try {
    data = event.data.json();
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      vibrate: [200, 100, 200, 100, 200],
      tag: "pedido-status",
      renotify: true,
    })
  );
});

// Al tocar la notificación → abrir/focalizar la app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
