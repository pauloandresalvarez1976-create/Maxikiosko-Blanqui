import { useEffect, useState } from "react";
import { searchOpenFoodFacts } from "./productImageLookup";

// Cache compartido por ID y nombre, para que un cambio de nombre no conserve
// una foto encontrada para el producto anterior.
const imgCache = Object.create(null);

export default function ProductImage({ product = {}, size = 90, className = "" }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const productName = String(product?.name || "");
    const cacheKey = `${product?.id ?? "sin-id"}::${productName.trim().toLowerCase()}`;

    if (product?.customPhoto) {
      const photo = String(product.customPhoto);
      const version = Number(product.photoVersion) || 0;
      const photoSrc = version > 0 && /^https?:\/\//i.test(photo)
        ? `${photo}${photo.includes("?") ? "&" : "?"}v=${version}`
        : photo;
      setSrc(photoSrc);
      setLoading(false);
      return () => { cancelled = true; };
    }

    if (Object.prototype.hasOwnProperty.call(imgCache, cacheKey)) {
      setSrc(imgCache[cacheKey]);
      setLoading(false);
      return () => { cancelled = true; };
    }

    setSrc(null);
    setLoading(true);

    const fetchImage = async () => {
      let image = null;
      try {
        image = await searchOpenFoodFacts(productName);
      } catch {
        // Si la búsqueda externa falla, se conserva el fallback visual.
      }
      if (cancelled) return;
      imgCache[cacheKey] = image || null;
      setSrc(image || null);
      setLoading(false);
    };

    fetchImage();
    return () => { cancelled = true; };
  }, [product?.id, product?.name, product?.customPhoto, product?.photoVersion]);

  if (loading) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#F0FAF2", borderRadius: 10, position: "relative", fontSize: size * 0.44 }}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 20, height: 20, border: "2.5px solid #1A7A2E", borderTop: "2.5px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
        <span style={{ opacity: 0.3 }}>🛒</span>
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#F0FAF2", borderRadius: 10, fontSize: size * 0.44 }}
      >
        🛒
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={product?.name || "Producto"}
      style={{ width: size, height: size, objectFit: "contain", borderRadius: 10, background: "#f9f9f9", padding: 2 }}
      onError={() => {
        imgCache[`${product?.id ?? "sin-id"}::${String(product?.name || "").trim().toLowerCase()}`] = null;
        setSrc(null);
      }}
    />
  );
}
