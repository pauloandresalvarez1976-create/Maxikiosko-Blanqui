import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.js";

const vapidKey = String(import.meta.env.VITE_FIREBASE_VAPID_KEY || "").trim();
const appCheckKey = String(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || "").trim();
let messagingSdkPromise;

function loadMessagingSdk() {
  messagingSdkPromise ||= import("firebase/messaging");
  return messagingSdkPromise;
}

export function isMarketingPushConfigured() {
  return Boolean(vapidKey && appCheckKey);
}

export async function enableMarketingPush() {
  if (!isMarketingPushConfigured()) {
    throw new Error("La conexión de notificaciones todavía no está configurada en esta vista previa.");
  }
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Este navegador no admite notificaciones web en este dispositivo.");
  }
  if (Notification.permission === "denied") {
    throw new Error("Las notificaciones están bloqueadas en el navegador. Habilitalas desde los ajustes del sitio.");
  }

  // Mantener el pedido de permiso directamente dentro del gesto del usuario.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("No se activaron las notificaciones.");

  const sdk = await loadMessagingSdk();
  if (!(await sdk.isSupported())) throw new Error("Este navegador no admite Firebase Web Push.");
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
  const messaging = sdk.getMessaging();
  const token = await sdk.getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("No se pudo registrar este dispositivo para recibir avisos.");

  try {
    await httpsCallable(functions, "registerMarketingPush")({ token });
  } catch (error) {
    await sdk.deleteToken(messaging).catch(() => {});
    throw error;
  }
  return true;
}

export async function disableMarketingPush() {
  const sdk = await loadMessagingSdk();
  if (!(await sdk.isSupported())) return false;
  const messaging = sdk.getMessaging();
  const registration = await navigator.serviceWorker.getRegistration("/");
  const token = await sdk.getToken(messaging, {
    ...(vapidKey ? { vapidKey } : {}),
    ...(registration ? { serviceWorkerRegistration: registration } : {}),
  });
  if (token) {
    await httpsCallable(functions, "unregisterMarketingPush")({ token });
    await sdk.deleteToken(messaging);
  }
  return true;
}

export async function listenForForegroundMarketingPush() {
  if (!("serviceWorker" in navigator) || !("Notification" in window) || Notification.permission !== "granted") return () => {};
  const sdk = await loadMessagingSdk();
  if (!(await sdk.isSupported())) return () => {};
  const messaging = sdk.getMessaging();
  return sdk.onMessage(messaging, async (payload) => {
    if (Notification.permission !== "granted") return;
    const data = payload.data || {};
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return;
    await registration.showNotification(data.title || "Maxikiosko Blanqui", {
      body: data.body || "Hay novedades para vos.",
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      tag: `blanqui-${data.kind || "novedades"}`,
      data: { url: data.url || "/#home" },
    });
  });
}
