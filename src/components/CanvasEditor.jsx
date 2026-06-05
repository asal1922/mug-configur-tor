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
    // paintSubTool: "brush" یا "eraser"
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

        // sharedCanvas (texture مدل):
        // اگه texture داره: texture + رنگ (multiply) روش
        // اگه فقط رنگ داره: sharedCanvas خالی بمونه، رنگ از Model.jsx روی material اعمال میشه
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
        // اگه فقط رنگ داره (بدون texture): sharedCanvas خالی بمونه

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        els.forEach(el => {
            if (el.type === "image") {
                ctx.drawImage(el.image, el.x, el.y, el.w, el.h);
            }
            if (el.type === "text") {
                ctx.save();
                ctx.font = `bold ${el.size}px ${el.font || "Arial"}`;
                ctx.fillStyle = el.color;
                ctx.textBaseline = "top";
                ctx.fillText(el.text, el.x, el.y);
                ctx.restore();
            }
            if (el.type === "stroke") {
                drawStroke(ctx, el);
            }
            if (el.type === "eraser") {
                drawEraser(ctx, el, sharedCanvas);
            }
        });

        if (displayRef.current) {
            const dCtx = displayRef.current.getContext("2d");
            dCtx.clearRect(0, 0, W, H);

            if (hasOriginalContent) {
                // texture داریم: همون رو به عنوان پس‌زمینه بکش
                dCtx.drawImage(originalCanvas, 0, 0, W, H);
                if (baseColor) {
                    dCtx.save();
                    dCtx.globalCompositeOperation = "multiply";
                    dCtx.fillStyle = baseColor;
                    dCtx.fillRect(0, 0, W, H);
                    dCtx.restore();
                }
            } else if (baseColor) {
                // فقط رنگ، بدون texture
                dCtx.save();
                dCtx.fillStyle = baseColor;
                dCtx.fillRect(0, 0, W, H);
                dCtx.restore();
            } else {
                // هیچی نیست: checkerboard
                const tile = 64;
                for (let row = 0; row < H; row += tile) {
                    for (let col = 0; col < W; col += tile) {
                        dCtx.fillStyle = ((col / tile + row / tile) % 2 === 0) ? "#1c1c1c" : "#161616";
                        dCtx.fillRect(col, row, tile, tile);
                    }
                }
            }

            // elements (text, image, stroke, eraser) رو روی پس‌زمینه بکش
            els.forEach(el => {
                if (el.type === "image") {
                    dCtx.drawImage(el.image, el.x, el.y, el.w, el.h);
                }
                if (el.type === "text") {
                    dCtx.save();
                    dCtx.font = `bold ${el.size}px ${el.font || "Arial"}`;
                    dCtx.fillStyle = el.color;
                    dCtx.textBaseline = "top";
                    dCtx.fillText(el.text, el.x, el.y);
                    dCtx.restore();
                }
                if (el.type === "stroke") {
                    drawStroke(dCtx, el);
                }
                if (el.type === "eraser") {
                    drawEraser(dCtx, el, displayRef.current);
                }
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
        for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }

    // پاک‌کن: مسیر eraser رو mask میکنه و texture+رنگ زیرین رو restore میکنه
    function drawEraser(ctx, el, targetCanvas) {
        if (!el.points || el.points.length < 2) return;

        // یه offscreen canvas بساز که فقط مسیر eraser رو داره
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

        // یه offscreen canvas از لایه پایه (texture+رنگ) بساز
        const base = document.createElement("canvas");
        base.width = W; base.height = H;
        const bCtx = base.getContext("2d");
        if (originalCanvas) {
            const hasContent = (() => {
                try { return originalCanvas.getContext("2d").getImageData(0,0,4,4).data.some(v=>v!==0); }
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

        // فقط جایی که mask داره، لایه پایه رو روی targetCanvas بکش
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
        return {
            x: ((e.clientX - rect.left) / rect.width) * W,
            y: ((e.clientY - rect.top) / rect.height) * H,
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
            onElementsChange(elements.map(el =>
                el.id === updatedStroke.id ? updatedStroke : el
            ));
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
        // آخرین stroke یا eraser رو پیدا و حذف کن
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
        if (tool === "paint") {
            return paintSubTool === "eraser" ? "cell" : "crosshair";
        }
        if (draggingRef.current) return "grabbing";
        return "default";
    };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{
                padding: "10px 14px", background: "#0a0a0a",
                borderBottom: "1px solid #1f1f1f", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
            }}>
                <span style={{ color: "#444", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginRight: 4 }}>
                    Editor
                </span>

                {/* Tool selector: Select / Paint */}
                <div style={{ display: "flex", gap: 3, background: "#111", borderRadius: 8, padding: 3, border: "1px solid #1e1e1e" }}>
                    {[
                        { id: "select", icon: "↖", label: "Select" },
                        { id: "paint", icon: "✏", label: "Paint" },
                    ].map(t => (
                        <button key={t.id} onClick={() => { setTool(t.id); selectedIdRef.current = null; }}
                            title={t.label}
                            style={{
                                padding: "5px 10px", borderRadius: 6, border: "none",
                                background: tool === t.id ? "#e8c06e" : "transparent",
                                color: tool === t.id ? "#0a0a0a" : "#555",
                                cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.12s",
                            }}>
                            {t.icon}
                        </button>
                    ))}
                </div>

                {/* Paint sub-tools: Brush / Eraser */}
                {tool === "paint" && (
                    <div style={{ display: "flex", gap: 3, background: "#111", borderRadius: 8, padding: 3, border: "1px solid #1e1e1e" }}>
                        <button
                            onClick={() => setPaintSubTool("brush")}
                            title="Brush"
                            style={{
                                padding: "5px 10px", borderRadius: 6, border: "none",
                                background: paintSubTool === "brush" ? "#e8c06e" : "transparent",
                                color: paintSubTool === "brush" ? "#0a0a0a" : "#555",
                                cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.12s",
                            }}>
                            ✏ Brush
                        </button>
                        <button
                            onClick={() => setPaintSubTool("eraser")}
                            title="Eraser"
                            style={{
                                padding: "5px 10px", borderRadius: 6, border: "none",
                                background: paintSubTool === "eraser" ? "#e8c06e" : "transparent",
                                color: paintSubTool === "eraser" ? "#0a0a0a" : "#555",
                                cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.12s",
                            }}>
                            ◻ Eraser
                        </button>
                    </div>
                )}

                {/* Brush controls */}
                {tool === "paint" && paintSubTool === "brush" && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", background: "#111", borderRadius: 8, padding: "5px 10px", border: "1px solid #1e1e1e" }}>
                        <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)}
                            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #2a2a2a", cursor: "pointer", padding: 1, background: "none" }} />
                        <span style={{ color: "#444", fontSize: 10 }}>SIZE</span>
                        <input type="range" min={3} max={120} value={brushSize}
                            onChange={e => setBrushSize(Number(e.target.value))}
                            style={{ width: 80, accentColor: "#e8c06e" }} />
                        <span style={{ color: "#888", fontSize: 11, minWidth: 24 }}>{brushSize}</span>
                    </div>
                )}

                {/* Eraser controls */}
                {tool === "paint" && paintSubTool === "eraser" && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", background: "#111", borderRadius: 8, padding: "5px 10px", border: "1px solid #1e1e1e" }}>
                        <span style={{ fontSize: 16 }}>◻</span>
                        <span style={{ color: "#444", fontSize: 10 }}>SIZE</span>
                        <input type="range" min={5} max={200} value={eraserSize}
                            onChange={e => setEraserSize(Number(e.target.value))}
                            style={{ width: 80, accentColor: "#e8c06e" }} />
                        <span style={{ color: "#888", fontSize: 11, minWidth: 24 }}>{eraserSize}</span>
                    </div>
                )}

                {strokeCount > 0 && (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button onClick={undoLastStroke}
                            style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #1e1e1e", background: "#111", color: "#888", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                            ↩ Undo
                        </button>
                        <button onClick={clearAllStrokes}
                            style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #2a1515", background: "#1a0e0e", color: "#c0392b", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                            ✕ Clear Paint
                        </button>
                        <span style={{ color: "#333", fontSize: 10 }}>{strokeCount} stroke{strokeCount !== 1 ? "s" : ""}</span>
                    </div>
                )}

                {tool === "select" && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}>
                        <ToolBtn icon="🖼" label="Image" color="#e8c06e" dark onClick={() => fileInputRef.current.click()} />
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={addImage} />

                        <div style={{ display: "flex", gap: 5, alignItems: "center", flex: 1, minWidth: 200 }}>
                            <input ref={textInputRef} onKeyDown={e => e.key === "Enter" && addText()}
                                placeholder="Type text..."
                                style={{ flex: 1, background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", padding: "6px 10px", fontSize: 12, outline: "none" }} />
                            <select defaultValue="Arial" onChange={e => { fontFamilyRef.current = e.target.value; }}
                                style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 7, color: "#fff", padding: "6px 7px", fontSize: 11, outline: "none", cursor: "pointer" }}>
                                {["Arial", "Georgia", "Impact", "Verdana", "Courier New", "Times New Roman"].map(f =>
                                    <option key={f} value={f}>{f}</option>
                                )}
                            </select>
                            <input type="color" defaultValue="#ffffff" onChange={e => { textColorRef.current = e.target.value; }}
                                style={{ width: 32, height: 32, borderRadius: 7, border: "1px solid #333", cursor: "pointer", padding: 2, background: "none" }} />
                            <input type="range" min={40} max={300} defaultValue={120}
                                onChange={e => { fontSizeRef.current = Number(e.target.value); }}
                                style={{ width: 60, accentColor: "#e8c06e" }} />
                            <ToolBtn icon="T+" label="Add" color="#2a2a2a" onClick={addText} />
                        </div>

                        {selected && (
                            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                                {selected.type === "text" && (
                                    <input type="color" value={selected.color}
                                        onChange={e => updateSelectedColor(e.target.value)}
                                        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #333", cursor: "pointer", padding: 2, background: "none" }} />
                                )}
                                <ToolBtn icon="🗑" label="Delete" color="#c0392b" onClick={deleteSelected} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" }}>
                <div style={{ position: "relative", width: "100%", maxWidth: "100%", aspectRatio: `${displayAspect}` }}>
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", borderLeft: "1px dashed rgba(255,255,255,0.08)", zIndex: 1, pointerEvents: "none" }} />
                    <div style={{ position: "absolute", top: 8, left: "25%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.2)", fontSize: 11, letterSpacing: 1, zIndex: 1, pointerEvents: "none" }}>FRONT</div>
                    <div style={{ position: "absolute", top: 8, left: "75%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.2)", fontSize: 11, letterSpacing: 1, zIndex: 1, pointerEvents: "none" }}>BACK</div>

                    <div style={{
                        position: "absolute", top: 8, right: 12, zIndex: 2,
                        background: tool === "paint"
                            ? (paintSubTool === "eraser" ? "rgba(80,80,80,0.85)" : brushColor)
                            : "rgba(0,0,0,0.5)",
                        color: tool === "paint" ? (paintSubTool === "eraser" ? "#fff" : "#000") : "#888",
                        padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                        letterSpacing: 1, textTransform: "uppercase",
                        border: "1px solid rgba(255,255,255,0.1)", pointerEvents: "none",
                    }}>
                        {tool === "paint"
                            ? (paintSubTool === "eraser" ? `◻ Eraser · ${eraserSize}px` : `✏ Paint · ${brushSize}px`)
                            : "↖ Select"
                        }
                    </div>

                    <canvas ref={displayRef} width={W} height={H}
                        style={{ width: "100%", height: "100%", display: "block", borderRadius: 10, border: "1px solid #1f1f1f", cursor: getCursor() }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />

                    {tool === "select" && selected && (() => {
                        const elH = selected.type === "text" ? selected.size * 1.2 : selected.h;
                        const pct = (v, total) => `${(v / total) * 100}%`;
                        return (
                            <div style={{ position: "absolute", pointerEvents: "none", left: pct(selected.x, W), top: pct(selected.y, H), width: pct(selected.w, W), height: pct(elH, H) }}>
                                <div style={{ position: "absolute", inset: 0, border: "1.5px solid #e8c06e", borderRadius: 2 }} />
                                <div style={{ position: "absolute", right: -6, bottom: -6, width: 12, height: 12, background: "#e8c06e", borderRadius: 3, cursor: "se-resize", pointerEvents: "all" }}
                                    onMouseDown={e => {
                                        e.stopPropagation();
                                        const { x, y } = getPos(e);
                                        resizingRef.current = { id: selected.id, startX: x, startY: y, startW: selected.w, startH: selected.h, startSize: selected.size };
                                    }} />
                            </div>
                        );
                    })()}
                </div>
            </div>

            <div style={{ padding: "7px 14px", borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#333", fontSize: 10 }}>{elements.length} element{elements.length !== 1 ? "s" : ""}</span>
                {selected && tool === "select" && <span style={{ color: "#555", fontSize: 10 }}>{selected.type} · {Math.round(selected.x)}, {Math.round(selected.y)}</span>}
                <span style={{ color: "#333", fontSize: 10 }}>{W}×{H}</span>
                <span style={{ color: "#333", fontSize: 10 }}>
                    Editing: <span style={{ color: "#e8c06e", fontWeight: 600 }}>{selectedPart?.toUpperCase()}</span>
                </span>
            </div>
        </div>
    );
}

function ToolBtn({ icon, label, color, dark, onClick }) {
    return (
        <button onClick={onClick}
            style={{ padding: "6px 11px", border: "none", borderRadius: 7, background: color, color: dark ? "#111" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", transition: "opacity 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            <span>{icon}</span>{label}
        </button>
    );
}