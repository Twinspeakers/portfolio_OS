export type SearchEntryKind = "page" | "project" | "knowledge" | "quick-link";

export type SearchEntry = {
  id: string;
  kind: SearchEntryKind;
  title: string;
  href: string;
  description?: string;
  keywords: string[];
  external?: boolean;
};
