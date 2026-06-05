import { useState, Suspense, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Model from "./components/Model";
import Sidebar from "./components/Sidebar";
import CanvasEditor from "./components/CanvasEditor";

function createSharedCanvas() {
  const c = document.createElement("canvas");
  c.width = 4096;
  c.height = 2048;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  return c;
}

function ModelLoader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-[5] gap-4">
      <div className="w-12 h-12 rounded-full border-[3px] border-[rgba(232,192,110,0.15)] border-t-[#e8c06e] animate-spin" />
      <div className="text-[rgba(232,192,110,0.7)] text-[11px] font-semibold tracking-[3px] uppercase font-['DM_Sans']">
        Loading Model
      </div>
    </div>
  );
}

// Mobile tab enum
const MOBILE_TABS = ["preview", "editor", "sidebar"];

export default function App() {
  const [selectedPart, setSelectedPart] = useState("body");
  const [colors, setColors] = useState({ body: "", cap: "", ring: "" });
  const [bgColor, setBgColor] = useState("#f0ede8");
  const [bgImage, setBgImage] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [mobileTab, setMobileTab] = useState("preview"); // for mobile layout

  const [activeTextures, setActiveTextures] = useState({
    body: "none",
    cap: "none",
    ring: "none",
  });

  const [elementsByPart, setElementsByPart] = useState({
    body: [],
    cap: [],
    ring: [],
  });

  const [textureVersion, setTextureVersion] = useState({ body: 0, cap: 0, ring: 0 });

  const canvasesRef = useRef({
    body: createSharedCanvas(),
    cap: createSharedCanvas(),
    ring: createSharedCanvas(),
  });

  const originalCanvasesRef = useRef({
    body: createSharedCanvas(),
    cap: createSharedCanvas(),
    ring: createSharedCanvas(),
  });

  const textureUpdateRef = useRef({});
  const customizedPartsRef = useRef(new Set());
  const pendingTextureRef = useRef({});
  const elementsByPartRef = useRef({ body: [], cap: [], ring: [] });

  const handleTextureChange = useCallback((part, url, textureId) => {
    setActiveTextures(prev => ({ ...prev, [part]: textureId }));

    if (!url) {
      const originalCanvas = originalCanvasesRef.current[part];
      originalCanvas.getContext("2d").clearRect(0, 0, originalCanvas.width, originalCanvas.height);

      const canvas = canvasesRef.current[part];
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

      setColors(prev => {
        const hasColor = !!prev[part];
        const hasElements = elementsByPartRef.current[part]?.length > 0;
        if (hasColor || hasElements) {
          customizedPartsRef.current.add(part);
        } else {
          customizedPartsRef.current.delete(part);
        }
        return prev;
      });

      if (textureUpdateRef.current[part]) textureUpdateRef.current[part]();
      setTextureVersion(prev => ({ ...prev, [part]: prev[part] + 1 }));
      return;
    }

    customizedPartsRef.current.add(part);

    const originalCanvas = originalCanvasesRef.current[part];
    const originalCtx = originalCanvas.getContext("2d");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
      originalCtx.drawImage(img, 0, 0, originalCanvas.width, originalCanvas.height);

      const canvas = canvasesRef.current[part];
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalCanvas, 0, 0, canvas.width, canvas.height);

      if (textureUpdateRef.current[part]) textureUpdateRef.current[part]();
      else pendingTextureRef.current[part] = true;

      setTextureVersion(prev => ({ ...prev, [part]: prev[part] + 1 }));
    };
    img.src = url;
  }, []);

  const handleColorChange = useCallback((part, color) => {
    customizedPartsRef.current.add(part);
    setColors((prev) => ({ ...prev, [part]: color }));
    if (textureUpdateRef.current[part]) {
      textureUpdateRef.current[part]();
    }
  }, []);

  const handleColorReset = useCallback((part) => {
    setColors((prev) => ({ ...prev, [part]: "" }));
    const hasTexture = activeTextures[part] && activeTextures[part] !== "none";
    const hasElements = elementsByPartRef.current[part]?.length > 0;
    if (!hasTexture && !hasElements) {
      customizedPartsRef.current.delete(part);
    }
    if (textureUpdateRef.current[part]) {
      textureUpdateRef.current[part]();
    }
    setTextureVersion(prev => ({ ...prev, [part]: prev[part] + 1 }));
  }, [activeTextures]);

  const handleBgUpload = useCallback((dataUrl, fallbackColor) => {
    if (dataUrl) setBgImage(dataUrl);
    else { setBgImage(null); setBgColor(fallbackColor); }
  }, []);

  const handleCanvasUpdate = useCallback((part) => {
    if (textureUpdateRef.current[part] && customizedPartsRef.current.has(part)) {
      textureUpdateRef.current[part]();
    }
  }, []);

  const handleElementsChange = useCallback((part, els) => {
    elementsByPartRef.current = { ...elementsByPartRef.current, [part]: els };
    setElementsByPart(prev => ({ ...prev, [part]: els }));
    if (els.length > 0) {
      customizedPartsRef.current.add(part);
      if (textureUpdateRef.current[part]) textureUpdateRef.current[part]();
    }
  }, []);

  const bgStyle = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: bgColor };

  return (
    <div className="flex h-[100dvh] overflow-hidden font-['DM_Sans']">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />

      {/* ── DESKTOP layout (md+) ── */}
      <div className="hidden md:flex w-full h-full overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          selectedPart={selectedPart}
          setSelectedPart={setSelectedPart}
          colors={colors}
          onColorChange={handleColorChange}
          onBgImageUpload={handleBgUpload}
          bgColor={bgColor}
          customizedParts={customizedPartsRef}
          onTextureChange={handleTextureChange}
          activeTextures={activeTextures}
          onColorReset={handleColorReset}
        />

        {/* Canvas Editor */}
        <div className="w-[680px] min-w-[680px] bg-[#0d0d0d] border-r border-[#1f1f1f] flex flex-col">
          <CanvasEditor
            sharedCanvas={canvasesRef.current[selectedPart]}
            baseColor={colors[selectedPart]}
            selectedPart={selectedPart}
            elements={elementsByPart[selectedPart]}
            onElementsChange={(els) => handleElementsChange(selectedPart, els)}
            onUpdate={() => handleCanvasUpdate(selectedPart)}
            originalCanvas={originalCanvasesRef.current[selectedPart]}
            textureVersion={textureVersion[selectedPart]}
          />
        </div>

        {/* 3D Preview */}
        <div className="flex-1 relative transition-colors duration-400" style={bgStyle}>
          <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-[12px] text-white/70 px-[18px] py-[6px] rounded-[20px] text-[11px] font-semibold tracking-[2px] uppercase z-10 border border-white/10">
            Live Preview
          </div>
          {!modelLoaded && <ModelLoader />}
          <Canvas camera={{ position: [0.3, 0.3, 2.0], fov: 18 }} style={{ width: "100%", height: "100%" }}>
            <ambientLight intensity={5} />
            <directionalLight position={[4, 6, 4]} intensity={6} />
            <directionalLight position={[-4, 4, -4]} intensity={5} />
            <directionalLight position={[0, -4, 2]} intensity={10} />
            <OrbitControls enablePan={false} minDistance={0.8} maxDistance={4} />
            <Suspense fallback={null}>
              <Model
                canvases={canvasesRef.current}
                colors={colors}
                setSelectedPart={setSelectedPart}
                customizedParts={customizedPartsRef}
                registerUpdate={(part, fn) => {
                  textureUpdateRef.current[part] = fn;
                  if (pendingTextureRef.current[part]) {
                    fn();
                    delete pendingTextureRef.current[part];
                  }
                }}
                onLoaded={() => setModelLoaded(true)}
              />
            </Suspense>
          </Canvas>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-black/30 text-[11px] tracking-[1px] pointer-events-none whitespace-nowrap">
            Drag to rotate · Scroll to zoom
          </div>
        </div>
      </div>

      {/* ── MOBILE layout (below md) ── */}
      <div className="flex md:hidden flex-col w-full h-full overflow-hidden">

        {/* Mobile tab content */}
        <div className="flex-1 overflow-hidden relative">

          {/* Preview tab */}
          <div className={`absolute inset-0 transition-opacity duration-200 ${mobileTab === "preview" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
            style={bgStyle}>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-[12px] text-white/70 px-4 py-1 rounded-full text-[10px] font-semibold tracking-[2px] uppercase z-10 border border-white/10">
              Live Preview
            </div>
            {!modelLoaded && <ModelLoader />}
            <Canvas camera={{ position: [0.3, 0.3, 2.0], fov: 18 }} style={{ width: "100%", height: "100%" }}>
              <ambientLight intensity={5} />
              <directionalLight position={[4, 6, 4]} intensity={6} />
              <directionalLight position={[-4, 4, -4]} intensity={5} />
              <directionalLight position={[0, -4, 2]} intensity={10} />
              <OrbitControls enablePan={false} minDistance={0.8} maxDistance={4} />
              <Suspense fallback={null}>
                <Model
                  canvases={canvasesRef.current}
                  colors={colors}
                  setSelectedPart={setSelectedPart}
                  customizedParts={customizedPartsRef}
                  registerUpdate={(part, fn) => {
                    textureUpdateRef.current[part] = fn;
                    if (pendingTextureRef.current[part]) {
                      fn();
                      delete pendingTextureRef.current[part];
                    }
                  }}
                  onLoaded={() => setModelLoaded(true)}
                />
              </Suspense>
            </Canvas>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-black/30 text-[10px] tracking-[1px] pointer-events-none whitespace-nowrap">
              Drag to rotate · Pinch to zoom
            </div>
          </div>

          {/* Editor tab */}
          <div className={`absolute inset-0 bg-[#0d0d0d] transition-opacity duration-200 ${mobileTab === "editor" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
            <CanvasEditor
              sharedCanvas={canvasesRef.current[selectedPart]}
              baseColor={colors[selectedPart]}
              selectedPart={selectedPart}
              elements={elementsByPart[selectedPart]}
              onElementsChange={(els) => handleElementsChange(selectedPart, els)}
              onUpdate={() => handleCanvasUpdate(selectedPart)}
              originalCanvas={originalCanvasesRef.current[selectedPart]}
              textureVersion={textureVersion[selectedPart]}
            />
          </div>

          {/* Sidebar tab */}
          <div className={`absolute inset-0 overflow-y-auto transition-opacity duration-200 ${mobileTab === "sidebar" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
            <Sidebar
              selectedPart={selectedPart}
              setSelectedPart={setSelectedPart}
              colors={colors}
              onColorChange={handleColorChange}
              onBgImageUpload={handleBgUpload}
              bgColor={bgColor}
              customizedParts={customizedPartsRef}
              onTextureChange={handleTextureChange}
              activeTextures={activeTextures}
              onColorReset={handleColorReset}
              isMobile
            />
          </div>
        </div>

        {/* Mobile bottom tab bar */}
        <div className="flex-shrink-0 bg-[#0a0a0a] border-t border-[#1a1a1a] flex items-stretch">
          {[
            { id: "preview", icon: "👁", label: "Preview" },
            { id: "editor", icon: "✏️", label: "Editor" },
            { id: "sidebar", icon: "🎨", label: "Style" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-semibold tracking-widest uppercase transition-all duration-150 border-t-2 ${
                mobileTab === tab.id
                  ? "border-[#e8c06e] text-[#e8c06e]"
                  : "border-transparent text-[#444]"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}