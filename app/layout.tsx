import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Portfolio OS",
    template: "%s | Portfolio OS"
  },
  description: "A product-style portfolio dashboard for projects, links, and interactive lab scenes.",
  openGraph: {
    title: "Portfolio OS",
    description: "A product-style portfolio dashboard for projects, links, and interactive lab scenes.",
    type: "website",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio OS",
    description: "A product-style portfolio dashboard for projects, links, and interactive lab scenes."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
