"use client";

import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

type CanvasShellProps = {
  children: ReactNode;
  controls?: boolean;
};

export function CanvasShell({ children, controls = false }: CanvasShellProps) {
  return (
    <div className="h-[280px] w-full overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950">
      <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 2, 3]} intensity={1} />
        {children}
        {controls ? <OrbitControls enablePan={false} /> : null}
      </Canvas>
    </div>
  );
}