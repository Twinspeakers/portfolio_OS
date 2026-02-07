import type { Metadata } from "next";
import { ImageLabApp } from "@/app/image-lab/ImageLabApp";

export const metadata: Metadata = {
  title: "Image Lab",
  description: "Resize/export images in batches and grab CSS-ready colors (including oklch()) inside Portfolio OS.",
  openGraph: {
    title: "Image Lab | Portfolio OS",
    description: "Resize/export images in batches and grab CSS-ready colors (including oklch()) inside Portfolio OS.",
    url: "/image-lab"
  }
};

export default function ImageLabPage() {
  return <ImageLabApp />;
}
