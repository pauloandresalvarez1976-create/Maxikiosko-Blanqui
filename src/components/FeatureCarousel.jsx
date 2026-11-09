import { useEffect, useState } from "react";

function money(value) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

export default function FeatureCarousel({ title, eyebrow, description, items = [], variant = "arrivals", emptyMessage, actionLabel, onAction }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failedImage, setFailedImage] = useState("");

  useEffect(() => {
    setIndex(0);
    setFailedImage("");
  }, [items.length, variant]);

  useEffect(() => {
    if (paused || items.length < 2) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), 2800);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  const move = (step) => {
    if (!items.length) return;
    setFailedImage("");
    setIndex((current) => (current + step + items.length) % items.length);
  };

  const current = items[index];
  const photo = current?.photo || current?.customPhoto || current?.product?.customPhoto || "";
  const photoKey = `${current?.id ?? current?.productId ?? index}:${photo}`;

  return (
    <section
      className={`feature-carousel feature-carousel-${variant}`}
      aria-label={title}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="feature-carousel-heading">
        <div>
          <span className="feature-carousel-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="feature-carousel-heading-actions">
          {actionLabel && onAction && <button className="feature-carousel-action" type="button" onClick={onAction}>{actionLabel}<span className="feature-carousel-action-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></span></button>}
          <span className={`feature-carousel-live ${items.length ? "has-data" : "is-waiting"}`}><i /> {items.length ? "SINCRONIZADO" : "EN ESPERA"}</span>
        </div>
      </div>

      {current ? (
        <div className="feature-carousel-slide" key={photoKey}>
          <div className="feature-carousel-image-frame">
            {photo && failedImage !== photoKey ? (
              <img
                src={photo}
                alt={current.name || current.product?.name || "Producto destacado"}
                loading="lazy"
                onError={() => setFailedImage(photoKey)}
              />
            ) : (
              <span className="feature-carousel-fallback" aria-hidden="true">{current.emoji || current.product?.emoji || (variant === "arrivals" ? "📦" : "✦")}</span>
            )}
            <span className="feature-carousel-image-glow" aria-hidden="true" />
            {variant === "promotions" && current.badge && <span className="feature-carousel-badge feature-carousel-badge-overlay">{current.badge}</span>}
          </div>
          <div className="feature-carousel-product-info">
            <span className="feature-carousel-product-kicker">{current.kicker || (variant === "arrivals" ? "RECIÉN INCORPORADO" : "OFERTA VIGENTE")}</span>
            <h3>{current.name || current.product?.name || "Producto destacado"}</h3>
            {current.subtitle && <p className="feature-carousel-product-subtitle">{current.subtitle}</p>}
            <div className="feature-carousel-price-row">
              {current.originalPrice > current.price && <del>{money(current.originalPrice)}</del>}
              {Number.isFinite(Number(current.price)) && Number(current.price) > 0 && <strong>{money(current.price)}</strong>}
              {variant !== "promotions" && current.badge && <span className="feature-carousel-badge">{current.badge}</span>}
            </div>
            <span className="feature-carousel-slide-count">{String(index + 1).padStart(2, "0")} <i>/</i> {String(items.length).padStart(2, "0")}</span>
          </div>
          <div className="feature-carousel-controls" aria-label="Controles del carrusel">
            <button type="button" onClick={() => move(-1)} aria-label={`Anterior: ${title}`}>‹</button>
            <div className="feature-carousel-dots" role="group" aria-label="Elegir producto">
              {items.map((item, dotIndex) => (
                <button
                  type="button"
                  key={item.id ?? item.productId ?? dotIndex}
                  className={dotIndex === index ? "is-active" : ""}
                  aria-label={`Mostrar ${item.name || item.product?.name || `producto ${dotIndex + 1}`}`}
                  aria-current={dotIndex === index ? "true" : undefined}
                  onClick={() => { setIndex(dotIndex); setFailedImage(""); }}
                />
              ))}
            </div>
            <button type="button" onClick={() => move(1)} aria-label={`Siguiente: ${title}`}>›</button>
          </div>
        </div>
      ) : (
        <div className="feature-carousel-empty">
          <span aria-hidden="true">{variant === "arrivals" ? "📦" : "✦"}</span>
          <p>{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}
