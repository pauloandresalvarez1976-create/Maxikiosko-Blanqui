import { useState, useEffect } from "react";

// Cache de imágenes a nivel de módulo (compartido entre todas las instancias)
const imgCache = {};

export default function ProductImage({ product, size = 90 }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Las fotos sincronizadas desde MiPOS llegan como customPhoto (URL pública).
    // photoVersion evita que el navegador conserve una versión anterior si la URL no cambia.
    if (product.customPhoto) {
      delete imgCache[product.id];
      const photo = String(product.customPhoto);
      const version = Number(product.photoVersion) || 0;
      const photoSrc = version > 0 && /^https?:\/\//i.test(photo)
        ? `${photo}${photo.includes("?") ? "&" : "?"}v=${version}`
        : photo;
      setSrc(photoSrc);
      setLoading(false);
      return;
    }

    const key = product.id;
    if (imgCache[key] !== undefined) {
      setSrc(imgCache[key]);
      setLoading(false);
      return;
    }

    const fetchImage = async () => {
      try {
        // 1️⃣ Intentar Open Food Facts
        const offUrl = await searchOpenFoodFacts(product.name);
        if (offUrl) {
          imgCache[key] = offUrl;
          setSrc(offUrl);
          setLoading(false);
          return;
        }
      } catch {
        /* continúa al fallback */
      }

      // 2️⃣ Fallback: emoji (no null, para no reintentar)
      imgCache[key] = null;
      setSrc(null);
      setLoading(false);
    };

    fetchImage();
  }, [product.id, product.customPhoto, product.photoVersion]);

  if (loading)
    return (
      <div
        style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#F0FAF2", borderRadius: 10, position: "relative", fontSize: size * 0.44, }}
      >
        <div
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", }}
        >
          <div
            style={{ width: 20, height: 20, border: "2.5px solid #1A7A2E", borderTop: "2.5px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", }}
          />
        </div>
        <span style={{ opacity: 0.3 }}>🛒</span>
      </div>
    );

  if (!src)
    return (
      <div
        style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#F0FAF2", borderRadius: 10, fontSize: size * 0.44, }}
      >
        🛒
      </div>
    );

  return (
    <img
      src={src}
      alt={product.name}
      style={{ width: size, height: size, objectFit: "contain", borderRadius: 10, background: "#f9f9f9", padding: 2, }}
      onError={() => {
        imgCache[product.id] = null;
        setSrc(null);
      }}
    />
  );
}
