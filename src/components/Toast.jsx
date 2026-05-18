import { useEffect } from "react";

export default function Toast({ msg, onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 2000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1A2E1A", color: "#fff", padding: "11px 24px", borderRadius: 30, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.35)", whiteSpace: "nowrap", }}
    >
      {msg}
    </div>
  );
}
