// firebase-messaging-sw.js
// Este archivo DEBE estar en la carpeta public/ del proyecto
// Maneja las notificaciones push cuando la app está cerrada o en segundo plano

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBuskgBAZpl_B1MpmuTysth2ItuIN7d4yw",
  authDomain: "maxikioskoblanqui-2395d.firebaseapp.com",
  projectId: "maxikioskoblanqui-2395d",
  storageBucket: "maxikioskoblanqui-2395d.firebasestorage.app",
  messagingSenderId: "74437157596",
  appId: "1:74437157596:web:06ad3c16da2350e5ccca19"
});

const messaging = firebase.messaging();

// Notificaciones en segundo plano (app cerrada o minimizada)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Maxikiosko Blanqui", {
    body: body || "Tenés una novedad en tu pedido.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    vibrate: [200, 100, 200, 100, 200],
    tag: "pedido-status",
    renotify: true,
  });
});

// Al tocar la notificación → abrir/focalizar la app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("/");
    })
  );
});
