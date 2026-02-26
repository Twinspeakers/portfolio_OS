import type { Metadata } from "next";
import { JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Portfolio OS",
    template: "%s | Portfolio OS"
  },
  description: "A product-style portfolio dashboard for projects and quick links.",
  openGraph: {
    title: "Portfolio OS",
    description: "A product-style portfolio dashboard for projects and quick links.",
    type: "website",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio OS",
    description: "A product-style portfolio dashboard for projects and quick links."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${sora.variable} ${jetbrainsMono.variable}`}>{children}</body>
    </html>
  );
}
