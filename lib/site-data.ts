export type QuickLinkTheme = {
  gradientFrom: string;
  gradientTo: string;
};

export type QuickLinkDeepLink = {
  title: string;
  href: string;
  note?: string;
  keywords?: string[];
};

export type QuickLink = {
  name: string;
  href: string;
  note?: string;
  category: "Dev" | "Design" | "Audio" | "Admin";
  pinned?: boolean;
  iconSrc?: string;
  theme: QuickLinkTheme;
  deepLinks?: QuickLinkDeepLink[];
};

export const quickLinks: QuickLink[] = [
  {
    name: "GitHub",
    href: "https://github.com/Twinspeakers",
    note: "Repos and issues",
    category: "Dev",
    pinned: true,
    iconSrc: "/icons/github-mark-white.svg",
    deepLinks: [
      {
        title: "Your Repositories",
        href: "https://github.com/Twinspeakers?tab=repositories",
        keywords: ["repos", "repositories", "code"]
      },
      {
        title: "Your Stars",
        href: "https://github.com/Twinspeakers?tab=stars",
        keywords: ["stars", "bookmarks"]
      },
      {
        title: "GitHub Issues",
        href: "https://github.com/issues",
        keywords: ["issues", "tickets", "bugs"]
      }
    ],
    theme: { gradientFrom: "rgba(16, 21, 31, 0.9)", gradientTo: "rgba(66, 76, 92, 0.5)" }
  },
  {
    name: "VS Code",
    href: "https://code.visualstudio.com",
    note: "Code editor",
    category: "Dev",
    pinned: true,
    iconSrc: "https://code.visualstudio.com/favicon.ico",
    deepLinks: [
      {
        title: "Docs",
        href: "https://code.visualstudio.com/docs",
        keywords: ["documentation", "editor docs"]
      },
      {
        title: "Marketplace",
        href: "https://marketplace.visualstudio.com/vscode",
        keywords: ["extensions", "plugins"]
      },
      {
        title: "Keyboard Shortcuts",
        href: "https://code.visualstudio.com/docs/getstarted/keybindings",
        keywords: ["shortcuts", "keybindings"]
      }
    ],
    theme: { gradientFrom: "rgba(0, 88, 152, 0.88)", gradientTo: "rgba(26, 145, 223, 0.58)" }
  },
  {
    name: "Vercel",
    href: "https://vercel.com",
    note: "Deployments",
    category: "Dev",
    pinned: false,
    theme: { gradientFrom: "rgba(11, 11, 14, 0.88)", gradientTo: "rgba(61, 64, 76, 0.42)" }
  },
  {
    name: "Linear",
    href: "https://linear.app",
    note: "Issue tracking",
    category: "Dev",
    pinned: false,
    theme: { gradientFrom: "rgba(17, 16, 40, 0.82)", gradientTo: "rgba(78, 64, 183, 0.4)" }
  },
  {
    name: "Photopea",
    href: "https://www.photopea.com/",
    note: "Photoshop clone",
    category: "Design",
    pinned: true,
    theme: { gradientFrom: "rgba(4, 153, 140, 0.82)", gradientTo: "rgba(68, 206, 191, 0.45)" }
  },
  {
    name: "Pic Flow",
    href: "https://picflow.app",
    note: "Image editor",
    category: "Design",
    pinned: true,
    theme: { gradientFrom: "rgba(42, 36, 186, 0.86)", gradientTo: "rgba(217, 48, 98, 0.46)" }
  },
  {
    name: "Canva",
    href: "https://canva.com",
    note: "Graphics",
    category: "Design",
    pinned: false,
    theme: { gradientFrom: "rgba(7, 138, 168, 0.82)", gradientTo: "rgba(121, 74, 203, 0.42)" }
  },
  {
    name: "Figma",
    href: "https://figma.com",
    note: "Wireframes",
    category: "Design",
    pinned: false,
    theme: { gradientFrom: "rgba(236, 91, 76, 0.82)", gradientTo: "rgba(62, 207, 111, 0.48)" }
  },
  {
    name: "Blender",
    href: "https://blender.org",
    note: "3D modeling",
    category: "Design",
    pinned: true,
    deepLinks: [
      {
        title: "Blender Manual",
        href: "https://docs.blender.org/manual/en/latest/",
        keywords: ["manual", "documentation"]
      },
      {
        title: "Download",
        href: "https://www.blender.org/download/",
        keywords: ["download", "installer"]
      }
    ],
    theme: { gradientFrom: "rgba(213, 117, 39, 0.82)", gradientTo: "rgba(66, 143, 231, 0.42)" }
  },
  {
    name: "Godot",
    href: "https://godotengine.org",
    note: "Game engine",
    category: "Design",
    pinned: false,
    theme: { gradientFrom: "rgba(39, 112, 194, 0.84)", gradientTo: "rgba(88, 132, 234, 0.48)" }
  },
  {
    name: "Reaper",
    href: "https://www.reaper.fm/",
    note: "Audio DAW",
    category: "Audio",
    pinned: true,
    iconSrc: "https://www.reaper.fm/v5img/logo.jpg",
    deepLinks: [
      {
        title: "User Guide",
        href: "https://www.reaper.fm/userguide.php",
        keywords: ["manual", "guide", "documentation"]
      },
      {
        title: "ReaPack",
        href: "https://reapack.com/",
        keywords: ["plugins", "extensions", "scripts"]
      }
    ],
    theme: { gradientFrom: "rgba(35, 168, 104, 0.82)", gradientTo: "rgba(31, 98, 171, 0.44)" }
  },
  {
    name: "ElevenLabs",
    href: "https://elevenlabs.io",
    note: "Voice generation",
    category: "Audio",
    pinned: false,
    theme: { gradientFrom: "rgba(127, 140, 161, 0.72)", gradientTo: "rgba(91, 101, 120, 0.4)" }
  },
  {
    name: "Suno AI",
    href: "https://suno.ai",
    note: "Music generation",
    category: "Audio",
    pinned: false,
    theme: { gradientFrom: "rgba(242, 132, 72, 0.82)", gradientTo: "rgba(223, 48, 78, 0.56)" }
  },
  {
    name: "Google Drive",
    href: "https://drive.google.com",
    note: "Shared files",
    category: "Admin",
    pinned: false,
    deepLinks: [
      {
        title: "Recent Files",
        href: "https://drive.google.com/drive/recent",
        keywords: ["recent", "files"]
      },
      {
        title: "Shared with Me",
        href: "https://drive.google.com/drive/shared-with-me",
        keywords: ["shared", "collaboration"]
      }
    ],
    theme: { gradientFrom: "rgba(20, 130, 82, 0.82)", gradientTo: "rgba(228, 183, 42, 0.42)" }
  },
  {
    name: "Google Docs",
    href: "https://docs.google.com",
    note: "Documentation",
    category: "Admin",
    pinned: true,
    deepLinks: [
      {
        title: "Blank Document",
        href: "https://docs.google.com/document/create",
        keywords: ["new doc", "blank document"]
      },
      {
        title: "Templates",
        href: "https://docs.google.com/document/u/0/",
        keywords: ["templates", "documents"]
      }
    ],
    theme: { gradientFrom: "rgba(34, 110, 214, 0.82)", gradientTo: "rgba(118, 174, 236, 0.46)" }
  },
    {
    name: "Calendar",
    href: "https://calendar.google.com",
    note: "Schedules",
    category: "Admin",
    pinned: false,
    deepLinks: [
      {
        title: "Create Event",
        href: "https://calendar.google.com/calendar/u/0/r/eventedit",
        keywords: ["event", "schedule"]
      }
    ],
    theme: { gradientFrom: "rgba(31, 102, 208, 0.82)", gradientTo: "rgba(90, 165, 237, 0.42)" }
  }
];



export const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Links", href: "/links" },
  { label: "Wiki", href: "/knowledge" }
];
