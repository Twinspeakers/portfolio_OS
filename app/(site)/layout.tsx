import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getSiteSearchIndex } from "@/lib/content/search-index";

export default function SiteLayout({ children }: { children: ReactNode }) {
  const searchIndex = getSiteSearchIndex();
  return <AppShell searchIndex={searchIndex}>{children}</AppShell>;
}
