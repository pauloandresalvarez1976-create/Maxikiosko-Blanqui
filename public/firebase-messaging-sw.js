/* Firebase Messaging service worker for Maxikiosko Blanqui. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url || "/#home";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  }));
});

importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBuskgBAZpl_B1MpmuTysth2ItuIN7d4yw",
  authDomain: "maxikioskoblanqui-2395d.firebaseapp.com",
  projectId: "maxikioskoblanqui-2395d",
  storageBucket: "maxikioskoblanqui-2395d.firebasestorage.app",
  messagingSenderId: "74437157596",
  appId: "1:74437157596:web:06ad3c16da2350e5ccca19",
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || "Maxikiosko Blanqui";
  return self.registration.showNotification(title, {
    body: data.body || "Hay novedades para vos.",
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    tag: `blanqui-${data.kind || "novedades"}`,
    data: { url: data.url || "/#home" },
  });
});
