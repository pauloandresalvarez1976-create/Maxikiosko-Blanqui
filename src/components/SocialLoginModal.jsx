import { useState } from "react";

export default function SocialLoginModal({ onLogin, onClose, prefill }) {
  const [step, setStep] = useState("choose"); // choose | form
  const [provider, setProvider] = useState(null);
  const [name, setName] = useState(prefill?.name || "");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");

  const providers = [
    {
      id: "google",
      label: "Continuar con Google",
      color: "#fff",
      border: "#DDD",
      textColor: "#333",
      icon: (
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.96 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
      ),
    },
    {
      id: "facebook",
      label: "Continuar con Facebook",
      color: "#1877F2",
      border: "#1877F2",
      textColor: "#fff",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      id: "instagram",
      label: "Continuar con Instagram",
      color: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
      border: "transparent",
      textColor: "#fff",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
  ];

  const handleProviderClick = (p) => {
    setProvider(p);
    setStep("form");
    setHandle("");
    setError("");
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Ingresá tu nombre");
      return;
    }
    if (!handle.trim()) {
      setError(
        `Ingresá tu usuario de ${
          provider.id === "google" ? "Gmail" : provider.id
        }`
      );
      return;
    }
    onLogin({
      name: name.trim(),
      handle: handle.trim(),
      provider: provider.id,
    });
  };

  const placeholders = {
    google: "tucorreo@gmail.com",
    facebook: "tu.usuario.facebook",
    instagram: "@tu_usuario",
  };

  const labels = {
    google: "Correo de Gmail",
    facebook: "Usuario de Facebook",
    instagram: "Usuario de Instagram",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 700, display: "flex", alignItems: "flex-end", justifyContent: "center", }}
    >
      <div
        style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, padding: "28px 24px 36px", maxHeight: "90vh", overflowY: "auto", }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: "#1A2E1A" }}>
              👤{" "}
              {step === "choose"
                ? "Identificate"
                : `Continuar con ${
                    provider?.id === "google"
                      ? "Google"
                      : provider?.id === "facebook"
                      ? "Facebook"
                      : "Instagram"
                  }`}
            </div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 3 }}>
              Para guardar tus puntos de fidelización
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#F0F0F0", border: "none", borderRadius: "50%", width: 34, height: 34, fontSize: 20, cursor: "pointer", }}
          >
            ×
          </button>
        </div>

        {step === "choose" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderClick(p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "13px 18px",
                  borderRadius: 12,
                  border: `1.5px solid ${p.border}`,
                  background:
                    p.id === "instagram"
                      ? "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)"
                      : p.color,
                  color: p.textColor,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center" }}>
                  {p.icon}
                </span>
                {p.label}
              </button>
            ))}
            <div
              style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "#AAA", }}
            >
              Solo usamos tu nombre de usuario para identificarte
              <br />y guardarte los descuentos 🎁
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{ background: "#F5FBF6", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, }}
            >
              {provider?.icon}
              <span style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>
                Registrándote con{" "}
                {provider?.id === "google"
                  ? "Google"
                  : provider?.id === "facebook"
                  ? "Facebook"
                  : "Instagram"}
              </span>
            </div>
            <div>
              <label
                style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 4, }}
              >
                Tu nombre *
              </label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="¿Cómo te llamás?"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #DDD", borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", }}
              />
            </div>
            <div>
              <label
                style={{ fontSize: 12, fontWeight: 700, color: "#444", display: "block", marginBottom: 4, }}
              >
                {labels[provider?.id]} *
              </label>
              <input
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value);
                  setError("");
                }}
                placeholder={placeholders[provider?.id]}
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #DDD", borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", }}
              />
            </div>
            {error && (
              <div style={{ color: "#CC1111", fontSize: 13, fontWeight: 600 }}>
                ⚠️ {error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              style={{ background: "#1A7A2E", color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "inherit", marginTop: 4, }}
            >
              ✅ Confirmar y continuar
            </button>
            <button
              onClick={() => setStep("choose")}
              style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "inherit", }}
            >
              ← Elegir otra red social
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
