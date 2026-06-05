import { useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MAP = {
  Object001: "body",
  Cylinder002: "cap",
  Cylinder001: "ring",
};

function normalizeUV(geometry) {
  const uv = geometry.attributes.uv1 || geometry.attributes.uv;
  if (!uv) return;
  const arr = uv.array;
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < arr.length; i += 2) {
    minU = Math.min(minU, arr[i]); maxU = Math.max(maxU, arr[i]);
    minV = Math.min(minV, arr[i + 1]); maxV = Math.max(maxV, arr[i + 1]);
  }
  const rangeU = maxU - minU || 1, rangeV = maxV - minV || 1;
  const newArr = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i += 2) {
    newArr[i] = (arr[i] - minU) / rangeU;
    newArr[i + 1] = (arr[i + 1] - minV) / rangeV;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(newArr, 2));
  geometry.attributes.uv.needsUpdate = true;
}

export default function Model({ canvases, colors, setSelectedPart, registerUpdate, customizedParts, onLoaded }) {
  const { scene } = useGLTF("/models/mug.glb");

  const texturesRef = useRef({});
  const dirtyRef = useRef({ body: false, cap: false, ring: false });
  const meshRefs = useRef({});
  const originalMaterialsRef = useRef({});
  const overlayMeshesRef = useRef({});
  const colorsRef = useRef(colors);

  useEffect(() => {
    const textures = {};

    scene.traverse((child) => {
      if (!child.isMesh) return;
      const part = MAP[child.name];
      if (!part) return;
      meshRefs.current[part] = child;
      normalizeUV(child.geometry);
      originalMaterialsRef.current[part] = child.material.clone();
    });

    // مدل لود شد — loading overlay رو پنهان کن
    onLoaded?.();

    Object.entries(canvases).forEach(([part, canvas]) => {
      const tex = new THREE.CanvasTexture(canvas);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.premultiplyAlpha = false;
      textures[part] = tex;

      registerUpdate?.(part, (currentColors) => {
        dirtyRef.current[part] = true;
        const mesh = meshRefs.current[part];
        if (!mesh) return;

        if (customizedParts.current.has(part)) {
          // overlay mesh برای texture
          if (!overlayMeshesRef.current[part]) {
            const overlayGeo = mesh.geometry.clone();
            const overlayMat = new THREE.MeshBasicMaterial({
              map: tex,
              transparent: true,
              alphaTest: 0.01,
              depthWrite: false,
              polygonOffset: true,
              polygonOffsetFactor: -1,
            });
            const overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
            overlayMesh.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
            overlayMesh.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
            overlayMesh.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
            mesh.parent.add(overlayMesh);
            overlayMeshesRef.current[part] = overlayMesh;
          }

          // رنگ رو روی material اعمال کن (وقتی texture نیست رنگ از اینجا دیده میشه)
          const orig = originalMaterialsRef.current[part];
          if (orig) {
            const mat = orig.clone();
            const color = colorsRef.current?.[part];
            if (color) mat.color = new THREE.Color(color);
            mesh.material = mat;
          }

        } else {
          const overlay = overlayMeshesRef.current[part];
          if (overlay) {
            overlay.parent?.remove(overlay);
            overlay.geometry.dispose();
            overlay.material.dispose();
            delete overlayMeshesRef.current[part];
          }
          const original = originalMaterialsRef.current[part];
          if (original) mesh.material = original.clone();
        }
      });
    });

    texturesRef.current = textures;

    return () => {
      Object.values(overlayMeshesRef.current).forEach(ov => {
        ov.parent?.remove(ov);
        ov.geometry?.dispose();
        ov.material?.dispose();
      });
      overlayMeshesRef.current = {};
    };
  }, [scene]);

  // colorsRef رو همیشه آپدیت نگه دار
  useEffect(() => {
    colorsRef.current = colors;
  }, [colors]);

  // واکنش به تغییر رنگ — روی material اعمال کن
  useEffect(() => {
    if (!colors) return;
    Object.entries(colors).forEach(([part, color]) => {
      const mesh = meshRefs.current[part];
      if (!mesh) return;
      if (customizedParts.current.has(part)) {
        const orig = originalMaterialsRef.current[part];
        if (orig) {
          const mat = orig.clone();
          if (color) mat.color = new THREE.Color(color);
          mesh.material = mat;
          dirtyRef.current[part] = true;
        }
      }
    });
  }, [colors]);

  useFrame(() => {
    Object.entries(dirtyRef.current).forEach(([part, dirty]) => {
      if (!dirty) return;
      const texture = texturesRef.current[part];
      if (texture) texture.needsUpdate = true;
      dirtyRef.current[part] = false;
    });
  });

  return (
    <primitive
      object={scene}
      scale={1}
      onPointerDown={(e) => {
        e.stopPropagation();
        const part = MAP[e.object.name];
        // فقط body قابل کلیک است؛ cap و ring غیرفعال هستند
        if (part === "body") setSelectedPart(part);
        // if (part === "cap") setSelectedPart(part);   // غیرفعال
        // if (part === "ring") setSelectedPart(part);  // غیرفعال
      }}
    />
  );
}