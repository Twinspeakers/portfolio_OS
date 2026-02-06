"use client";

import dynamic from "next/dynamic";

const CanvasShell = dynamic(() => import("@/components/three/CanvasShell").then((m) => m.CanvasShell), {
  ssr: false,
  loading: () => <div className="h-[240px] w-full animate-pulse rounded-2xl border border-border/70 bg-muted" />
});

const SceneHeroOrb = dynamic(() => import("@/components/three/SceneHeroOrb").then((m) => m.SceneHeroOrb), {
  ssr: false
});

type HeroSceneBannerProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function HeroSceneBanner({
  eyebrow = "Dashboard",
  title,
  description
}: HeroSceneBannerProps) {
  return (
    <section className="surface-elevated relative overflow-hidden p-0">
      <div className="absolute inset-0">
        <CanvasShell heightClass="h-[240px]" framed={false} className="h-full">
          <SceneHeroOrb />
        </CanvasShell>
      </div>

      {/* readability mask */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/55 to-slate-950/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

      <div className="relative z-10 flex h-[240px] flex-col justify-end gap-2 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/90">{eyebrow}</p>
        <h1 className="hero-title">
          <span>{title}</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
