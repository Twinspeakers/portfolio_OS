"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Image as ImageIcon,
  Palette,
  Pipette,
  Scissors,
  Trash2,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";

type CropRect = { x: number; y: number; w: number; h: number };

type ImageItem = {
  id: string;
  file: File;
  url: string;
  name: string;
  originalWidth: number;
  originalHeight: number;
  type: string;
  crop: CropRect | null; // persisted crop in source pixels
};

type ResizeMode = "longest" | "scale" | "exact";
type OutputFormat = "png" | "jpeg" | "webp";

type ColorFormats = {
  hex: string;
  rgb: string;
  hsl: string;
  oklch: string;
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseHex(hex: string) {
  const raw = hex.trim().replace(/^#/, "");
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    return { r, g, b, a: 1 };
  }
  if (raw.length === 6) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return { r, g, b, a: 1 };
  }
  if (raw.length === 8) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    const a = parseInt(raw.slice(6, 8), 16) / 255;
    return { r, g, b, a };
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number) {
  const to2 = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`.toUpperCase();
}

function rgbToHsl(r8: number, g8: number, b8: number) {
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }

  return {
    h: (h + 360) % 360,
    s: clamp(s, 0, 1),
    l: clamp(l, 0, 1)
  };
}

// sRGB -> OKLCH (CSS oklch())
function srgbToOklch(r8: number, g8: number, b8: number) {
  const srgb = [r8 / 255, g8 / 255, b8 / 255];
  const lin = srgb.map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const [r, g, b] = lin;

  // sRGB D65 -> XYZ
  const X = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const Y = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const Z = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  // XYZ -> LMS
  const l = 0.8189330101 * X + 0.3618667424 * Y - 0.1288597137 * Z;
  const m = 0.0329845436 * X + 0.9293118715 * Y + 0.0361456387 * Z;
  const s = 0.0482003018 * X + 0.2643662691 * Y + 0.633851707 * Z;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // LMS -> OKLab
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(A * A + B * B);
  const hRad = Math.atan2(B, A);
  const h = ((hRad * 180) / Math.PI + 360) % 360;

  return {
    L: clamp(L, 0, 1),
    C: clamp(C, 0, 1.5),
    h
  };
}

function formatsFromRGB(r: number, g: number, b: number): ColorFormats {
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  const oklch = srgbToOklch(r, g, b);

  return {
    hex,
    rgb: `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`,
    hsl: `hsl(${hsl.h.toFixed(1)} ${Math.round(hsl.s * 100)}% ${Math.round(hsl.l * 100)}%)`,
    oklch: `oklch(${(oklch.L * 100).toFixed(1)}% ${oklch.C.toFixed(3)} ${oklch.h.toFixed(1)})`
  };
}

function hsvToRgb(h: number, s: number, v: number) {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;

  let rp = 0, gp = 0, bp = 0;
  if (hh < 60) { rp = c; gp = x; bp = 0; }
  else if (hh < 120) { rp = x; gp = c; bp = 0; }
  else if (hh < 180) { rp = 0; gp = c; bp = x; }
  else if (hh < 240) { rp = 0; gp = x; bp = c; }
  else if (hh < 300) { rp = x; gp = 0; bp = c; }
  else { rp = c; gp = 0; bp = x; }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255)
  };
}

function rgbToHsv(r8: number, g8: number, b8: number) {
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h: (h + 360) % 360, s: clamp(s, 0, 1), v: clamp(v, 0, 1) };
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fileToImageBitmap(file: File) {
  try {
    // createImageBitmap is fast and generally respects EXIF orientation.
    return await createImageBitmap(file);
  } catch {
    // Fallback: decode via HTMLImageElement.
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to decode image"));
    });
    URL.revokeObjectURL(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0);
    return await createImageBitmap(canvas);
  }
}

function extForFormat(fmt: OutputFormat) {
  if (fmt === "jpeg") return "jpg";
  return fmt;
}

function mimeForFormat(fmt: OutputFormat) {
  if (fmt === "png") return "image/png";
  if (fmt === "jpeg") return "image/jpeg";
  return "image/webp";
}

function computeTargetSize(args: {
  mode: ResizeMode;
  originalWidth: number;
  originalHeight: number;
  longestEdge: number;
  scalePercent: number;
  boxWidth: number;
  boxHeight: number;
  keepAspect: boolean;
  preventUpscale: boolean;
}) {
  const {
    mode,
    originalWidth,
    originalHeight,
    longestEdge,
    scalePercent,
    boxWidth,
    boxHeight,
    keepAspect,
    preventUpscale
  } = args;

  let w = originalWidth;
  let h = originalHeight;

  if (mode === "scale") {
    const f = clamp(scalePercent / 100, 0.01, 100);
    w = Math.round(originalWidth * f);
    h = Math.round(originalHeight * f);
  }

  if (mode === "longest") {
    const maxEdge = Math.max(originalWidth, originalHeight);
    const target = Math.max(1, Math.round(longestEdge));
    const f = target / maxEdge;
    w = Math.round(originalWidth * f);
    h = Math.round(originalHeight * f);
  }

  if (mode === "exact") {
    const targetW = Math.max(0, Math.round(boxWidth));
    const targetH = Math.max(0, Math.round(boxHeight));
    if (keepAspect) {
      if (targetW > 0 && targetH > 0) {
        const f = Math.min(targetW / originalWidth, targetH / originalHeight);
        w = Math.round(originalWidth * f);
        h = Math.round(originalHeight * f);
      } else if (targetW > 0) {
        const f = targetW / originalWidth;
        w = targetW;
        h = Math.round(originalHeight * f);
      } else if (targetH > 0) {
        const f = targetH / originalHeight;
        h = targetH;
        w = Math.round(originalWidth * f);
      }
    } else {
      if (targetW > 0) w = targetW;
      if (targetH > 0) h = targetH;
    }
  }

  w = Math.max(1, w);
  h = Math.max(1, h);

  if (preventUpscale) {
    if (w > originalWidth || h > originalHeight) {
      const f = Math.min(1, originalWidth / w, originalHeight / h);
      w = Math.round(w * f);
      h = Math.round(h * f);
      w = Math.max(1, w);
      h = Math.max(1, h);
    }
  }

  return { width: w, height: h };
}

async function exportToBlob(args: {
  bitmap: ImageBitmap;
  source: CropRect;
  width: number;
  height: number;
  format: OutputFormat;
  quality: number;
  jpegBackground: string;
}) {
  const { bitmap, source, width, height, format, quality, jpegBackground } = args;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (format === "jpeg") {
    ctx.fillStyle = jpegBackground;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(
    bitmap,
    source.x,
    source.y,
    source.w,
    source.h,
    0,
    0,
    width,
    height
  );

  const mime = mimeForFormat(format);
  const q = format === "png" ? undefined : clamp(quality, 0.05, 1);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export image"));
          return;
        }
        resolve(blob);
      },
      mime,
      q
    );
  });
}

function isDropEventWithFiles(evt: DragEvent | React.DragEvent) {
  const dt = "dataTransfer" in evt ? evt.dataTransfer : null;
  return Boolean(dt && dt.files && dt.files.length > 0);
}

function clampCrop(rect: CropRect, imgW: number, imgH: number): CropRect {
  const x = clamp(Math.round(rect.x), 0, Math.max(0, imgW - 1));
  const y = clamp(Math.round(rect.y), 0, Math.max(0, imgH - 1));
  const w = clamp(Math.round(rect.w), 1, Math.max(1, imgW - x));
  const h = clamp(Math.round(rect.h), 1, Math.max(1, imgH - y));
  return { x, y, w, h };
}

function aspectForPreset(preset: string, customW: number, customH: number): number | null {
  switch (preset) {
    case "1:1":
      return 1;
    case "16:9":
      return 16 / 9;
    case "4:5":
      return 4 / 5;
    case "3:2":
      return 3 / 2;
    case "2:3":
      return 2 / 3;
    case "custom": {
      const w = Math.max(1, customW);
      const h = Math.max(1, customH);
      return w / h;
    }
    default:
      return null;
  }
}

type DragMode = "move" | "nw" | "ne" | "se" | "sw";
type DragState = {
  mode: DragMode;
  startClientX: number;
  startClientY: number;
  startCrop: CropRect;
};

function cornerResize(args: {
  mode: "nw" | "ne" | "se" | "sw";
  start: CropRect;
  dx: number;
  dy: number;
  imgW: number;
  imgH: number;
  ratio: number | null;
}) {
  const { mode, start, dx, dy, imgW, imgH, ratio } = args;

  const minSize = 8; // keep handles usable
  let x = start.x;
  let y = start.y;
  let w = start.w;
  let h = start.h;

  // Opposite fixed corner.
  const fx = mode === "nw" || mode === "sw" ? start.x + start.w : start.x;
  const fy = mode === "nw" || mode === "ne" ? start.y + start.h : start.y;

  // Compute candidate w/h from pointer delta.
  let candW = start.w + (mode === "ne" || mode === "se" ? dx : -dx);
  let candH = start.h + (mode === "sw" || mode === "se" ? dy : -dy);

  candW = Math.max(minSize, candW);
  candH = Math.max(minSize, candH);

  if (ratio) {
    // Choose dominant axis to feel natural.
    if (Math.abs(dx) >= Math.abs(dy)) {
      candH = candW / ratio;
    } else {
      candW = candH * ratio;
    }
  }

  w = candW;
  h = candH;

  // Rebuild top-left from fixed corner.
  if (mode === "nw") {
    x = fx - w;
    y = fy - h;
  } else if (mode === "ne") {
    x = fx;
    y = fy - h;
  } else if (mode === "se") {
    x = fx;
    y = fy;
  } else if (mode === "sw") {
    x = fx - w;
    y = fy;
  }

  // Clamp within image bounds (shrink as needed while keeping the fixed corner).
  if (x < 0) {
    const over = -x;
    x = 0;
    w = w - over;
    if (ratio) h = w / ratio;
  }
  if (y < 0) {
    const over = -y;
    y = 0;
    h = h - over;
    if (ratio) w = h * ratio;
  }

  // Ensure right/bottom within bounds based on anchor.
  if (mode === "nw") {
    // fixed is bottom-right
    w = Math.min(w, fx - x);
    h = ratio ? w / ratio : Math.min(h, fy - y);
    if (!ratio) h = Math.min(h, fy - y);
    if (ratio) {
      h = Math.min(h, fy - y);
      w = h * ratio;
      x = fx - w;
      y = fy - h;
    }
  } else if (mode === "ne") {
    // fixed is bottom-left
    w = Math.min(w, imgW - x);
    h = ratio ? w / ratio : Math.min(h, fy - y);
    if (!ratio) h = Math.min(h, fy - y);
    if (ratio) {
      h = Math.min(h, fy - y);
      w = h * ratio;
      x = fx;
      y = fy - h;
    }
  } else if (mode === "se") {
    // fixed is top-left
    w = Math.min(w, imgW - x);
    h = ratio ? w / ratio : Math.min(h, imgH - y);
    if (!ratio) h = Math.min(h, imgH - y);
    if (ratio) {
      h = Math.min(h, imgH - y);
      w = h * ratio;
      x = fx;
      y = fy;
    }
  } else if (mode === "sw") {
    // fixed is top-right
    w = Math.min(w, fx - x);
    h = ratio ? w / ratio : Math.min(h, imgH - y);
    if (!ratio) h = Math.min(h, imgH - y);
    if (ratio) {
      h = Math.min(h, imgH - y);
      w = h * ratio;
      x = fx - w;
      y = fy;
    }
  }

  const rect = clampCrop({ x, y, w, h }, imgW, imgH);
  return rect;
}

function SVPicker(props: {
  hue: number;
  s: number;
  v: number;
  onChange: (next: { s: number; v: number }, commit?: boolean) => void;
}) {
  const { hue, s, v, onChange } = props;
  const ref = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const hueColor = useMemo(() => `hsl(${hue} 100% 50%)`, [hue]);
  const left = `${clamp(s, 0, 1) * 100}%`;
  const top = `${(1 - clamp(v, 0, 1)) * 100}%`;

  const updateFromEvent = useCallback(
    (clientX: number, clientY: number, commit?: boolean) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;
      const nextS = clamp(nx, 0, 1);
      const nextV = clamp(1 - ny, 0, 1);
      onChange({ s: nextS, v: nextV }, commit);
    },
    [onChange]
  );

  return (
    <div
      ref={ref}
      className="relative h-48 w-full rounded-2xl border border-border overflow-hidden touch-none"
      style={{
        backgroundImage: `linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0)), linear-gradient(to right, rgba(255,255,255,1), ${hueColor})`
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        dragging.current = true;
        updateFromEvent(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        updateFromEvent(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        updateFromEvent(e.clientX, e.clientY, true);
        try {
          (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      aria-label="Saturation and value picker"
    >
      <div
        className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 shadow"
        style={{ left, top }}
      >
        <div className="absolute inset-0 rounded-full border border-black/40" />
      </div>
    </div>
  );
}

export function ImageLabApp() {
  const [tab, setTab] = useState<"resize" | "crop" | "color">("resize");
  const [items, setItems] = useState<ImageItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const itemsRef = useRef<ImageItem[]>([]);
  const bitmapCache = useRef<Map<string, ImageBitmap>>(new Map());

  // resize
  const [resizeMode, setResizeMode] = useState<ResizeMode>("longest");
  const [longestEdge, setLongestEdge] = useState(1024);
  const [scalePercent, setScalePercent] = useState(50);
  const [boxWidth, setBoxWidth] = useState(1024);
  const [boxHeight, setBoxHeight] = useState(1024);
  const [keepAspect, setKeepAspect] = useState(true);
  const [preventUpscale, setPreventUpscale] = useState(true);
  const [format, setFormat] = useState<OutputFormat>("png");
  const [quality, setQuality] = useState(0.9);
  const [jpegBackground, setJpegBackground] = useState("#0B1220");

  // crop tool
  const [cropAspectPreset, setCropAspectPreset] = useState<"free" | "1:1" | "16:9" | "4:5" | "3:2" | "2:3" | "custom">(
    "free"
  );
  const [cropCustomW, setCropCustomW] = useState(4);
  const [cropCustomH, setCropCustomH] = useState(3);
  const [cropLockAspect, setCropLockAspect] = useState(true);
  const [cropRuleOfThirds, setCropRuleOfThirds] = useState(true);
  const [draftCrop, setDraftCrop] = useState<CropRect | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // figma-ish color picker
  const [hue, setHue] = useState(200);
  const [sv, setSv] = useState({ s: 0.6, v: 0.75 });
  const [recentColors, setRecentColors] = useState<ColorFormats[]>([]);

  const active = useMemo(() => items.find((i) => i.id === activeId) ?? null, [items, activeId]);

  const effectiveSourceRect = useMemo<CropRect | null>(() => {
    if (!active) return null;
    const bmp = bitmapCache.current.get(active.id);
    const w = bmp?.width ?? active.originalWidth;
    const h = bmp?.height ?? active.originalHeight;
    return active.crop ? clampCrop(active.crop, w, h) : { x: 0, y: 0, w, h };
  }, [active]);

  const effectiveSourceSize = useMemo(() => {
    if (!active) return null;
    const src = effectiveSourceRect;
    if (!src) return null;
    return { w: src.w, h: src.h };
  }, [active, effectiveSourceRect]);

  const targetSize = useMemo(() => {
    if (!active) return null;
    if (!effectiveSourceSize) return null;
    return computeTargetSize({
      mode: resizeMode,
      originalWidth: effectiveSourceSize.w,
      originalHeight: effectiveSourceSize.h,
      longestEdge,
      scalePercent,
      boxWidth,
      boxHeight,
      keepAspect,
      preventUpscale
    });
  }, [
    active,
    effectiveSourceSize,
    resizeMode,
    longestEdge,
    scalePercent,
    boxWidth,
    boxHeight,
    keepAspect,
    preventUpscale
  ]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const disposeAll = useCallback(() => {
    for (const it of itemsRef.current) {
      try {
        URL.revokeObjectURL(it.url);
      } catch {
        // ignore
      }
    }
    bitmapCache.current.forEach((bmp) => bmp.close());
    bitmapCache.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      disposeAll();
    };
  }, [disposeAll]);

  const cleanupUrls = useCallback(() => {
    for (const it of itemsRef.current) {
      try {
        URL.revokeObjectURL(it.url);
      } catch {
        // ignore
      }
    }
    bitmapCache.current.forEach((bmp) => bmp.close());
    bitmapCache.current.clear();
    setItems([]);
    setActiveId("");
  }, []);

  const ingestFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) {
      setError("No supported images found.");
      return;
    }

    setBusy(true);
    try {
      const next: ImageItem[] = [];

      for (const file of incoming) {
        const id = uid();
        const url = URL.createObjectURL(file);
        const bitmap = await fileToImageBitmap(file);
        bitmapCache.current.set(id, bitmap);
        next.push({
          id,
          file,
          url,
          name: file.name,
          originalWidth: bitmap.width,
          originalHeight: bitmap.height,
          type: file.type,
          crop: null
        });
      }

      setItems((prev) => [...prev, ...next]);
      setActiveId((prevId) => prevId || next[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load images");
    } finally {
      setBusy(false);
    }
  }, []);

  const onChooseFiles = () => {
    fileInputRef.current?.click();
  };

  const onFileInputChange = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!evt.target.files) return;
    await ingestFiles(evt.target.files);
    evt.target.value = "";
  };

  const onDrop = async (evt: React.DragEvent) => {
    evt.preventDefault();
    if (!evt.dataTransfer?.files?.length) return;
    await ingestFiles(evt.dataTransfer.files);
  };

  const onDragOver = (evt: React.DragEvent) => {
    if (isDropEventWithFiles(evt)) evt.preventDefault();
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const victim = prev.find((p) => p.id === id);
      if (victim) {
        try {
          URL.revokeObjectURL(victim.url);
        } catch {
          // ignore
        }
      }
      const next = prev.filter((p) => p.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? "");
      const bmp = bitmapCache.current.get(id);
      if (bmp) {
        bmp.close();
        bitmapCache.current.delete(id);
      }
      return next;
    });
  };

  // ---- Crop tool lifecycle ----
  useEffect(() => {
    if (tab !== "crop") {
      setDraftCrop(null);
      return;
    }
    if (!active) {
      setDraftCrop(null);
      return;
    }
    const bmp = bitmapCache.current.get(active.id);
    const imgW = bmp?.width ?? active.originalWidth;
    const imgH = bmp?.height ?? active.originalHeight;
    const base = active.crop ?? { x: 0, y: 0, w: imgW, h: imgH };
    setDraftCrop(clampCrop(base, imgW, imgH));
  }, [tab, activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cropRatio = useMemo(() => {
    if (!cropLockAspect) return null;
    return aspectForPreset(cropAspectPreset, cropCustomW, cropCustomH);
  }, [cropLockAspect, cropAspectPreset, cropCustomW, cropCustomH]);

  const applyCrop = useCallback(async () => {
    if (!active || !draftCrop) return;
    const bmp = bitmapCache.current.get(active.id);
    if (!bmp) {
      setError("Image not loaded yet.");
      return;
    }

    const finalCrop = clampCrop(draftCrop, bmp.width, bmp.height);
    if (finalCrop.w <= 1 || finalCrop.h <= 1) return;

    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = finalCrop.w;
      canvas.height = finalCrop.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        bmp,
        finalCrop.x,
        finalCrop.y,
        finalCrop.w,
        finalCrop.h,
        0,
        0,
        finalCrop.w,
        finalCrop.h
      );

      const outputType = active.type && active.type.startsWith("image/") ? active.type : "image/png";
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (!nextBlob) {
            reject(new Error("Failed to apply crop"));
            return;
          }
          resolve(nextBlob);
        }, outputType);
      });

      const nextBitmap = await createImageBitmap(blob);
      const nextUrl = URL.createObjectURL(blob);
      const nextFile = new File([blob], active.name, { type: blob.type || outputType, lastModified: Date.now() });

      bitmapCache.current.set(active.id, nextBitmap);
      bmp.close();

      setItems((prev) =>
        prev.map((it) =>
          it.id === active.id
            ? {
                ...it,
                file: nextFile,
                url: nextUrl,
                originalWidth: nextBitmap.width,
                originalHeight: nextBitmap.height,
                type: blob.type || outputType,
                crop: null
              }
            : it
        )
      );

      try {
        URL.revokeObjectURL(active.url);
      } catch {
        // ignore
      }

      setDraftCrop({ x: 0, y: 0, w: nextBitmap.width, h: nextBitmap.height });
      dragRef.current = null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply crop");
    } finally {
      setBusy(false);
    }
  }, [active, draftCrop]);

  const resetCrop = useCallback(() => {
    if (!active) return;
    const bmp = bitmapCache.current.get(active.id);
    const imgW = bmp?.width ?? active.originalWidth;
    const imgH = bmp?.height ?? active.originalHeight;
    setItems((prev) => prev.map((it) => (it.id === active.id ? { ...it, crop: null } : it)));
    setDraftCrop({ x: 0, y: 0, w: imgW, h: imgH });
  }, [active]);

  const startDrag = useCallback((mode: DragMode, e: React.PointerEvent) => {
    if (!active || !draftCrop) return;
    dragRef.current = {
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCrop: draftCrop
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [active, draftCrop]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!active) return;
    const ds = dragRef.current;
    if (!ds) return;
    const img = imgRef.current;
    if (!img) return;

    const bmp = bitmapCache.current.get(active.id);
    const imgW = bmp?.width ?? active.originalWidth;
    const imgH = bmp?.height ?? active.originalHeight;

    const rect = img.getBoundingClientRect();
    const scaleX = imgW / rect.width;
    const scaleY = imgH / rect.height;

    const dx = (e.clientX - ds.startClientX) * scaleX;
    const dy = (e.clientY - ds.startClientY) * scaleY;

    if (ds.mode === "move") {
      const next = clampCrop(
        {
          x: ds.startCrop.x + dx,
          y: ds.startCrop.y + dy,
          w: ds.startCrop.w,
          h: ds.startCrop.h
        },
        imgW,
        imgH
      );
      setDraftCrop(next);
      return;
    }

    const next = cornerResize({
      mode: ds.mode,
      start: ds.startCrop,
      dx,
      dy,
      imgW,
      imgH,
      ratio: cropRatio
    });

    setDraftCrop(next);
  }, [active, cropRatio]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ---- Export ----
  const exportSelected = useCallback(async () => {
    if (!active) return;
    if (!targetSize) return;

    const bitmap = bitmapCache.current.get(active.id);
    if (!bitmap) {
      setError("Image not loaded yet.");
      return;
    }

    const src: CropRect = active.crop
      ? clampCrop(active.crop, bitmap.width, bitmap.height)
      : { x: 0, y: 0, w: bitmap.width, h: bitmap.height };

    setBusy(true);
    setError(null);
    try {
      const blob = await exportToBlob({
        bitmap,
        source: src,
        width: targetSize.width,
        height: targetSize.height,
        format,
        quality,
        jpegBackground
      });

      const base = active.name.replace(/\.[^/.]+$/, "");
      const filename = `${base}-${targetSize.width}x${targetSize.height}.${extForFormat(format)}`;
      downloadBlob(filename, blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }, [active, targetSize, format, quality, jpegBackground]);

  const exportAll = useCallback(async () => {
    if (items.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const it of items) {
        const bmp = bitmapCache.current.get(it.id);
        if (!bmp) continue;

        const src: CropRect = it.crop
          ? clampCrop(it.crop, bmp.width, bmp.height)
          : { x: 0, y: 0, w: bmp.width, h: bmp.height };

        const size = computeTargetSize({
          mode: resizeMode,
          originalWidth: src.w,
          originalHeight: src.h,
          longestEdge,
          scalePercent,
          boxWidth,
          boxHeight,
          keepAspect,
          preventUpscale
        });

        const blob = await exportToBlob({
          bitmap: bmp,
          source: src,
          width: size.width,
          height: size.height,
          format,
          quality,
          jpegBackground
        });

        const base = it.name.replace(/\.[^/.]+$/, "");
        const filename = `${base}-${size.width}x${size.height}.${extForFormat(format)}`;
        downloadBlob(filename, blob);
        await new Promise((r) => setTimeout(r, 160));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch export failed");
    } finally {
      setBusy(false);
    }
  }, [
    items,
    resizeMode,
    longestEdge,
    scalePercent,
    boxWidth,
    boxHeight,
    keepAspect,
    preventUpscale,
    format,
    quality,
    jpegBackground
  ]);

  // ---- Color picker logic ----
  const rgb = useMemo(() => hsvToRgb(hue, sv.s, sv.v), [hue, sv.s, sv.v]);
  const pickedColor = useMemo(() => formatsFromRGB(rgb.r, rgb.g, rgb.b), [rgb.r, rgb.g, rgb.b]);

  const pushRecentColor = useCallback((c: ColorFormats) => {
    setRecentColors((prev) => [c, ...prev.filter((p) => p.hex !== c.hex)].slice(0, 10));
  }, []);

  const setFromRGB = useCallback((r: number, g: number, b: number, commit?: boolean) => {
    const hsv = rgbToHsv(r, g, b);
    setHue(hsv.h);
    setSv({ s: hsv.s, v: hsv.v });
    if (commit) pushRecentColor(formatsFromRGB(r, g, b));
  }, [pushRecentColor]);

  const pickScreenColor = useCallback(async () => {
    setError(null);
    try {
      const EyeDropperCtor = (window as any).EyeDropper;
      if (!EyeDropperCtor) {
        setError("Screen color picker isn’t supported in this browser (try Chrome/Edge).");
        return;
      }
      const eye = new EyeDropperCtor();
      const result = await eye.open();
      const parsed = parseHex(result.sRGBHex);
      if (!parsed) return;
      setFromRGB(parsed.r, parsed.g, parsed.b, true);
    } catch (e) {
      if (e instanceof Error && /AbortError/i.test(e.name)) return;
    }
  }, [setFromRGB]);

  useEffect(() => {
    // keep recent from becoming empty on first load, but don't spam
    if (recentColors.length === 0) pushRecentColor(pickedColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const presets = [
    { label: "256", value: 256 },
    { label: "512", value: 512 },
    { label: "1024", value: 1024 },
    { label: "1920", value: 1920 }
  ];

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Tools</p>
        <h2 className="mt-2 text-3xl font-semibold">Image Lab</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Resize/export images, crop with a proper drag tool, and grab CSS-ready colors (including{" "}
          <span className="text-foreground">oklch()</span>) without leaving Portfolio OS.
        </p>
      </section>

      <section className="surface-elevated p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("resize")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition",
                tab === "resize" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"
              )}
            >
              <ImageIcon className="h-4 w-4" />
              Resizer / Export
            </button>

            <button
              type="button"
              onClick={() => setTab("crop")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition",
                tab === "crop" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"
              )}
            >
              <Scissors className="h-4 w-4" />
              Crop
            </button>

            <button
              type="button"
              onClick={() => setTab("color")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition",
                tab === "color" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"
              )}
            >
              <Palette className="h-4 w-4" />
              Color Picker
            </button>
          </div>

          <div className="inline-flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFileInputChange}
            />
            <button
              type="button"
              onClick={onChooseFiles}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              <Upload className="h-4 w-4" />
              Import images
            </button>
            <button
              type="button"
              onClick={cleanupUrls}
              disabled={items.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        {busy ? <p className="mt-3 text-xs text-muted-foreground">Working…</p> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]" onDrop={onDrop} onDragOver={onDragOver}>
        {/* LEFT */}
        <div className="surface-elevated accent-frame p-4">
          {tab !== "color" ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Queue</p>
                <p className="text-xs text-muted-foreground">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </p>
              </div>

              {items.length === 0 ? (
                <div className="surface-ghost flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 p-6 text-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-foreground">Drop images here</p>
                  <p className="text-xs text-muted-foreground">or use “Import images” above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((it) => {
                    const isActive = it.id === activeId;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => setActiveId(it.id)}
                        className={cn(
                          "w-full rounded-xl border border-border bg-background p-3 text-left transition",
                          "hover:bg-accent",
                          isActive && "bg-primary text-primary-foreground hover:bg-primary"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{it.name}</p>
                            <p className={cn("mt-1 text-xs", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                              {it.originalWidth}×{it.originalHeight}
                              {it.crop ? <span className="opacity-80"> • cropped</span> : null}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/70",
                              isActive ? "bg-primary-foreground/10" : "bg-card/40"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(it.id);
                            }}
                            title="Remove"
                            aria-label="Remove"
                            role="button"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* RESIZE CONTROLS */}
              {tab === "resize" ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Resize</p>
                    <div className="mt-2 grid gap-2">
                      <label className="text-xs text-muted-foreground">Mode</label>
                      <select
                        className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                        value={resizeMode}
                        onChange={(e) => setResizeMode(e.target.value as ResizeMode)}
                      >
                        <option value="longest">Longest edge</option>
                        <option value="scale">Scale %</option>
                        <option value="exact">Exact box</option>
                      </select>
                    </div>

                    <div className="mt-3 grid gap-3">
                      {resizeMode === "longest" ? (
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">Max edge</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                              value={longestEdge}
                              onChange={(e) => setLongestEdge(Number(e.target.value))}
                            />
                            <div className="flex gap-1">
                              {presets.map((p) => (
                                <button
                                  key={p.value}
                                  type="button"
                                  onClick={() => setLongestEdge(p.value)}
                                  className="h-10 rounded-xl border border-border bg-background px-2 text-xs text-muted-foreground transition hover:bg-accent"
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {resizeMode === "scale" ? (
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">Scale</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={1}
                              max={400}
                              value={scalePercent}
                              onChange={(e) => setScalePercent(Number(e.target.value))}
                              className="w-full"
                            />
                            <input
                              type="number"
                              min={1}
                              max={400}
                              value={scalePercent}
                              onChange={(e) => setScalePercent(Number(e.target.value))}
                              className="h-10 w-24 rounded-xl border border-border bg-background px-3 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                      ) : null}

                      {resizeMode === "exact" ? (
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">Box (contain)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              min={0}
                              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                              value={boxWidth}
                              onChange={(e) => setBoxWidth(Number(e.target.value))}
                              placeholder="Width"
                            />
                            <input
                              type="number"
                              min={0}
                              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                              value={boxHeight}
                              onChange={(e) => setBoxHeight(Number(e.target.value))}
                              placeholder="Height"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Tip: set one dimension to <span className="text-foreground">0</span> to lock the other.
                          </p>
                        </div>
                      ) : null}

                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={keepAspect} onChange={(e) => setKeepAspect(e.target.checked)} />
                        Keep aspect ratio
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={preventUpscale}
                          onChange={(e) => setPreventUpscale(e.target.checked)}
                        />
                        Don’t upscale
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Export</p>
                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-2">
                        <label className="text-xs text-muted-foreground">Format</label>
                        <select
                          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                          value={format}
                          onChange={(e) => setFormat(e.target.value as OutputFormat)}
                        >
                          <option value="png">PNG</option>
                          <option value="jpeg">JPG</option>
                          <option value="webp">WebP</option>
                        </select>
                      </div>

                      {format !== "png" ? (
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">Quality</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0.1}
                              max={1}
                              step={0.01}
                              value={quality}
                              onChange={(e) => setQuality(Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="w-12 text-right text-xs text-muted-foreground">{Math.round(quality * 100)}%</span>
                          </div>
                        </div>
                      ) : null}

                      {format === "jpeg" ? (
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">Background (JPG)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={jpegBackground}
                              onChange={(e) => setJpegBackground(e.target.value)}
                              className="h-10 w-10 rounded-xl border border-border bg-background p-1"
                            />
                            <input
                              type="text"
                              value={jpegBackground}
                              onChange={(e) => setJpegBackground(e.target.value)}
                              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={exportSelected}
                          disabled={!active || !targetSize || busy}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-primary px-3 py-2 text-sm text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
                        >
                          <Download className="h-4 w-4" />
                          Export selected
                        </button>
                        <button
                          type="button"
                          onClick={exportAll}
                          disabled={items.length === 0 || busy}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                        >
                          <Download className="h-4 w-4" />
                          Export all (batch)
                        </button>
                        <p className="text-xs text-muted-foreground">
                          Batch export triggers multiple downloads. Your browser may ask permission.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* CROP CONTROLS */}
              {tab === "crop" ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Crop</p>

                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-2">
                        <label className="text-xs text-muted-foreground">Aspect</label>
                        <select
                          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                          value={cropAspectPreset}
                          onChange={(e) => setCropAspectPreset(e.target.value as any)}
                        >
                          <option value="free">Free</option>
                          <option value="1:1">1:1</option>
                          <option value="16:9">16:9</option>
                          <option value="4:5">4:5</option>
                          <option value="3:2">3:2</option>
                          <option value="2:3">2:3</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      {cropAspectPreset === "custom" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min={1}
                            value={cropCustomW}
                            onChange={(e) => setCropCustomW(Number(e.target.value))}
                            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                            placeholder="W"
                          />
                          <input
                            type="number"
                            min={1}
                            value={cropCustomH}
                            onChange={(e) => setCropCustomH(Number(e.target.value))}
                            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                            placeholder="H"
                          />
                        </div>
                      ) : null}

                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={cropLockAspect}
                          onChange={(e) => setCropLockAspect(e.target.checked)}
                        />
                        Lock aspect ratio
                      </label>

                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={cropRuleOfThirds}
                          onChange={(e) => setCropRuleOfThirds(e.target.checked)}
                        />
                        Rule of thirds grid
                      </label>

                      <div className="grid gap-2 pt-2">
                        <button
                          type="button"
                          onClick={applyCrop}
                          disabled={!active || !draftCrop}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-primary px-3 py-2 text-sm text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
                        >
                          Apply crop
                        </button>
                        <button
                          type="button"
                          onClick={resetCrop}
                          disabled={!active}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                        >
                          Reset crop
                        </button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Drag inside the crop to move. Drag corners to resize.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            // COLOR PANEL (no queue required)
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Picker</p>

                <div className="mt-3 grid gap-3">
                  <SVPicker
                    hue={hue}
                    s={sv.s}
                    v={sv.v}
                    onChange={(next, commit) => {
                      setSv(next);
                      if (commit) pushRecentColor(formatsFromRGB(rgb.r, rgb.g, rgb.b));
                    }}
                  />

                  <div className="grid gap-2">
                    <label className="text-xs text-muted-foreground">Hue</label>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={hue}
                      onChange={(e) => setHue(Number(e.target.value))}
                      onMouseUp={() => pushRecentColor(pickedColor)}
                      onTouchEnd={() => pushRecentColor(pickedColor)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs text-muted-foreground">Hex</label>
                    <input
                      type="text"
                      value={pickedColor.hex}
                      onChange={(e) => {
                        const parsed = parseHex(e.target.value);
                        if (!parsed) return;
                        setFromRGB(parsed.r, parsed.g, parsed.b);
                      }}
                      onBlur={() => pushRecentColor(pickedColor)}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={pickScreenColor}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                  >
                    <Pipette className="h-4 w-4" />
                    Pick from screen
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Recent</p>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {recentColors.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      className="h-10 rounded-lg border border-border transition hover:scale-[1.02]"
                      style={{ backgroundColor: c.hex }}
                      onClick={() => {
                        const parsed = parseHex(c.hex);
                        if (!parsed) return;
                        setFromRGB(parsed.r, parsed.g, parsed.b, true);
                      }}
                      title={c.hex}
                      aria-label={`Use ${c.hex}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="surface-elevated accent-frame p-4">
          {tab === "color" ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border">
                <div className="h-40 w-full" style={{ backgroundColor: pickedColor.hex }} />
                <div className="border-t border-border bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">Current color</p>
                  <p className="mt-1 text-sm font-medium">{pickedColor.hex}</p>
                </div>
              </div>

              <div className="grid gap-2">
                {([
                  { label: "HEX", value: pickedColor.hex },
                  { label: "RGB", value: pickedColor.rgb },
                  { label: "HSL", value: pickedColor.hsl },
                  { label: "OKLCH", value: pickedColor.oklch }
                ] as const).map((entry) => (
                  <button
                    key={entry.label}
                    type="button"
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-left transition hover:bg-accent"
                    onClick={async () => {
                      const ok = await copyToClipboard(entry.value);
                      if (!ok) setError("Failed to copy color.");
                    }}
                  >
                    <span className="text-xs text-muted-foreground">{entry.label}</span>
                    <span className="truncate pl-3 text-sm">{entry.value}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : !active ? (
            <div className="surface-ghost flex min-h-90 items-center justify-center rounded-2xl border border-dashed border-border/70 p-6 text-center">
              <p className="text-sm text-muted-foreground">Import an image to start.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{active.name}</p>
                <p className="text-xs text-muted-foreground">
                  {targetSize ? `${targetSize.width}x${targetSize.height}` : `${active.originalWidth}x${active.originalHeight}`}
                </p>
              </div>

              <div className="surface-ghost rounded-2xl border border-border p-3">
                <div className="relative mx-auto w-fit max-w-full">
                  <img
                    ref={imgRef}
                    src={active.url}
                    alt={active.name}
                    className="max-h-[68vh] max-w-full rounded-xl object-contain select-none"
                    draggable={false}
                  />

                  {tab === "crop" && draftCrop ? (
                    <div className="absolute inset-0">
                      <div
                        className="absolute border-2 border-primary/90 bg-primary/15"
                        style={{
                          left: `${(draftCrop.x / (bitmapCache.current.get(active.id)?.width ?? active.originalWidth)) * 100}%`,
                          top: `${(draftCrop.y / (bitmapCache.current.get(active.id)?.height ?? active.originalHeight)) * 100}%`,
                          width: `${(draftCrop.w / (bitmapCache.current.get(active.id)?.width ?? active.originalWidth)) * 100}%`,
                          height: `${(draftCrop.h / (bitmapCache.current.get(active.id)?.height ?? active.originalHeight)) * 100}%`
                        }}
                        onPointerDown={(e) => startDrag("move", e)}
                        onPointerMove={onDragMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                      >
                        {cropRuleOfThirds ? (
                          <>
                            <div className="pointer-events-none absolute left-1/3 top-0 h-full w-px bg-white/50" />
                            <div className="pointer-events-none absolute left-2/3 top-0 h-full w-px bg-white/50" />
                            <div className="pointer-events-none absolute top-1/3 left-0 h-px w-full bg-white/50" />
                            <div className="pointer-events-none absolute top-2/3 left-0 h-px w-full bg-white/50" />
                          </>
                        ) : null}

                        <div
                          className="absolute -left-2 -top-2 h-4 w-4 cursor-nwse-resize rounded-full border border-white bg-primary shadow"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startDrag("nw", e);
                          }}
                          onPointerMove={onDragMove}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                        />
                        <div
                          className="absolute -right-2 -top-2 h-4 w-4 cursor-nesw-resize rounded-full border border-white bg-primary shadow"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startDrag("ne", e);
                          }}
                          onPointerMove={onDragMove}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                        />
                        <div
                          className="absolute -right-2 -bottom-2 h-4 w-4 cursor-nwse-resize rounded-full border border-white bg-primary shadow"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startDrag("se", e);
                          }}
                          onPointerMove={onDragMove}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                        />
                        <div
                          className="absolute -left-2 -bottom-2 h-4 w-4 cursor-nesw-resize rounded-full border border-white bg-primary shadow"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startDrag("sw", e);
                          }}
                          onPointerMove={onDragMove}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {tab === "crop" && draftCrop ? (
                <p className="text-xs text-muted-foreground">
                  Crop: {Math.round(draftCrop.w)}x{Math.round(draftCrop.h)} at {Math.round(draftCrop.x)},{Math.round(draftCrop.y)}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
