"use client";

import dynamic from "next/dynamic";

const CanvasShell = dynamic(() => import("@/components/three/CanvasShell").then((m) => m.CanvasShell), {
  ssr: false,
  loading: () => <div className="h-[280px] animate-pulse rounded-2xl border border-border bg-muted" />
});

const SceneHeroOrb = dynamic(() => import("@/components/three/SceneHeroOrb").then((m) => m.SceneHeroOrb), {
  ssr: false
});

export function HeroOrbCard() {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Hero Orb</h3>
      <p className="text-sm text-muted-foreground">Ambient rotating signature object for your dashboard and lab.</p>
      <CanvasShell>
        <SceneHeroOrb />
      </CanvasShell>
    </div>
  );
}