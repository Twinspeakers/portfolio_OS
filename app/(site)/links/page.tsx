import type { Metadata } from "next";
import { LinkCard } from "@/components/cards/LinkCard";
import { quickLinks } from "@/lib/site-data";

const categories = ["Dev", "Design", "Audio", "Admin"] as const;

export const metadata: Metadata = {
  title: "Links",
  description: "Categorized quick-link portal for dev tools, design resources, audio apps, and admin utilities.",
  openGraph: {
    title: "Links | Portfolio OS",
    description: "Categorized quick-link portal for dev tools, design resources, audio apps, and admin utilities.",
    url: "/links"
  }
};

export default function LinksPage() {
  const pinned = quickLinks.filter((item) => item.pinned);

  return (
    <div className="space-y-8">
      <section className="surface-elevated accent-frame space-y-3 p-5">
        <p className="section-kicker">Favorites</p>
        <h2 className="section-title text-2xl">Pinned Links</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pinned.map((item) => (
            <LinkCard key={`pinned-${item.name}`} item={item} />
          ))}
        </div>
      </section>

      {categories.map((category) => (
        <section key={category} className="space-y-3">
          <h3 className="text-2xl font-semibold tracking-tight">{category}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quickLinks
              .filter((item) => item.category === category)
              .map((item) => (
                <LinkCard key={`${category}-${item.name}`} item={item} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
