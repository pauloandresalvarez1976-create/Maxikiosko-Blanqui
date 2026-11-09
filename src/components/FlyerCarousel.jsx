import { useEffect, useState } from "react";
import "./FlyerCarousel.css";

const FLYER_API_BASE = (import.meta.env.VITE_FLYER_API_BASE || "https://mipos-fotos-api.miposopuntodeventas.workers.dev").replace(/\/+$/, "");
const REFRESH_INTERVAL = 30_000;
const SLIDE_INTERVAL = 5_500;

function normalizeFlyerPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return { display: digits, link: `549${digits}` };
  if (digits.length === 13 && digits.startsWith("549")) {
    return { display: digits.slice(3), link: digits };
  }
  if (digits.length >= 12 && digits.length <= 13 && digits.startsWith("54")) {
    const localNumber = digits.slice(2);
    return { display: localNumber, link: digits.length === 12 ? `549${localNumber}` : digits };
  }
  return { display: digits, link: digits };
}

function normalizeFlyers(payload) {
  if (!Array.isArray(payload?.flyers)) return [];
  const apiOrigin = new URL(FLYER_API_BASE).origin;
  return payload.flyers.flatMap((flyer) => {
    if (!flyer || !flyer.id || !flyer.image_url) return [];
    try {
      const imageUrl = new URL(String(flyer.image_url), `${FLYER_API_BASE}/`);
      if (imageUrl.origin !== apiOrigin) return [];
      const phone = normalizeFlyerPhone(flyer.whatsapp_phone);
      return [{
        id: String(flyer.id),
        name: String(flyer.advertiser_name || "Flyer del Blanqui").trim(),
        whatsappPhone: phone.display,
        whatsappLinkPhone: phone.link,
        imageUrl: imageUrl.href,
      }];
    } catch {
      return [];
    }
  });
}

async function prepareFlyerImage(image) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const original = { url: image.src, ratio: 4 / 5, revoke: false };
  try {
    const probeScale = Math.min(1, 600 / Math.max(width, height));
    const probeWidth = Math.max(1, Math.round(width * probeScale));
    const probeHeight = Math.max(1, Math.round(height * probeScale));
    const probe = document.createElement("canvas");
    probe.width = probeWidth;
    probe.height = probeHeight;
    const probeContext = probe.getContext("2d", { willReadFrequently: true });
    probeContext.drawImage(image, 0, 0, probeWidth, probeHeight);
    const pixels = probeContext.getImageData(0, 0, probeWidth, probeHeight).data;
    const corners = [[0, 0], [probeWidth - 1, 0], [0, probeHeight - 1], [probeWidth - 1, probeHeight - 1]]
      .map(([x, y]) => { const offset = (y * probeWidth + x) * 4; return [pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3]]; });
    const background = corners.reduce((sum, [r, g, b]) => [sum[0] + r, sum[1] + g, sum[2] + b], [0, 0, 0]).map((value) => value / 4);
    const transparentBackground = corners.filter(([, , , alpha]) => alpha < 16).length >= 3;
    const uniformBackground = transparentBackground || corners.filter(([r, g, b, alpha]) => alpha > 240 && Math.hypot(r - background[0], g - background[1], b - background[2]) < 28).length >= 3;
    let left = 0;
    let top = 0;
    let right = probeWidth - 1;
    let bottom = probeHeight - 1;
    if (uniformBackground) {
      left = probeWidth;
      top = probeHeight;
      right = -1;
      bottom = -1;
      for (let y = 0; y < probeHeight; y += 1) {
        for (let x = 0; x < probeWidth; x += 1) {
          const offset = (y * probeWidth + x) * 4;
          const alpha = pixels[offset + 3];
          const visible = transparentBackground
            ? alpha >= 16
            : Math.hypot(pixels[offset] - background[0], pixels[offset + 1] - background[1], pixels[offset + 2] - background[2]) > 28;
          if (visible) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
        }
      }
      if (right < left || bottom < top) { left = 0; top = 0; right = probeWidth - 1; bottom = probeHeight - 1; }
    }
    const scaleX = width / probeWidth;
    const scaleY = height / probeHeight;
    left = Math.max(0, Math.floor(left * scaleX) - 4);
    top = Math.max(0, Math.floor(top * scaleY) - 4);
    right = Math.min(width - 1, Math.ceil((right + 1) * scaleX) - 1 + 4);
    bottom = Math.min(height - 1, Math.ceil((bottom + 1) * scaleY) - 1 + 4);
    const cropWidth = Math.max(1, right - left + 1);
    const cropHeight = Math.max(1, bottom - top + 1);
    const canvasWidth = 1200;
    const canvasHeight = 1500;
    const drawWidth = canvasWidth;
    const drawHeight = canvasHeight;
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(image, left, top, cropWidth, cropHeight, 0, 0, drawWidth, drawHeight);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .94));
    if (!blob) return original;
    return { url: URL.createObjectURL(blob), ratio: cropWidth / cropHeight, revoke: true };
  } catch {
    return original;
  }
}

export default function FlyerCarousel() {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [failedImage, setFailedImage] = useState("");
  const [imageRatio, setImageRatio] = useState(1);
  const [visibleFlyer, setVisibleFlyer] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const current = items[index];

  useEffect(() => {
    let active = true;
    let inFlight = false;

    const loadFlyers = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(`${FLYER_API_BASE}/flyers`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Flyers no disponibles (${response.status})`);
        const nextItems = normalizeFlyers(await response.json());
        if (!active) return;
        setItems((currentItems) => {
          const unchanged = currentItems.length === nextItems.length
            && currentItems.every((item, itemIndex) => item.id === nextItems[itemIndex].id
              && item.name === nextItems[itemIndex].name
              && item.whatsappPhone === nextItems[itemIndex].whatsappPhone
              && item.imageUrl === nextItems[itemIndex].imageUrl);
          return unchanged ? currentItems : nextItems;
        });
        setIndex((currentIndex) => nextItems.length ? currentIndex % nextItems.length : 0);
        setLoadError(false);
      } catch {
        if (active) setLoadError(true);
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    };

    void loadFlyers();
    const timer = window.setInterval(loadFlyers, REFRESH_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (paused || expanded || items.length < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setIndex((currentIndex) => (currentIndex + 1) % items.length), SLIDE_INTERVAL);
    return () => window.clearInterval(timer);
  }, [items.length, paused, expanded]);

  useEffect(() => {
    if (!expanded) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [expanded]);

  useEffect(() => {
    if (!current?.imageUrl) {
      setVisibleFlyer(current || null);
      return undefined;
    }

    let active = true;
    let handled = false;
    let preparedUrl = "";
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";

    const revealWhenDecoded = () => {
      if (handled) return;
      handled = true;
      const decoded = typeof image.decode === "function" ? image.decode().catch(() => {}) : Promise.resolve();
      decoded.then(async () => {
        const prepared = await prepareFlyerImage(image);
        if (!active) { if (prepared.revoke) URL.revokeObjectURL(prepared.url); return; }
        preparedUrl = prepared.revoke ? prepared.url : "";
        setImageRatio(prepared.ratio);
        setVisibleFlyer({ ...current, imageUrl: prepared.url });
        setFailedImage((failed) => failed === current.id ? "" : failed);
      });
    };

    const showError = () => {
      if (active) {
        setImageRatio(1);
        setVisibleFlyer(current);
        setFailedImage(current.id);
      }
    };

    image.onload = revealWhenDecoded;
    image.onerror = showError;
    image.src = current.imageUrl;
    if (image.complete) {
      if (image.naturalWidth > 0) revealWhenDecoded();
      else showError();
    }

    return () => {
      active = false;
      if (preparedUrl) URL.revokeObjectURL(preparedUrl);
      image.onload = null;
      image.onerror = null;
    };
  }, [current?.id, current?.imageUrl]);

  useEffect(() => {
    if (!current) return;
    setVisibleFlyer((previous) => previous?.id === current.id
      ? { ...previous, name: current.name, whatsappPhone: current.whatsappPhone, whatsappLinkPhone: current.whatsappLinkPhone }
      : previous);
  }, [current?.id, current?.name, current?.whatsappPhone, current?.whatsappLinkPhone]);

  useEffect(() => {
    if (items.length < 2) return;
    const next = items[(index + 1) % items.length];
    if (!next?.imageUrl) return;
    const preload = new Image();
    preload.decoding = "async";
    preload.src = next.imageUrl;
  }, [items, index]);

  const move = (step) => {
    if (items.length < 2) return;
    setFailedImage("");
    setIndex((currentIndex) => (currentIndex + step + items.length) % items.length);
  };

  if (loading && !items.length) return null;
  if (!items.length && !loadError) return null;

  if (!items.length && loadError) {
    return (
      <section className="home-flyer-carousel-zone" aria-label="Flyers activos">
        <div className="flyer-carousel-error" role="status" aria-live="polite">
          <span className="flyer-carousel-eyebrow">PUBLICACIONES ACTIVAS</span>
          <p>No se pudieron cargar los flyers ahora. Vamos a volver a intentarlo automáticamente.</p>
        </div>
      </section>
    );
  }

  const currentFailed = failedImage === visibleFlyer?.id;

  return (
    <section className="home-flyer-carousel-zone" aria-label="Flyers activos del Blanqui">
      <div
        className="flyer-carousel-card"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
        }}
      >
        <div className="flyer-carousel-layout">
          <div className="flyer-carousel-heading">
            <div>
              <span className="flyer-carousel-eyebrow">PUBLICACIONES ACTIVAS</span>
              <h2>Flyers del Blanqui</h2>
            </div>
            <span className="flyer-carousel-count" aria-live="polite">
              {String(index + 1).padStart(2, "0")} <i>/</i> {String(items.length).padStart(2, "0")}
            </span>
          </div>

          {visibleFlyer && (
            <div className="flyer-carousel-contact" aria-label={`Contacto de ${visibleFlyer.name}`}>
              <span className="flyer-carousel-contact-label">CONTACTO DEL FLYER</span>
              <strong className="flyer-carousel-contact-name">{visibleFlyer.name}</strong>
              {visibleFlyer.whatsappPhone.length >= 7 && visibleFlyer.whatsappPhone.length <= 15 && (
                <a
                  className="flyer-carousel-whatsapp"
                  href={`https://wa.me/${visibleFlyer.whatsappLinkPhone}?text=${encodeURIComponent("Hola, vi tu flyer en Maxikiosko Blanqui.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir WhatsApp de ${visibleFlyer.name} al ${visibleFlyer.whatsappPhone}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M20.2 11.8a8.2 8.2 0 0 1-12.1 7.2L4 20l1-3.8a8.2 8.2 0 1 1 15.2-4.4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.1 8.7c.2-.4.4-.5.7-.5h.5c.2 0 .4.1.5.4l.8 1.8c.1.2.1.4-.1.6l-.6.7c-.2.2-.2.4-.1.6.5.8 1.1 1.4 1.9 1.8.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.8c.3.1.4.3.4.5 0 .4-.2 1-.6 1.3-.4.4-1 .6-1.5.6-1 0-2.4-.7-3.8-1.9-1.2-1.1-2-2.5-2.1-3.6-.1-.8.1-1.6.4-2.1Z" fill="currentColor" />
                  </svg>
                  <span>WhatsApp · {visibleFlyer.whatsappPhone}</span>
                </a>
              )}
            </div>
          )}

          <div
            className="flyer-carousel-artwork"
            style={{ "--flyer-ratio": imageRatio }}
            aria-busy={visibleFlyer?.id !== current?.id}
            role={visibleFlyer && !currentFailed ? "button" : undefined}
            tabIndex={visibleFlyer && !currentFailed ? 0 : undefined}
            aria-label={visibleFlyer && !currentFailed ? `Ampliar flyer de ${visibleFlyer.name}` : undefined}
            aria-haspopup={visibleFlyer && !currentFailed ? "dialog" : undefined}
            onClick={() => { if (visibleFlyer && !currentFailed) setExpanded(true); }}
            onKeyDown={(event) => {
              if ((event.key === "Enter" || event.key === " ") && visibleFlyer && !currentFailed) {
                event.preventDefault();
                setExpanded(true);
              }
            }}
          >
            {visibleFlyer && !currentFailed ? (
              <img
                src={visibleFlyer.imageUrl}
                alt={`Flyer publicado por ${visibleFlyer.name}`}
                loading="eager"
                decoding="async"
                onError={() => setFailedImage(visibleFlyer.id)}
              />
            ) : visibleFlyer ? (
              <div className="flyer-carousel-image-error" role="img" aria-label={`No se pudo mostrar el flyer de ${visibleFlyer.name}`}>
                No se pudo cargar este flyer.
              </div>
            ) : (
              <span className="flyer-carousel-image-loading" aria-label="Cargando flyer" />
            )}
          </div>

          {items.length > 1 && (
            <div className="flyer-carousel-controls" aria-label="Controles del carrusel de flyers">
              <button type="button" onClick={() => move(-1)} aria-label="Mostrar flyer anterior">‹</button>
              <div className="flyer-carousel-dots" role="group" aria-label="Elegir flyer">
                {items.map((item, dotIndex) => (
                  <button
                    type="button"
                    key={item.id}
                    className={dotIndex === index ? "is-active" : ""}
                    aria-label={`Mostrar flyer de ${item.name}`}
                    aria-current={dotIndex === index ? "true" : undefined}
                    onClick={() => { setIndex(dotIndex); setFailedImage(""); }}
                  />
                ))}
              </div>
              <button type="button" onClick={() => move(1)} aria-label="Mostrar flyer siguiente">›</button>
            </div>
          )}
        </div>
      </div>
      {expanded && visibleFlyer && !currentFailed && (
        <div className="flyer-lightbox-backdrop" onClick={() => setExpanded(false)}>
          <div
            className="flyer-lightbox-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`Flyer ampliado de ${visibleFlyer.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="flyer-lightbox-image-button"
              type="button"
              aria-label="Cerrar flyer ampliado"
              onClick={() => setExpanded(false)}
            >
              <img src={visibleFlyer.imageUrl} alt={`Flyer de ${visibleFlyer.name} ampliado. Tocá la imagen para volver.`} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
