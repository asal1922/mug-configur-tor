import { useRef, useEffect, useCallback, useState } from "react";

export default function CanvasEditor({
    sharedCanvas,
    baseColor,
    onUpdate,
    selectedPart,
    elements,
    onElementsChange,
    originalCanvas,
    textureVersion,
}) {
    const displayRef = useRef(null);
    const draggingRef = useRef(null);
    const resizingRef = useRef(null);
    const selectedIdRef = useRef(null);
    const textInputRef = useRef(null);
    const textColorRef = useRef("#ffffff");
    const fontSizeRef = useRef(120);
    const fontFamilyRef = useRef("Arial");
    const fileInputRef = useRef();

    const [tool, setTool] = useState("select");
    const [brushSize, setBrushSize] = useState(20);
    const [brushColor, setBrushColor] = useState("#e8c06e");
    const [eraserSize, setEraserSize] = useState(30);
    const [paintSubTool, setPaintSubTool] = useState("brush");

    const isDrawingRef = useRef(false);
    const lastPosRef = useRef(null);
    const currentStrokeRef = useRef(null);

    const [, forceRender] = useState(0);
    const forceUpdate = useCallback(() => forceRender(n => n + 1), []);

    const W = sharedCanvas.width;
    const H = sharedCanvas.height;
    const displayAspect = W / H;

    const redraw = useCallback((els = elements) => {
        const ctx = sharedCanvas.getContext("2d");
        ctx.clearRect(0, 0, W, H);

        const hasOriginalContent = (() => {
            if (!originalCanvas) return false;
            try {
                const d = originalCanvas.getContext("2d").getImageData(0, 0, 4, 4).data;
                return d.some(v => v !== 0);
            } catch { return false; }
        })();

        if (hasOriginalContent) {
            ctx.drawImage(originalCanvas, 0, 0, W, H);
            if (baseColor) {
                ctx.save();
                ctx.globalCompositeOperation = "multiply";
                ctx.fillStyle = baseColor;
                ctx.fillRect(0, 0, W, H);
                ctx.restore();
                ctx.globalCompositeOperation = "source-over";
            }
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        els.forEach(el => {
            if (el.type === "image") ctx.drawImage(el.image, el.x, el.y, el.w, el.h);
            if (el.type === "text") {
                ctx.save();
                ctx.font = `bold ${el.size}px ${el.font || "Arial"}`;
                ctx.fillStyle = el.color;
                ctx.textBaseline = "top";
                ctx.fillText(el.text, el.x, el.y);
                ctx.restore();
            }
            if (el.type === "stroke") drawStroke(ctx, el);
            if (el.type === "eraser") drawEraser(ctx, el, sharedCanvas);
        });

        if (displayRef.current) {
            const dCtx = displayRef.current.getContext("2d");
            dCtx.clearRect(0, 0, W, H);

            if (hasOriginalContent) {
                dCtx.drawImage(originalCanvas, 0, 0, W, H);
                if (baseColor) {
                    dCtx.save();
                    dCtx.globalCompositeOperation = "multiply";
                    dCtx.fillStyle = baseColor;
                    dCtx.fillRect(0, 0, W, H);
                    dCtx.restore();
                }
            } else if (baseColor) {
                dCtx.save();
                dCtx.fillStyle = baseColor;
                dCtx.fillRect(0, 0, W, H);
                dCtx.restore();
            } else {
                const tile = 64;
                for (let row = 0; row < H; row += tile) {
                    for (let col = 0; col < W; col += tile) {
                        dCtx.fillStyle = ((col / tile + row / tile) % 2 === 0) ? "#1c1c1c" : "#161616";
                        dCtx.fillRect(col, row, tile, tile);
                    }
                }
            }

            els.forEach(el => {
                if (el.type === "image") dCtx.drawImage(el.image, el.x, el.y, el.w, el.h);
                if (el.type === "text") {
                    dCtx.save();
                    dCtx.font = `bold ${el.size}px ${el.font || "Arial"}`;
                    dCtx.fillStyle = el.color;
                    dCtx.textBaseline = "top";
                    dCtx.fillText(el.text, el.x, el.y);
                    dCtx.restore();
                }
                if (el.type === "stroke") drawStroke(dCtx, el);
                if (el.type === "eraser") drawEraser(dCtx, el, displayRef.current);
            });
        }

        onUpdate?.();
    }, [sharedCanvas, originalCanvas, W, H, baseColor, onUpdate, elements]);

    function drawStroke(ctx, el) {
        if (!el.points || el.points.length < 2) return;
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.size;
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) ctx.lineTo(el.points[i].x, el.points[i].y);
        ctx.stroke();
        ctx.restore();
    }

    function drawEraser(ctx, el, targetCanvas) {
        if (!el.points || el.points.length < 2) return;
        const mask = document.createElement("canvas");
        mask.width = W; mask.height = H;
        const mCtx = mask.getContext("2d");
        mCtx.lineCap = "round";
        mCtx.lineJoin = "round";
        mCtx.lineWidth = el.size;
        mCtx.strokeStyle = "black";
        mCtx.beginPath();
        mCtx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) mCtx.lineTo(el.points[i].x, el.points[i].y);
        mCtx.stroke();

        const base = document.createElement("canvas");
        base.width = W; base.height = H;
        const bCtx = base.getContext("2d");
        if (originalCanvas) {
            const hasContent = (() => {
                try { return originalCanvas.getContext("2d").getImageData(0, 0, 4, 4).data.some(v => v !== 0); }
                catch { return false; }
            })();
            if (hasContent) {
                bCtx.drawImage(originalCanvas, 0, 0, W, H);
                if (baseColor) {
                    bCtx.save();
                    bCtx.globalCompositeOperation = "multiply";
                    bCtx.fillStyle = baseColor;
                    bCtx.fillRect(0, 0, W, H);
                    bCtx.restore();
                }
            } else if (baseColor) {
                bCtx.fillStyle = baseColor;
                bCtx.fillRect(0, 0, W, H);
            }
        }

        bCtx.save();
        bCtx.globalCompositeOperation = "destination-in";
        bCtx.drawImage(mask, 0, 0);
        bCtx.restore();

        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.drawImage(mask, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(base, 0, 0);
        ctx.restore();
    }

    useEffect(() => {
        redraw(elements);
    }, [elements, baseColor, textureVersion]);

    const getPos = (e) => {
        const rect = displayRef.current.getBoundingClientRect();
        // Support both mouse and touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: ((clientX - rect.left) / rect.width) * W,
            y: ((clientY - rect.top) / rect.height) * H,
        };
    };

    const getSelectedEl = () => elements.find(el => el.id === selectedIdRef.current);

    const handleMouseDown = (e) => {
        const { x, y } = getPos(e);

        if (tool === "paint") {
            isDrawingRef.current = true;
            lastPosRef.current = { x, y };
            const isEraser = paintSubTool === "eraser";
            const stroke = {
                id: Date.now(),
                type: isEraser ? "eraser" : "stroke",
                color: brushColor,
                size: isEraser ? eraserSize : brushSize,
                points: [{ x, y }],
            };
            currentStrokeRef.current = stroke;
            onElementsChange([...elements, stroke]);
            return;
        }

        const sel = getSelectedEl();
        if (sel) {
            const elH = sel.type === "text" ? sel.size * 1.2 : sel.h;
            const rx = sel.x + sel.w, ry = sel.y + elH;
            if (Math.abs(x - rx) < 40 && Math.abs(y - ry) < 40) {
                resizingRef.current = { id: sel.id, startX: x, startY: y, startW: sel.w, startH: sel.h, startSize: sel.size };
                return;
            }
        }

        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            if (el.type === "stroke" || el.type === "eraser") continue;
            const elH = el.type === "text" ? el.size * 1.2 : el.h;
            if (x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + elH) {
                selectedIdRef.current = el.id;
                draggingRef.current = { id: el.id, offX: x - el.x, offY: y - el.y };
                forceUpdate();
                return;
            }
        }
        selectedIdRef.current = null;
        forceUpdate();
    };

    const handleMouseMove = (e) => {
        if (tool === "paint" && isDrawingRef.current && currentStrokeRef.current) {
            const { x, y } = getPos(e);
            const updatedStroke = {
                ...currentStrokeRef.current,
                points: [...currentStrokeRef.current.points, { x, y }],
            };
            currentStrokeRef.current = updatedStroke;
            onElementsChange(elements.map(el => el.id === updatedStroke.id ? updatedStroke : el));
            return;
        }

        if (draggingRef.current) {
            const { x, y } = getPos(e);
            onElementsChange(elements.map(el =>
                el.id === draggingRef.current.id
                    ? { ...el, x: x - draggingRef.current.offX, y: y - draggingRef.current.offY }
                    : el
            ));
        }
        if (resizingRef.current) {
            const { x } = getPos(e);
            const dx = x - resizingRef.current.startX;
            onElementsChange(elements.map(el => {
                if (el.id !== resizingRef.current.id) return el;
                if (el.type === "image") {
                    const ratio = resizingRef.current.startH / resizingRef.current.startW;
                    const newW = Math.max(50, resizingRef.current.startW + dx);
                    return { ...el, w: newW, h: newW * ratio };
                }
                return { ...el, size: Math.max(20, resizingRef.current.startSize + dx / 5) };
            }));
        }
    };

    const handleMouseUp = () => {
        isDrawingRef.current = false;
        lastPosRef.current = null;
        currentStrokeRef.current = null;
        draggingRef.current = null;
        resizingRef.current = null;
    };

    const addImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const maxW = W * 0.4;
            const ratio = img.height / img.width;
            const w = Math.min(maxW, img.width);
            onElementsChange([...elements, {
                id: Date.now(), type: "image", image: img,
                x: W / 2 - w / 2, y: H / 2 - (w * ratio) / 2,
                w, h: w * ratio,
            }]);
            URL.revokeObjectURL(url);
        };
        img.src = url;
        e.target.value = "";
    };

    const addText = () => {
        const text = textInputRef.current?.value?.trim();
        if (!text) return;
        const size = fontSizeRef.current;
        onElementsChange([...elements, {
            id: Date.now(), type: "text", text,
            x: W * 0.1, y: H * 0.4,
            w: text.length * size * 0.65,
            size, color: textColorRef.current, font: fontFamilyRef.current,
        }]);
        if (textInputRef.current) textInputRef.current.value = "";
    };

    const updateSelectedColor = (color) => {
        onElementsChange(elements.map(el =>
            el.id === selectedIdRef.current ? { ...el, color } : el
        ));
    };

    const deleteSelected = () => {
        onElementsChange(elements.filter(el => el.id !== selectedIdRef.current));
        selectedIdRef.current = null;
        forceUpdate();
    };

    const undoLastStroke = () => {
        const lastIdx = [...elements].reverse().findIndex(el => el.type === "stroke" || el.type === "eraser");
        if (lastIdx === -1) return;
        const realIdx = elements.length - 1 - lastIdx;
        onElementsChange(elements.filter((_, i) => i !== realIdx));
    };

    const clearAllStrokes = () => {
        onElementsChange(elements.filter(el => el.type !== "stroke" && el.type !== "eraser"));
    };

    const selected = getSelectedEl();
    const strokeCount = elements.filter(e => e.type === "stroke" || e.type === "eraser").length;

    const getCursor = () => {
        if (tool === "paint") return paintSubTool === "eraser" ? "cell" : "crosshair";
        if (draggingRef.current) return "grabbing";
        return "default";
    };

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="px-[14px] py-[10px] bg-[#0a0a0a] border-b border-[#1f1f1f] flex gap-[6px] items-center flex-wrap">
                <span className="text-[#444] text-[10px] tracking-[2px] uppercase mr-1">Editor</span>

                {/* Tool selector */}
                <div className="flex gap-[3px] bg-[#111] rounded-[8px] p-[3px] border border-[#1e1e1e]">
                    {[
                        { id: "select", icon: "↖", label: "Select" },
                        { id: "paint", icon: "✏", label: "Paint" },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => { setTool(t.id); selectedIdRef.current = null; }}
                            title={t.label}
                            className={`px-[10px] py-[5px] rounded-[6px] border-none text-[13px] font-semibold cursor-pointer transition-all duration-[120ms]
                                ${tool === t.id ? "bg-[#e8c06e] text-[#0a0a0a]" : "bg-transparent text-[#555]"}`}
                        >
                            {t.icon}
                        </button>
                    ))}
                </div>

                {/* Paint sub-tools */}
                {tool === "paint" && (
                    <div className="flex gap-[3px] bg-[#111] rounded-[8px] p-[3px] border border-[#1e1e1e]">
                        <button
                            onClick={() => setPaintSubTool("brush")}
                            className={`px-[10px] py-[5px] rounded-[6px] border-none text-[13px] font-semibold cursor-pointer transition-all duration-[120ms]
                                ${paintSubTool === "brush" ? "bg-[#e8c06e] text-[#0a0a0a]" : "bg-transparent text-[#555]"}`}
                        >
                            ✏ Brush
                        </button>
                        <button
                            onClick={() => setPaintSubTool("eraser")}
                            className={`px-[10px] py-[5px] rounded-[6px] border-none text-[13px] font-semibold cursor-pointer transition-all duration-[120ms]
                                ${paintSubTool === "eraser" ? "bg-[#e8c06e] text-[#0a0a0a]" : "bg-transparent text-[#555]"}`}
                        >
                            ◻ Eraser
                        </button>
                    </div>
                )}

                {/* Brush controls */}
                {tool === "paint" && paintSubTool === "brush" && (
                    <div className="flex gap-[6px] items-center bg-[#111] rounded-[8px] px-[10px] py-[5px] border border-[#1e1e1e]">
                        <input
                            type="color"
                            value={brushColor}
                            onChange={e => setBrushColor(e.target.value)}
                            className="w-7 h-7 rounded-[6px] border border-[#2a2a2a] cursor-pointer p-[1px] bg-transparent"
                        />
                        <span className="text-[#444] text-[10px]">SIZE</span>
                        <input
                            type="range" min={3} max={120} value={brushSize}
                            onChange={e => setBrushSize(Number(e.target.value))}
                            className="w-20 accent-[#e8c06e]"
                        />
                        <span className="text-[#888] text-[11px] min-w-[24px]">{brushSize}</span>
                    </div>
                )}

                {/* Eraser controls */}
                {tool === "paint" && paintSubTool === "eraser" && (
                    <div className="flex gap-[6px] items-center bg-[#111] rounded-[8px] px-[10px] py-[5px] border border-[#1e1e1e]">
                        <span className="text-[16px]">◻</span>
                        <span className="text-[#444] text-[10px]">SIZE</span>
                        <input
                            type="range" min={5} max={200} value={eraserSize}
                            onChange={e => setEraserSize(Number(e.target.value))}
                            className="w-20 accent-[#e8c06e]"
                        />
                        <span className="text-[#888] text-[11px] min-w-[24px]">{eraserSize}</span>
                    </div>
                )}

                {/* Stroke actions */}
                {strokeCount > 0 && (
                    <div className="flex gap-1 items-center">
                        <button
                            onClick={undoLastStroke}
                            className="px-[10px] py-[6px] rounded-[7px] border border-[#1e1e1e] bg-[#111] text-[#888] cursor-pointer text-[11px] font-semibold"
                        >
                            ↩ Undo
                        </button>
                        <button
                            onClick={clearAllStrokes}
                            className="px-[10px] py-[6px] rounded-[7px] border border-[#2a1515] bg-[#1a0e0e] text-[#c0392b] cursor-pointer text-[11px] font-semibold"
                        >
                            ✕ Clear Paint
                        </button>
                        <span className="text-[#333] text-[10px]">{strokeCount} stroke{strokeCount !== 1 ? "s" : ""}</span>
                    </div>
                )}

                {/* Select tool controls */}
                {tool === "select" && (
                    <div className="flex gap-[6px] items-center flex-1">
                        <ToolBtn icon="🖼" label="Image" color="#e8c06e" dark onClick={() => fileInputRef.current.click()} />
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={addImage} />

                        <div className="flex gap-[5px] items-center flex-1 min-w-[200px]">
                            <input
                                ref={textInputRef}
                                onKeyDown={e => e.key === "Enter" && addText()}
                                placeholder="Type text..."
                                className="flex-1 bg-[#161616] border border-[#2a2a2a] rounded-[8px] text-white px-[10px] py-[6px] text-[12px] outline-none"
                            />
                            <select
                                defaultValue="Arial"
                                onChange={e => { fontFamilyRef.current = e.target.value; }}
                                className="bg-[#161616] border border-[#2a2a2a] rounded-[7px] text-white px-[7px] py-[6px] text-[11px] outline-none cursor-pointer"
                            >
                                {["Arial", "Georgia", "Impact", "Verdana", "Courier New", "Times New Roman"].map(f =>
                                    <option key={f} value={f}>{f}</option>
                                )}
                            </select>
                            <input
                                type="color"
                                defaultValue="#ffffff"
                                onChange={e => { textColorRef.current = e.target.value; }}
                                className="w-8 h-8 rounded-[7px] border border-[#333] cursor-pointer p-[2px] bg-transparent"
                            />
                            <input
                                type="range" min={40} max={300} defaultValue={120}
                                onChange={e => { fontSizeRef.current = Number(e.target.value); }}
                                className="w-[60px] accent-[#e8c06e]"
                            />
                            <ToolBtn icon="T+" label="Add" color="#2a2a2a" onClick={addText} />
                        </div>

                        {selected && (
                            <div className="flex gap-[5px] items-center">
                                {selected.type === "text" && (
                                    <input
                                        type="color"
                                        value={selected.color}
                                        onChange={e => updateSelectedColor(e.target.value)}
                                        className="w-7 h-7 rounded-[7px] border border-[#333] cursor-pointer p-[2px] bg-transparent"
                                    />
                                )}
                                <ToolBtn icon="🗑" label="Delete" color="#c0392b" onClick={deleteSelected} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Canvas area */}
            <div className="flex-1 flex items-center justify-center p-5 overflow-hidden">
                <div className="relative w-full max-w-full" style={{ aspectRatio: `${displayAspect}` }}>
                    {/* Center guide line */}
                    <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-white/[0.08] z-[1] pointer-events-none" />
                    <div className="absolute top-2 left-[25%] -translate-x-1/2 text-white/20 text-[11px] tracking-[1px] z-[1] pointer-events-none">FRONT</div>
                    <div className="absolute top-2 left-[75%] -translate-x-1/2 text-white/20 text-[11px] tracking-[1px] z-[1] pointer-events-none">BACK</div>

                    {/* Tool indicator badge */}
                    <div
                        className="absolute top-2 right-3 z-[2] px-[10px] py-[3px] rounded-[20px] text-[10px] font-bold tracking-[1px] uppercase border border-white/10 pointer-events-none"
                        style={{
                            background: tool === "paint"
                                ? (paintSubTool === "eraser" ? "rgba(80,80,80,0.85)" : brushColor)
                                : "rgba(0,0,0,0.5)",
                            color: tool === "paint" ? (paintSubTool === "eraser" ? "#fff" : "#000") : "#888",
                        }}
                    >
                        {tool === "paint"
                            ? (paintSubTool === "eraser" ? `◻ Eraser · ${eraserSize}px` : `✏ Paint · ${brushSize}px`)
                            : "↖ Select"
                        }
                    </div>

                    <canvas
                        ref={displayRef}
                        width={W}
                        height={H}
                        className="w-full h-full block rounded-[10px] border border-[#1f1f1f]"
                        style={{ cursor: getCursor() }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={e => { e.preventDefault(); handleMouseDown(e); }}
                        onTouchMove={e => { e.preventDefault(); handleMouseMove(e); }}
                        onTouchEnd={handleMouseUp}
                    />

                    {/* Selection overlay */}
                    {tool === "select" && selected && (() => {
                        const elH = selected.type === "text" ? selected.size * 1.2 : selected.h;
                        const pct = (v, total) => `${(v / total) * 100}%`;
                        return (
                            <div className="absolute pointer-events-none" style={{ left: pct(selected.x, W), top: pct(selected.y, H), width: pct(selected.w, W), height: pct(elH, H) }}>
                                <div className="absolute inset-0 border-[1.5px] border-[#e8c06e] rounded-[2px]" />
                                <div
                                    className="absolute -right-[6px] -bottom-[6px] w-3 h-3 bg-[#e8c06e] rounded-[3px] cursor-se-resize pointer-events-auto"
                                    onMouseDown={e => {
                                        e.stopPropagation();
                                        const { x, y } = getPos(e);
                                        resizingRef.current = { id: selected.id, startX: x, startY: y, startW: selected.w, startH: selected.h, startSize: selected.size };
                                    }}
                                />
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Status bar */}
            <div className="px-[14px] py-[7px] border-t border-[#1a1a1a] flex justify-between items-center gap-2">
                <span className="text-[#333] text-[10px]">{elements.length} element{elements.length !== 1 ? "s" : ""}</span>
                {selected && tool === "select" && (
                    <span className="text-[#555] text-[10px]">{selected.type} · {Math.round(selected.x)}, {Math.round(selected.y)}</span>
                )}
                <span className="text-[#333] text-[10px]">{W}×{H}</span>
                <span className="text-[#333] text-[10px]">
                    Editing: <span className="text-[#e8c06e] font-semibold">{selectedPart?.toUpperCase()}</span>
                </span>
            </div>
        </div>
    );
}

function ToolBtn({ icon, label, color, dark, onClick }) {
    return (
        <button
            onClick={onClick}
            className="px-[11px] py-[6px] border-none rounded-[7px] cursor-pointer text-[12px] font-semibold flex items-center gap-[5px] whitespace-nowrap transition-opacity duration-150 hover:opacity-80"
            style={{ background: color, color: dark ? "#111" : "#fff" }}
        >
            <span>{icon}</span>{label}
        </button>
    );
}