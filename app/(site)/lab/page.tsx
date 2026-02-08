import type { Metadata } from "next";
import Link from "next/link";
import { GalaxyCard } from "@/components/three/GalaxyCard";
import { HeroOrbCard } from "@/components/three/HeroOrbCard";

export const metadata: Metadata = {
  title: "Lab",
  description: "Interactive 3D scene gallery built with react-three-fiber for technical portfolio showcases.",
  openGraph: {
    title: "Lab | Portfolio OS",
    description: "Interactive 3D scene gallery built with react-three-fiber for technical portfolio showcases.",
    url: "/lab"
  }
};

export default function LabPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Lab</p>
        <h2 className="mt-2 text-3xl font-semibold">Interactive 3D Scenes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Lightweight experiments built with react-three-fiber to showcase interactivity and visual polish.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="surface-elevated accent-frame p-5">
          <HeroOrbCard />
          <div className="mt-3 text-sm text-muted-foreground">Scene #1: ambient rotating object for hero placements.</div>
        </div>

        <div className="surface-elevated accent-frame p-5">
          <GalaxyCard />
          <div className="mt-3 text-sm text-muted-foreground">Scene #2: interactive nodes concept for project graph navigation.</div>
        </div>
      </section>

      <section className="surface-elevated p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Related projects</p>
        <div className="mt-2 flex gap-4 text-sm">
          <Link href="/projects/personal-os" className="text-cyan-300 hover:underline">Personal OS</Link>
        </div>
      </section>
    </div>
  );
}
