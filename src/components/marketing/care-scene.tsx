"use client";

import { useEffect, useRef, useState } from "react";
import { CareFlower } from "./product-media";

export function CareScene({ animated }: { animated: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const motion = useRef(animated);
  const updateLoop = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    motion.current = animated;
    updateLoop.current();
  }, [animated]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    let dispose = () => {};

    async function initialize() {
      const THREE = await import("three");
      if (cancelled || !container) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        // Probe before construction so devices without WebGL keep the CSS art.
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("webgl2", {
          alpha: true,
          antialias: true,
        });
        if (!context) return;
        renderer = new THREE.WebGLRenderer({
          canvas,
          context,
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        return;
      }
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, window.innerWidth < 760 ? 1.25 : 1.7),
      );
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.domElement.setAttribute("aria-hidden", "true");
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
      camera.position.z = 15;
      scene.add(new THREE.HemisphereLight(0xffffff, 0x32554b, 1.8));
      const key = new THREE.DirectionalLight(0xfff8e9, 3);
      key.position.set(-4, 6, 8);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xb7ebe0, 1.6);
      rim.position.set(5, -1, 4);
      scene.add(rim);

      const petalGeometry = new THREE.SphereGeometry(1, 32, 24);
      const teal = new THREE.MeshStandardMaterial({
        color: 0x357c6d,
        roughness: 0.55,
        metalness: 0.08,
      });
      const peach = new THREE.MeshStandardMaterial({
        color: 0xe9ac88,
        roughness: 0.58,
      });
      const porcelain = new THREE.MeshStandardMaterial({
        color: 0xf4f1e8,
        roughness: 0.38,
      });
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x72ada1,
        roughness: 0.32,
        metalness: 0.32,
      });
      const flower = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const petal = new THREE.Mesh(petalGeometry, teal);
        petal.scale.set(0.64, 1.2, 0.36);
        petal.position.set(-Math.sin(angle) * 0.98, Math.cos(angle) * 0.98, 0);
        petal.rotation.z = angle;
        flower.add(petal);
      }
      const middle = new THREE.Mesh(petalGeometry, teal);
      middle.scale.set(0.55, 0.55, 0.43);
      flower.add(middle);
      flower.position.set(-2, 0.65, 0);
      flower.scale.setScalar(1.16);
      flower.rotation.set(0.22, -0.32, -0.2);
      scene.add(flower);

      const ringGeometry = new THREE.TorusGeometry(3.3, 0.026, 10, 120);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.set(0.1, 0.2, -0.4);
      ring.rotation.set(0.25, 0.65, -0.65);
      ring.scale.set(0.78, 1.27, 1);
      scene.add(ring);
      const orb = new THREE.Mesh(petalGeometry, peach);
      orb.scale.set(1.02, 1.15, 0.9);
      orb.position.set(2.9, -1.9, -1.3);
      scene.add(orb);
      const pebble = new THREE.Mesh(petalGeometry, porcelain);
      pebble.scale.set(0.85, 0.58, 0.6);
      pebble.position.set(-2.7, -2.7, 1);
      pebble.rotation.z = -0.15;
      scene.add(pebble);

      let intersecting = true;
      let elapsed = 0;
      let last = 0;
      const pointer = { x: 0, y: 0 };
      const render = (time = 0) => {
        if (last) elapsed += Math.min((time - last) / 1000, 0.05);
        last = time;
        flower.rotation.y =
          -0.32 + Math.sin(elapsed * 0.35) * 0.15 + pointer.x * 0.12;
        flower.rotation.x = 0.22 + pointer.y * 0.08;
        flower.rotation.z = -0.2 + Math.sin(elapsed * 0.2) * 0.1;
        flower.position.y = 0.65 + Math.sin(elapsed * 0.7) * 0.12;
        ring.rotation.z = -0.65 + Math.sin(elapsed * 0.26) * 0.13;
        orb.position.y = -1.9 + Math.sin(elapsed * 0.55 + 1) * 0.12;
        renderer.render(scene, camera);
      };
      const syncLoop = () => {
        last = 0;
        renderer.setAnimationLoop(
          motion.current && intersecting && !document.hidden ? render : null,
        );
        render();
      };
      updateLoop.current = syncLoop;
      const resize = () => {
        const width = container!.clientWidth,
          height = container!.clientHeight;
        if (!width || !height) return;
        const aspect = width / height;
        camera.left = -4.8 * aspect;
        camera.right = 4.8 * aspect;
        camera.top = 4.8;
        camera.bottom = -4.8;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        render();
      };
      const sizeObserver = new ResizeObserver(resize);
      sizeObserver.observe(container);
      const visibility = new IntersectionObserver(([entry]) => {
        intersecting = entry.isIntersecting;
        syncLoop();
      });
      visibility.observe(container);
      const trackPointer = (event: PointerEvent) => {
        if (!motion.current || event.pointerType === "touch") return;
        const rect = container!.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      };
      const lostContext = (event: Event) => {
        event.preventDefault();
        renderer.setAnimationLoop(null);
        setReady(false);
      };
      document.addEventListener("visibilitychange", syncLoop);
      container.addEventListener("pointermove", trackPointer);
      renderer.domElement.addEventListener("webglcontextlost", lostContext);
      resize();
      syncLoop();
      setReady(true);
      dispose = () => {
        renderer.setAnimationLoop(null);
        updateLoop.current = () => {};
        sizeObserver.disconnect();
        visibility.disconnect();
        document.removeEventListener("visibilitychange", syncLoop);
        container.removeEventListener("pointermove", trackPointer);
        renderer.domElement.removeEventListener(
          "webglcontextlost",
          lostContext,
        );
        petalGeometry.dispose();
        ringGeometry.dispose();
        for (const material of [teal, peach, porcelain, ringMaterial])
          material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }
    initialize().catch(() => {
      /* Static care artwork remains usable. */
    });
    return () => {
      cancelled = true;
      dispose();
    };
  }, []);

  return (
    <div
      className={`care-scene ${ready ? "scene-ready" : ""}`}
      aria-hidden="true"
    >
      <div className="scene-fallback">
        <CareFlower />
        <span className="fallback-orbit" />
        <i className="fallback-orb" />
      </div>
      <div className="webgl-host" ref={host} />
    </div>
  );
}
