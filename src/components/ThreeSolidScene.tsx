"use client";

import { useEffect, useRef } from "react";

export default function ThreeSolidScene() {
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
      const material = new THREE.MeshStandardMaterial({ color: 0xffb35b, roughness: 0.5, metalness: 0.05 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x27362d, linewidth: 2 }),
      );
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
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div className="solution-3d-stage" ref={hostRef} aria-label="可拖拽旋转的三维模型" />;
}
