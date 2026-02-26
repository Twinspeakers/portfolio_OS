"use client";

import { useEffect, useRef } from "react";
import { getSceneAdapter } from "@/lib/3d/registry";
import { readMountOptions, type SceneController } from "@/lib/3d/adapter";

export function HeroSceneCanvas() {
  const hostRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let controller: SceneController | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const mount = async () => {
      try {
        const adapter = await getSceneAdapter("babylon");
        if (cancelled) return;

        controller = await adapter(host, readMountOptions(host), { sceneId: "dashboard-hero" });
        if (cancelled) {
          controller.dispose();
          controller = null;
          return;
        }

        resizeObserver = new ResizeObserver(() => {
          if (!controller || !host) return;
          controller.resize(readMountOptions(host));
        });
        resizeObserver.observe(host);
      } catch (error) {
        // Keep the banner usable even if Babylon fails to mount.
        console.error("Hero scene failed to mount", error);
      }
    };

    mount();

    const onWindowResize = () => {
      if (!controller || !host) return;
      controller.resize(readMountOptions(host));
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onWindowResize);
      resizeObserver?.disconnect();
      controller?.dispose();
      controller = null;
    };
  }, []);

  return <canvas ref={hostRef} className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing" aria-hidden="true" />;
}
