import { useRef, useState } from "react";

const PARTS = [
    { id: "body", label: "Body", icon: "⬡" },
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
        url: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?fm=jpg&q=80&w=2048",
        thumb: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?fm=jpg&q=60&w=120",
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
    isMobile = false,
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
        await new Promise(r => setTimeout(r, 800));
        window.open(url, '_blank');
        setCartLoading(false);
    };

    return (
        <div className={`${isMobile ? "w-full min-h-full" : "w-[260px] min-w-[260px] h-screen"} bg-[#0a0a0a] flex flex-col border-r border-[#181818] font-['DM_Sans'] overflow-hidden`}>

            {/* Header */}
            <div className="px-5 pt-[22px] pb-[18px] border-b border-[#181818]">
                <div className="text-[10px] text-[#444] tracking-[3px] uppercase mb-[6px]">Product</div>
                <div className="text-[22px] font-extrabold text-white tracking-[-0.5px] font-['Syne']">
                    Design<span className="text-[#e8c06e]">.</span>
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-0">

                {/* Select Part */}
                <Section label="Select Part">
                    <div className="flex gap-[6px]">
                        {PARTS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPart(p.id)}
                                className={`flex-1 py-[10px] px-1 rounded-[10px] text-[11px] font-semibold flex flex-col items-center gap-[5px] transition-all duration-150 cursor-pointer
                                    ${selectedPart === p.id
                                        ? "border-[1.5px] border-[#e8c06e] bg-[rgba(232,192,110,0.08)] text-[#e8c06e]"
                                        : "border-[1.5px] border-[#1e1e1e] bg-[#111] text-[#555]"
                                    }`}
                            >
                                <span className="text-[20px]">{p.icon}</span>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Texture */}
                {selectedPart && (
                    <Section label={`${selectedPart.charAt(0).toUpperCase() + selectedPart.slice(1)} Texture`}>
                        <div className="grid grid-cols-4 gap-[6px] mb-2">
                            {TEXTURE_PRESETS.map(tex => (
                                <button
                                    key={tex.id}
                                    onClick={() => onTextureChange?.(selectedPart, tex.url, tex.id)}
                                    title={tex.label}
                                    className={`aspect-square rounded-[8px] overflow-hidden p-0 relative flex items-center justify-center transition-[border-color] duration-150 cursor-pointer
                                        ${activeTextureId === tex.id
                                            ? "border-2 border-[#e8c06e]"
                                            : "border-[1.5px] border-[#1e1e1e]"
                                        }
                                        ${tex.thumb ? "bg-transparent" : "bg-[#111]"}`}
                                >
                                    {tex.thumb ? (
                                        <img
                                            src={tex.thumb}
                                            alt={tex.label}
                                            className="w-full h-full object-cover block"
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <span className="text-[20px] text-[#333]">✕</span>
                                    )}
                                    <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent py-[3px] text-[8px] font-semibold tracking-[0.5px] text-center
                                        ${activeTextureId === tex.id ? "text-[#e8c06e]" : "text-white/50"}`}>
                                        {tex.label}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div
                            onClick={() => textureInputRef.current.click()}
                            className="border-[1.5px] border-dashed border-[#222] rounded-[8px] p-[10px] text-center cursor-pointer text-[#444] text-[11px] font-medium transition-all duration-150 flex gap-[6px] items-center justify-center hover:border-[#e8c06e] hover:text-[#e8c06e]"
                        >
                            <span className="text-[14px]">📁</span>
                            Upload custom texture
                        </div>
                        <input
                            ref={textureInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
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

                {/* Color */}
                {selectedPart && (
                    <Section label={`${selectedPart.charAt(0).toUpperCase() + selectedPart.slice(1)} Color`}>
                        <div className="flex items-center gap-[10px] mb-3 p-[10px] bg-[#111] rounded-[10px] border border-[#1a1a1a]">
                            <div className={`w-9 h-9 rounded-[8px] flex-shrink-0 flex items-center justify-center
                                ${isCustomized ? "border border-[#2a2a2a]" : "border border-dashed border-[#333]"}`}
                                style={{ background: isCustomized ? displayColor : "transparent" }}>
                                {!isCustomized && <span className="text-[16px]">✦</span>}
                            </div>
                            <div className="flex-1">
                                <div className={`text-[12px] font-semibold font-mono ${isCustomized ? "text-white" : "text-[#444]"}`}>
                                    {isCustomized ? displayColor.toUpperCase() : "Original"}
                                </div>
                                <div className="text-[#333] text-[10px] mt-[2px]">
                                    {isCustomized ? "Custom color" : "GLB material"}
                                </div>
                            </div>
                            <input
                                type="color"
                                value={displayColor}
                                onChange={e => setPickerColor(e.target.value)}
                                className="w-8 h-8 rounded-[8px] border border-[#2a2a2a] cursor-pointer p-[2px] bg-transparent"
                            />
                            {isCustomized && colors[selectedPart] && (
                                <button
                                    onClick={() => onColorReset?.(selectedPart)}
                                    title="Remove color"
                                    className="w-8 h-8 rounded-[8px] border border-[#2a1515] bg-[#1a0e0e] text-[#c0392b] cursor-pointer text-[14px] flex items-center justify-center flex-shrink-0"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {!isCustomized && (
                            <button
                                onClick={() => onColorChange(selectedPart, pickerColor)}
                                className="w-full py-2 mb-3 bg-transparent border border-dashed border-[#333] rounded-[8px] text-[#555] text-[12px] cursor-pointer transition-all duration-150 hover:border-[#e8c06e] hover:text-[#e8c06e]"
                            >
                                Apply color to {selectedPart}
                            </button>
                        )}

                        <div className="grid grid-cols-6 gap-[6px]">
                            {PRESETS.map((c, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setPickerColor(c);
                                        onColorChange(selectedPart, c);
                                    }}
                                    className="w-full aspect-square rounded-[7px] cursor-pointer transition-transform duration-100 hover:scale-[1.2]"
                                    style={{
                                        background: c,
                                        border: (isCustomized && colors[selectedPart] === c)
                                            ? "2px solid #e8c06e"
                                            : "1.5px solid rgba(255,255,255,0.06)",
                                    }}
                                />
                            ))}
                        </div>
                    </Section>
                )}

                {/* Background */}
                <Section label="Scene Background">
                    <div
                        onClick={() => bgInputRef.current.click()}
                        className="border-[1.5px] border-dashed border-[#222] rounded-[10px] py-[18px] px-3 text-center cursor-pointer text-[#444] mb-3 transition-all duration-150 hover:border-[#e8c06e] hover:text-[#e8c06e]"
                    >
                        <div className="text-[24px] mb-1">🌅</div>
                        <div className="text-[12px] font-medium">Upload background</div>
                    </div>
                    <input
                        ref={bgInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                            const file = e.target.files[0];
                            if (file) { const r = new FileReader(); r.onload = ev => onBgImageUpload(ev.target.result); r.readAsDataURL(file); }
                        }}
                    />
                    <div className="grid grid-cols-5 gap-[6px]">
                        {BG_PRESETS.map((c, i) => (
                            <button
                                key={i}
                                onClick={() => onBgImageUpload(null, c)}
                                className="w-full aspect-square rounded-[8px] cursor-pointer transition-transform duration-100 hover:scale-[1.1]"
                                style={{
                                    background: c,
                                    border: bgColor === c ? "2px solid #e8c06e" : "1.5px solid rgba(255,255,255,0.06)",
                                }}
                            />
                        ))}
                    </div>
                </Section>

                {/* bottom padding so last section isn't hidden behind the button */}
                <div className="h-4" />
            </div>

            {/* Add to Cart */}
            <button
                onClick={handleAddToCart}
                disabled={cartLoading}
                className={`mx-4 my-4 py-3 rounded-[10px] text-[13px] font-bold text-[#0a0a0a] flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer
                    ${cartLoading ? "opacity-85 cursor-not-allowed" : "hover:brightness-105"}`}
                style={{
                    background: cartLoading
                        ? "linear-gradient(135deg, #b8963a, #a07828)"
                        : "linear-gradient(135deg, #e8c06e, #d4a843)"
                }}
            >
                {cartLoading ? (
                    <>
                        <div className="w-[14px] h-[14px] rounded-full border-2 border-black/20 border-t-[#0a0a0a] animate-spin" />
                        Processing...
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
        <div className="mb-5">
            <div className="text-[10px] text-[#444] tracking-[2px] uppercase mb-[10px]">{label}</div>
            {children}
        </div>
    );
}