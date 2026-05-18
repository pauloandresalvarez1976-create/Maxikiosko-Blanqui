export default function Toggle({ value, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: value ? "#00A650" : "#CCC", position: "relative", transition: "background 0.25s", flexShrink: 0, }}
    >
      <div
        style={{ position: "absolute", top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", }}
      />
    </div>
  );
}
