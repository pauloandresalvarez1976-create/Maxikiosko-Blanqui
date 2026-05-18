export default function Confetti({ show }) {
  if (!show) return null;
  const colors = [
    "#FFD700",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96E6A1",
    "#FFEAA7",
    "#FD79A8",
    "#A29BFE",
  ];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
    duration: 2 + Math.random() * 2,
    shape: Math.random() > 0.5 ? "circle" : "rect",
  }));
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 99999, pointerEvents: "none", overflow: "hidden", }}
    >
      <style>{`
        @keyframes confettiFall {
          0%{transform:translateY(-20px) rotate(0deg);opacity:1}
          100%{transform:translateY(110vh) rotate(720deg);opacity:0}
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: -20,
            width: p.shape === "circle" ? p.size : p.size * 1.5,
            height: p.size,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            background: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
      <div
        style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#1A7A2E,#FFD700)", color: "#fff", borderRadius: 24, padding: "28px 36px", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.4)", maxWidth: 320, width: "90%", }}
      >
        <div style={{ fontSize: 60, marginBottom: 10 }}>🎉</div>
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>
          ¡Felicitaciones!
        </div>
        <div
          style={{ fontWeight: 700, fontSize: 16, opacity: 0.95, lineHeight: 1.4, }}
        >
          Llegaste a 10 compras
          <br />
          <span style={{ color: "#FFD700", fontSize: 20 }}>
            ¡Tenés 10% de descuento en tu próxima compra!
          </span>
        </div>
      </div>
    </div>
  );
}
