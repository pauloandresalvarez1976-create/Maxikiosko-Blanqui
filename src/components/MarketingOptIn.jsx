import { useEffect, useState } from "react";
import {
  disableMarketingPush,
  enableMarketingPush,
  isMarketingPushConfigured,
  listenForForegroundMarketingPush,
} from "../marketingPush.js";
import "./MarketingOptIn.css";

const DISMISSED_KEY = "blanqui-marketing-invite-dismissed-v1";
const SUBSCRIBED_KEY = "blanqui-marketing-push-enabled-v1";

function safeGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function safeSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* almacenamiento opcional */ }
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneApp() {
  return window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
}

export default function MarketingOptIn() {
  const [open, setOpen] = useState(false);
  const [deferredInstall, setDeferredInstall] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState("info");
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const ios = isIOSDevice();
  const notificationsAvailable = typeof window !== "undefined"
    && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

  useEffect(() => {
    let alive = true;
    setInstalled(isStandaloneApp());
    setSubscribed("Notification" in window && Notification.permission === "granted" && safeGet(SUBSCRIBED_KEY) === "yes");

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" })
        .catch((error) => console.warn("No se pudo registrar el service worker de Blanqui:", error));
    }

    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstall(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setDeferredInstall(null);
      setMessage("Blanqui quedó agregado a la pantalla de inicio.");
      setMessageKind("success");
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    const timer = window.setTimeout(() => {
      if (alive && safeGet(DISMISSED_KEY) !== "yes") setOpen(true);
    }, 1800);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!subscribed) return undefined;
    let alive = true;
    let unsubscribeForeground = () => {};
    listenForForegroundMarketingPush().then((unsubscribe) => {
      if (alive) unsubscribeForeground = unsubscribe;
      else unsubscribe();
    }).catch((error) => console.warn("No se pudo preparar la recepción de avisos:", error));
    return () => {
      alive = false;
      unsubscribeForeground();
    };
  }, [subscribed]);

  const dismiss = () => {
    safeSet(DISMISSED_KEY, "yes");
    setOpen(false);
  };

  const installApp = async () => {
    setMessage("");
    if (deferredInstall) {
      try {
        await deferredInstall.prompt();
        const choice = await deferredInstall.userChoice;
        setDeferredInstall(null);
        if (choice?.outcome === "accepted") {
          setInstalled(true);
          setMessage("Blanqui quedó agregado a la pantalla de inicio.");
          setMessageKind("success");
        }
      } catch {
        setShowInstallGuide(true);
      }
      return;
    }
    setShowInstallGuide(true);
  };

  const activateNotifications = async () => {
    setMessage("");
    if (ios && !isStandaloneApp()) {
      setShowInstallGuide(true);
      setMessage("En iPhone, primero agregá Blanqui a la pantalla de inicio y abrilo desde ese ícono.");
      setMessageKind("info");
      return;
    }
    if (!notificationsAvailable) {
      setMessage("Este navegador no admite notificaciones web en este dispositivo.");
      setMessageKind("error");
      return;
    }
    setWorking(true);
    try {
      await enableMarketingPush();
      setSubscribed(true);
      safeSet(SUBSCRIBED_KEY, "yes");
      safeSet(DISMISSED_KEY, "yes");
      setMessage("Listo, vas a recibir avisos de novedades y promociones.");
      setMessageKind("success");
    } catch (error) {
      setMessage(error?.message || "No se pudieron activar las notificaciones.");
      setMessageKind("error");
    } finally {
      setWorking(false);
    }
  };

  const deactivateNotifications = async () => {
    setWorking(true);
    setMessage("");
    try {
      await disableMarketingPush();
      setSubscribed(false);
      safeSet(SUBSCRIBED_KEY, "no");
      setMessage("Se desactivaron los avisos en este dispositivo.");
      setMessageKind("success");
    } catch (error) {
      setMessage(error?.message || "No se pudieron desactivar los avisos.");
      setMessageKind("error");
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      {!open && (
        <button className="marketing-launcher" type="button" onClick={() => setOpen(true)} aria-label="Abrir opciones de novedades y promociones">
          <span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></span> Novedades y promos
        </button>
      )}

      {open && (
        <aside className="marketing-invite" role="dialog" aria-labelledby="marketing-invite-title" aria-describedby="marketing-invite-copy">
          <button className="marketing-close" type="button" onClick={dismiss} aria-label="Cerrar invitación">×</button>
          <p className="marketing-eyebrow">MAXIKIOSKO BLANQUI · A UN TOQUE</p>
          <h2 id="marketing-invite-title">¿Querés enterarte de lo nuevo?</h2>
          <p id="marketing-invite-copy">Agregá la tienda al inicio del celular y, si querés, activá avisos de novedades y promociones.</p>

          {message && <p className={`marketing-status is-${messageKind}`} role="status">{message}</p>}

          <div className="marketing-actions">
            {subscribed ? (
              <button className="marketing-button marketing-button-secondary" type="button" onClick={deactivateNotifications} disabled={working}>
                {working ? "Actualizando…" : "Desactivar avisos"}
              </button>
            ) : (
              <button className="marketing-button marketing-button-primary" type="button" onClick={activateNotifications} disabled={working}>
                {working ? "Activando…" : "Activar notificaciones"}
              </button>
            )}
            {!installed && <button className="marketing-button marketing-button-secondary" type="button" onClick={installApp}>Agregar al celular</button>}
          </div>

          <p className="marketing-footnote">Solo novedades y promociones. Podés desactivar los avisos cuando quieras.</p>
          <button className="marketing-later" type="button" onClick={dismiss}>Ahora no</button>
        </aside>
      )}

      {showInstallGuide && (
        <div className="marketing-guide-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowInstallGuide(false); }}>
          <section className="marketing-guide" role="dialog" aria-modal="true" aria-labelledby="marketing-guide-title">
            <button className="marketing-close" type="button" onClick={() => setShowInstallGuide(false)} aria-label="Cerrar instrucciones">×</button>
            <p className="marketing-eyebrow">ACCESO DIRECTO</p>
            <h2 id="marketing-guide-title">Agregá Blanqui al inicio</h2>
            {ios ? (
              <ol>
                <li>Abrí esta página en Safari.</li>
                <li>Tocá <strong>Compartir</strong> y elegí <strong>Agregar a pantalla de inicio</strong>.</li>
                <li>Abrí Blanqui desde el nuevo ícono. Desde ahí vas a poder activar los avisos.</li>
              </ol>
            ) : (
              <p>En el menú del navegador, elegí <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla de inicio</strong>. Después vas a poder abrir Blanqui desde el ícono.</p>
            )}
            <button className="marketing-button marketing-button-primary" type="button" onClick={() => setShowInstallGuide(false)}>Entendido</button>
          </section>
        </div>
      )}
    </>
  );
}
