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

// Loading spinner که موقع لود مدل نشون داده میشه
function ModelLoader() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "inherit", zIndex: 5,
      gap: 16,
    }}>
      <div style={{
        width: 48, height: 48,
        border: "3px solid rgba(232,192,110,0.15)",
        borderTop: "3px solid #e8c06e",
        borderRadius: "50%",
        animation: "spin 0.9s linear infinite",
      }} />
      <div style={{
        color: "rgba(232,192,110,0.7)",
        fontSize: 11, fontWeight: 600,
        letterSpacing: 3, textTransform: "uppercase",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Loading Model
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  const [selectedPart, setSelectedPart] = useState("body");
  const [colors, setColors] = useState({ body: "", cap: "", ring: "" });
  const [bgColor, setBgColor] = useState("#f0ede8");
  const [bgImage, setBgImage] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);

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
      // رنگ رو پاک نکن — فقط texture رو بردار
      const originalCanvas = originalCanvasesRef.current[part];
      originalCanvas.getContext("2d").clearRect(0, 0, originalCanvas.width, originalCanvas.height);

      const canvas = canvasesRef.current[part];
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

      // اگه رنگ یا element داره، customized بمونه
      setColors(prev => {
        const hasColor = !!prev[part];
        const hasElements = elementsByPartRef.current[part]?.length > 0;
        if (hasColor || hasElements) {
          customizedPartsRef.current.add(part);
        } else {
          customizedPartsRef.current.delete(part);
        }
        return prev; // رنگ دست نخوره
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
    // اگه texture یا element نداره customized از set خارج بشه
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

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet" />

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

      <div style={{ width: 680, minWidth: 680, background: "#0d0d0d", borderRight: "1px solid #1f1f1f", display: "flex", flexDirection: "column" }}>
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

      <div style={{
        flex: 1,
        position: "relative",
        background: bgImage ? `url(${bgImage}) center/cover` : bgColor,
        transition: "background-color 0.4s ease",
      }}>
        <div style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)",
          color: "rgba(255,255,255,0.7)", padding: "6px 18px", borderRadius: 20,
          fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", zIndex: 10,
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          Live Preview
        </div>

        {/* Loading overlay تا مدل کاملاً لود بشه */}
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

        <div style={{
          position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
          color: "rgba(0,0,0,0.3)", fontSize: 11, letterSpacing: 1, pointerEvents: "none", whiteSpace: "nowrap",
        }}>
          Drag to rotate · Scroll to zoom
        </div>
      </div>
    </div>
  );
}