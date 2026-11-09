import { useState } from "react";

export default function ProductImage({ product = {}, size = 90, className = "", showPhoto = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoUrl = showPhoto
    ? (product?.customPhoto || product?.photoUrl || product?.imageUrl || "")
    : "";

  return (
    <div
      className={className}
      role="img"
      aria-label={product?.name || "Producto"}
      style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#F0FAF2", borderRadius: 10, fontSize: size * 0.44 }}
    >
      {photoUrl && !imageFailed ? (
        <img
          className="product-photo-image"
          src={photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{product?.emoji || "🛒"}</span>
      )}
    </div>
  );
}
