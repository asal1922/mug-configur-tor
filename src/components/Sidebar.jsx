import { useRef, useState } from "react";

const PARTS = [
    { id: "body", label: "Body", icon: "⬡" },
/*     { id: "cap", label: "Cap", icon: "◉" },
    { id: "ring", label: "Ring", icon: "◈" }, */
];

const PRESETS = [
    "#ffffff", "#0d0d0d", "#1a1a2e", "#e8c06e", "#c0392b", "#2980b9",
    "#27ae60", "#8e44ad", "#e67e22", "#1abc9c", "#e74c3c", "#3498db",
    "#f39c12", "#2c3e50", "#95a5a6", "#d35400", "#16a085", "#6c3483",
];

const BG_PRESETS = [
    "#f0ede8", "#ffffff", "#1a1a2e", "#0d0d0d", "#e8e0d5",
    "#d4e6f1", "#fdebd0", "#e8daef", "#d5f5e3", "#fadbd8",
];

const TEXTURE_PRESETS = [
    {
        id: "marble",
        label: "Marble",
        url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?fm=jpg&q=80&w=2048",
        thumb: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?fm=jpg&q=60&w=120",
    },
    {
        id: "wood",
        label: "Wood",
        url: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?fm=jpg&q=80&w=2048",
        thumb: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?fm=jpg&q=60&w=120",
    },
    {
        id: "fabric",
        label: "Fabric",
        url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?fm=jpg&q=80&w=2048",
        thumb: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?fm=jpg&q=60&w=120",
    },
    {
        id: "concrete",
        label: "Concrete",
        url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?fm=jpg&q=80&w=2048",
        thumb: "https://images.unsplash.com/photo-1557804506-669a67965ba0?fm=jpg&q=60&w=120",
    },
    {
        id: "metal",
        label: "Metal",
        url: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?fm=jpg&q=80&w=2048",
        thumb: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?fm=jpg&q=60&w=120",
    },
    {
        id: "leather",
        label: "Leather",
        url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?fm=jpg&q=80&w=2048",
        thumb: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?fm=jpg&q=60&w=120",
    },
    {
        id: "none",
        label: "None",
        url: null,
        thumb: null,
    },
];

export default function Sidebar({
    selectedPart,
    setSelectedPart,
    colors,
    onColorChange,
    onColorReset,
    onBgImageUpload,
    bgColor,
    onReset,
    customizedParts,
    onTextureChange,
    activeTextures,
}) {
    const bgInputRef = useRef();
    const textureInputRef = useRef();
    const [pickerColor, setPickerColor] = useState("#ffffff");
    const [cartLoading, setCartLoading] = useState(false);

    const isCustomized = customizedParts?.current?.has(selectedPart);
    const displayColor = colors[selectedPart] || pickerColor;
    const activeTextureId = activeTextures?.[selectedPart] || "default";

    const handleAddToCart = async () => {
        setCartLoading(true);
        const variantId = "53278746444123";
        const shopUrl = "mug-customizer.myshopify.com";
        const note = `Body color: ${colors.body || "original"}, Cap color: ${colors.cap || "original"}, Ring color: ${colors.ring || "original"}`;
        const url = `https://${shopUrl}/cart/${variantId}:1?note=${encodeURIComponent(note)}&password=eaviad`;

        // کمی تأخیر برای نشون دادن loading، بعد باز کردن صفحه
        await new Promise(r => setTimeout(r, 800));
        window.open(url, '_blank');
        setCartLoading(false);
    };

    return (
        <div style={{
            width: 260, minWidth: 260, height: "100vh",
            background: "#0a0a0a", display: "flex", flexDirection: "column",
            borderRight: "1px solid #181818", fontFamily: "'DM Sans', sans-serif", overflow: "hidden",
        }}>
            <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid #181818" }}>
                <div style={{ fontSize: 10, color: "#444", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>Product</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5, fontFamily: "'Syne', sans-serif" }}>
                    Design<span style={{ color: "#e8c06e" }}>.</span>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
                <Section label="Select Part">
                    <div style={{ display: "flex", gap: 6 }}>
                        {PARTS.map(p => (
                            <button key={p.id} onClick={() => setSelectedPart(p.id)} style={{
                                flex: 1, padding: "10px 4px", borderRadius: 10,
                                border: selectedPart === p.id ? "1.5px solid #e8c06e" : "1.5px solid #1e1e1e",
                                background: selectedPart === p.id ? "rgba(232,192,110,0.08)" : "#111",
                                color: selectedPart === p.id ? "#e8c06e" : "#555",
                                cursor: "pointer", fontSize: 11, fontWeight: 600,
                                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                                transition: "all 0.15s",
                            }}>
                                <span style={{ fontSize: 20 }}>{p.icon}</span>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </Section>

                {selectedPart && (
                    <Section label={`${selectedPart.charAt(0).toUpperCase() + selectedPart.slice(1)} Texture`}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
                            {TEXTURE_PRESETS.map(tex => (
                                <button
                                    key={tex.id}
                                    onClick={() => onTextureChange?.(selectedPart, tex.url, tex.id)}
                                    title={tex.label}
                                    style={{
                                        aspectRatio: "1", borderRadius: 8, overflow: "hidden", padding: 0,
                                        border: activeTextureId === tex.id ? "2px solid #e8c06e" : "1.5px solid #1e1e1e",
                                        background: tex.thumb ? "transparent" : "#111",
                                        cursor: "pointer", position: "relative",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        transition: "border-color 0.15s",
                                    }}>
                                    {tex.thumb ? (
                                        <img
                                            src={tex.thumb}
                                            alt={tex.label}
                                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <span style={{ fontSize: 20, color: "#333" }}>✕</span>
                                    )}
                                    <div style={{
                                        position: "absolute", bottom: 0, left: 0, right: 0,
                                        background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                                        padding: "4px 3px 3px",
                                        fontSize: 8, color: activeTextureId === tex.id ? "#e8c06e" : "rgba(255,255,255,0.5)",
                                        fontWeight: 600, letterSpacing: 0.5, textAlign: "center",
                                    }}>
                                        {tex.label}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div
                            onClick={() => textureInputRef.current.click()}
                            style={{
                                border: "1.5px dashed #222", borderRadius: 8, padding: "10px",
                                textAlign: "center", cursor: "pointer", color: "#444", fontSize: 11,
                                fontWeight: 500, transition: "all 0.15s", display: "flex", gap: 6,
                                alignItems: "center", justifyContent: "center",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#e8c06e"; e.currentTarget.style.color = "#e8c06e"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#444"; }}
                        >
                            <span style={{ fontSize: 14 }}>📁</span>
                            Upload custom texture
                        </div>
                        <input
                            ref={textureInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={e => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = ev => {
                                    onTextureChange?.(selectedPart, ev.target.result, "custom");
                                };
                                reader.readAsDataURL(file);
                                e.target.value = "";
                            }}
                        />
                    </Section>
                )}

                {selectedPart && (
                    <Section label={`${selectedPart.charAt(0).toUpperCase() + selectedPart.slice(1)} Color`}>
                        <div style={{
                            display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
                            padding: "10px", background: "#111", borderRadius: 10, border: "1px solid #1a1a1a",
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                background: isCustomized ? displayColor : "transparent",
                                border: isCustomized ? "1px solid #2a2a2a" : "1px dashed #333",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                {!isCustomized && <span style={{ fontSize: 16 }}>✦</span>}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: isCustomized ? "#fff" : "#444", fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>
                                    {isCustomized ? displayColor.toUpperCase() : "Original"}
                                </div>
                                <div style={{ color: "#333", fontSize: 10, marginTop: 2 }}>
                                    {isCustomized ? "Custom color" : "GLB material"}
                                </div>
                            </div>
                            <input
                                type="color"
                                value={displayColor}
                                onChange={e => setPickerColor(e.target.value)}
                                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #2a2a2a", cursor: "pointer", padding: 2, background: "none" }}
                            />
                            {isCustomized && colors[selectedPart] && (
                                <button
                                    onClick={() => onColorReset?.(selectedPart)}
                                    title="Remove color"
                                    style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        border: "1px solid #2a1515", background: "#1a0e0e",
                                        color: "#c0392b", cursor: "pointer", fontSize: 14,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        flexShrink: 0,
                                    }}>
                                    ✕
                                </button>
                            )}
                        </div>

                        {!isCustomized && (
                            <button
                                onClick={() => onColorChange(selectedPart, pickerColor)}
                                style={{
                                    width: "100%", padding: "8px", marginBottom: 12,
                                    background: "transparent", border: "1px dashed #333",
                                    borderRadius: 8, color: "#555", fontSize: 12, cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#e8c06e"; e.currentTarget.style.color = "#e8c06e"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#555"; }}
                            >
                                Apply color to {selectedPart}
                            </button>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                            {PRESETS.map((c, i) => (
                                <button key={i}
                                    onClick={() => {
                                        setPickerColor(c);
                                        onColorChange(selectedPart, c);
                                    }}
                                    style={{
                                        width: "100%", aspectRatio: "1", borderRadius: 7, background: c,
                                        border: (isCustomized && colors[selectedPart] === c)
                                            ? "2px solid #e8c06e"
                                            : "1.5px solid rgba(255,255,255,0.06)",
                                        cursor: "pointer", transition: "transform 0.1s",
                                    }}
                                    onMouseEnter={e => e.target.style.transform = "scale(1.2)"}
                                    onMouseLeave={e => e.target.style.transform = "scale(1)"}
                                />
                            ))}
                        </div>
                    </Section>
                )}

                <Section label="Scene Background">
                    <div onClick={() => bgInputRef.current.click()} style={{
                        border: "1.5px dashed #222", borderRadius: 10, padding: "18px 12px",
                        textAlign: "center", cursor: "pointer", color: "#444", marginBottom: 12,
                        transition: "all 0.15s",
                    }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#e8c06e"; e.currentTarget.style.color = "#e8c06e"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#444"; }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🌅</div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>Upload background</div>
                    </div>
                    <input ref={bgInputRef} type="file" accept="image/*" style={{ display: "none" }}
                        onChange={e => {
                            const file = e.target.files[0];
                            if (file) { const r = new FileReader(); r.onload = ev => onBgImageUpload(ev.target.result); r.readAsDataURL(file); }
                        }} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                        {BG_PRESETS.map((c, i) => (
                            <button key={i} onClick={() => onBgImageUpload(null, c)}
                                style={{
                                    width: "100%", aspectRatio: "1", borderRadius: 8, background: c,
                                    border: bgColor === c ? "2px solid #e8c06e" : "1.5px solid rgba(255,255,255,0.06)",
                                    cursor: "pointer", transition: "transform 0.1s",
                                }}
                                onMouseEnter={e => e.target.style.transform = "scale(1.1)"}
                                onMouseLeave={e => e.target.style.transform = "scale(1)"}
                            />
                        ))}
                    </div>
                </Section>
            </div>

            {/* Add to Cart با loading state */}
            <button
                onClick={handleAddToCart}
                disabled={cartLoading}
                style={{
                    margin: "12px 16px 16px",
                    padding: "12px", background: cartLoading
                        ? "linear-gradient(135deg, #b8963a, #a07828)"
                        : "linear-gradient(135deg, #e8c06e, #d4a843)",
                    color: "#0a0a0a", border: "none", borderRadius: 10,
                    fontSize: 13, fontWeight: 700, cursor: cartLoading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.2s", opacity: cartLoading ? 0.85 : 1,
                }}>
                {cartLoading ? (
                    <>
                        <div style={{
                            width: 14, height: 14,
                            border: "2px solid rgba(0,0,0,0.2)",
                            borderTop: "2px solid #0a0a0a",
                            borderRadius: "50%",
                            animation: "spin 0.7s linear infinite",
                        }} />
                        Processing...
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </>
                ) : (
                    "Add to Cart →"
                )}
            </button>
        </div>
    );
}

function Section({ label, children }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
            {children}
        </div>
    );
}