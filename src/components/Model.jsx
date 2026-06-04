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

export default function Model({ canvases, setSelectedPart, registerUpdate, customizedParts }) {
  const { scene } = useGLTF("/models/mug.glb");

  const texturesRef = useRef({});
  const dirtyRef = useRef({ body: false, cap: false, ring: false });
  const meshRefs = useRef({});
  const originalMaterialsRef = useRef({});
  const overlayMeshesRef = useRef({});  // ← تعریف شده

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

    Object.entries(canvases).forEach(([part, canvas]) => {
      const tex = new THREE.CanvasTexture(canvas);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.premultiplyAlpha = false;
      textures[part] = tex;

      registerUpdate?.(part, () => {
        dirtyRef.current[part] = true;
        const mesh = meshRefs.current[part];
        if (!mesh) return;

        if (customizedParts.current.has(part)) {
          // اگه overlay mesh هنوز ساخته نشده بساز
          if (!overlayMeshesRef.current[part]) {
            const overlayGeo = mesh.geometry.clone();
            const overlayMat = new THREE.MeshBasicMaterial({
              map: tex,
              transparent: true,       // پس‌زمینه canvas کاملاً شفاف
              alphaTest: 0.01,         // pixel های تقریباً شفاف رندر نمیشن
              depthWrite: false,        // از z-fighting جلوگیری میکنه
              polygonOffset: true,
              polygonOffsetFactor: -1,  // overlay کمی جلوتر از mesh اصلی
            });
            const overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);

            // دقیقاً همون transform mesh اصلی
            overlayMesh.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
            overlayMesh.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
            overlayMesh.scale.copy(mesh.getWorldScale(new THREE.Vector3()));

            mesh.parent.add(overlayMesh);
            overlayMeshesRef.current[part] = overlayMesh;
          }

          // متریال اصلی GLB دست نمیخوره
          const orig = originalMaterialsRef.current[part];
          if (orig) mesh.material = orig.clone();

        } else {
          // None انتخاب شده — overlay رو حذف کن
          const overlay = overlayMeshesRef.current[part];
          if (overlay) {
            overlay.parent?.remove(overlay);
            overlay.geometry.dispose();
            overlay.material.dispose();
            delete overlayMeshesRef.current[part];
          }
          // متریال اصلی رو برگردون
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
        if (part) setSelectedPart(part);
      }}
    />
  );
}