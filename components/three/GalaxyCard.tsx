"use client";

import dynamic from "next/dynamic";

const CanvasShell = dynamic(() => import("@/components/three/CanvasShell").then((m) => m.CanvasShell), {
  ssr: false,
  loading: () => <div className="h-[280px] animate-pulse rounded-2xl border border-border bg-muted" />
});

const SceneProjectGalaxy = dynamic(() => import("@/components/three/SceneProjectGalaxy").then((m) => m.SceneProjectGalaxy), {
  ssr: false
});

export function GalaxyCard() {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Project Galaxy</h3>
      <p className="text-sm text-muted-foreground">Interactive nodes representing projects. Hover to highlight nodes.</p>
      <CanvasShell controls>
        <SceneProjectGalaxy />
      </CanvasShell>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Controls: drag to orbit, wheel to zoom.</p>
    </div>
  );
}