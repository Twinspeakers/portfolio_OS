export type QuickLink = {
  name: string;
  href: string;
  note?: string;
  category: "Dev" | "Design" | "Audio" | "Uni" | "Admin";
  pinned?: boolean;
};

export const quickLinks: QuickLink[] = [
  { name: "GitHub", href: "https://github.com", note: "Repos and issues", category: "Dev", pinned: true },
  { name: "Vercel", href: "https://vercel.com", note: "Deployments", category: "Dev", pinned: true },
  { name: "Figma", href: "https://figma.com", note: "Wireframes", category: "Design", pinned: true },
  { name: "Notion", href: "https://notion.so", note: "Plans and docs", category: "Admin", pinned: true },
  { name: "Linear", href: "https://linear.app", note: "Issue tracking", category: "Dev" },
  { name: "Canva", href: "https://canva.com", note: "Graphics", category: "Design" },
  { name: "Ableton", href: "https://ableton.com", note: "Audio drafts", category: "Audio" },
  { name: "Uni Portal", href: "https://example.edu", note: "Course hub", category: "Uni" },
  { name: "Google Drive", href: "https://drive.google.com", note: "Shared files", category: "Admin" },
  { name: "Calendar", href: "https://calendar.google.com", note: "Schedules", category: "Admin" }
];

export const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Links", href: "/links" },
  { label: "Lab", href: "/lab" }
];