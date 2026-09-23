"use client";

import { useEffect, useRef } from "react";

export default function ThreeSolidScene({faceLabels}:{faceLabels?:Record<string,string>}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let frame = 0;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (disposed || !hostRef.current) return;

      const width = host.clientWidth || 520;
      const height = host.clientHeight || 320;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
      camera.position.set(3.6, 2.8, 4.6);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      host.appendChild(renderer.domElement);
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const textures: Array<InstanceType<typeof THREE.CanvasTexture>> = [];
      const makeMaterial = (bg: string, label?: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1024; canvas.height = 1024;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 1024);
        ctx.strokeStyle = "#27362d"; ctx.lineWidth = 28; ctx.strokeRect(14, 14, 996, 996);
        if (label) {
          ctx.fillStyle = "#27362d";
          ctx.font = "900 420px 'Noto Sans Symbols 2', 'DejaVu Sans', sans-serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(label, 512, 540);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        textures.push(texture);
        return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.52, metalness: 0.03 });
      };
      const materials = faceLabels ? [
        makeMaterial("#ffb86f", faceLabels["1,0,0"]),
        makeMaterial("#ffd7a0", faceLabels["-1,0,0"]),
        makeMaterial("#a8d8b7", faceLabels["0,1,0"]),
        makeMaterial("#c9e7d1", faceLabels["0,-1,0"]),
        makeMaterial("#ffca86", faceLabels["0,0,1"]),
        makeMaterial("#f5e4c8", faceLabels["0,0,-1"]),
      ] : new THREE.MeshStandardMaterial({ color: 0xffb35b, roughness: 0.5, metalness: 0.05 });
      const cube = new THREE.Mesh(geometry, materials);
      scene.add(cube);

      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x27362d, linewidth: 2 });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      cube.add(edges);

      scene.add(new THREE.HemisphereLight(0xffffff, 0xbfd8c7, 2.2));
      const key = new THREE.DirectionalLight(0xffffff, 2.8);
      key.position.set(4, 7, 5);
      scene.add(key);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 3.2;
      controls.maxDistance = 8;

      const render = () => {
        if (disposed) return;
        cube.rotation.y += 0.0035;
        controls.update();
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      render();
      const resize = () => {
        if (!hostRef.current) return;
        const w = host.clientWidth || 520;
        const h = host.clientHeight || 320;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", resize);

      cleanup = () => {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(frame);
        controls.dispose();
        geometry.dispose();
        edgeGeometry.dispose();
        edgeMaterial.dispose();
        if (Array.isArray(materials)) materials.forEach((m) => m.dispose());
        else materials.dispose();
        textures.forEach((t) => t.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [faceLabels]);

  return <div className="solution-3d-stage" ref={hostRef} aria-label="可拖拽旋转的三维模型" />;
}
