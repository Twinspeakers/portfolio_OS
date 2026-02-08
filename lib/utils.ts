import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prefixes local URLs with the configured Next.js basePath.
 * Useful for static exports served from GitHub Pages (e.g. /portfolio_OS).
 */
export function withBasePath(url: string) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${BASE_PATH}${url}`;
  }

  // Relative-ish path, normalize into an absolute-like path under basePath.
  return `${BASE_PATH}/${url}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}