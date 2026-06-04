export default function ColorPicker({ onChange, disabled, value }) {
  return (
    <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
      <input
        type="color"
        disabled={disabled}
        value={value || "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 40, height: 40, cursor: disabled ? "not-allowed" : "pointer" }}
      />
      {disabled && (
        <p style={{ color: "#999", fontSize: 12 }}>یک قسمت انتخاب کن</p>
      )}
    </div>
  );
}