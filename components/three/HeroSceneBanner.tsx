import { HeroSceneCanvas } from "@/components/three/HeroSceneCanvas";

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
    <section className="surface-elevated accent-frame relative overflow-hidden p-0">
      <div className="pointer-events-none absolute inset-0">
        <div className="h-full w-full bg-linear-to-br from-[#030611] via-[#071328] to-[#060d1b]" />
      </div>
      <div className="absolute inset-0 opacity-90">
        <HeroSceneCanvas />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#030611]/70 via-[#061127]/42 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#030611]/66 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,hsl(var(--primary)/0.18),transparent_52%),radial-gradient(circle_at_92%_88%,hsl(var(--accent)/0.16),transparent_50%)]" />
      <div className="pointer-events-none absolute -right-18 -top-20 h-64 w-64 rounded-full bg-cyan-300/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-22 left-18 h-56 w-56 rounded-full bg-orange-300/14 blur-3xl" />

      <div className="pointer-events-none relative z-10 flex h-60 flex-col justify-center gap-2 p-6 text-left">
        <p className="section-kicker text-cyan-100/95">{eyebrow}</p>
        <h1 className="hero-title">
          <span>{title}</span>
        </h1>
        <p className="max-w-2xl text-sm text-slate-200/88">{description}</p>
      </div>
    </section>
  );
}
