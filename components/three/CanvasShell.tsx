"use client";

import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

type CanvasShellProps = {
  children: ReactNode;
  controls?: boolean;
  heightClass?: string;
  framed?: boolean;
  className?: string;
};

export function CanvasShell({
  children,
  controls = false,
  heightClass = "h-[280px]",
  framed = true,
  className
}: CanvasShellProps) {
  return (
    <div
      className={[
        heightClass,
        "w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950",
        framed ? "rounded-2xl border border-border/70" : "rounded-none border-0",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 2, 3]} intensity={1} />
        {children}
        {controls ? <OrbitControls enablePan={false} /> : null}
      </Canvas>
    </div>
  );
}