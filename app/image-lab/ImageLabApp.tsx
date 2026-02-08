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

type AspectPreset = "free" | "1:1" | "16:9" | "4:5" | "3:2" | "2:3" | "custom";
type NamingMode = "default" | "prefixSeq" | "numbersOnly";

type PresetState = {
  // resize/export
  resizeMode: ResizeMode;
  longestEdge: number;
  scalePercent: number;
  boxWidth: number;
  boxHeight: number;
  keepAspect: boolean;
  preventUpscale: boolean;
  format: OutputFormat;
  quality: number;
  jpegBackground: string;

  // auto-crop on export
  autoCropEnabled: boolean;
  autoCropAspectPreset: AspectPreset;
  autoCropCustomW: number;
  autoCropCustomH: number;

  // naming + zip
  useCustomNaming: boolean;
  namingMode: NamingMode;
  namePrefix: string;
  nameSuffix: string;
  seqStart: number;
  seqPad: number;
  includeDims: boolean;
  singleName: string;

  exportAsZip: boolean;
  zipName: string;
  zipFolder: string;
};

type UserPreset = {
  id: string;
  name: string;
  state: PresetState;
};

const PRESETS_STORAGE_KEY = "imagelab_presets_v1";
const LAST_PRESET_STORAGE_KEY = "imagelab_last_preset_v1";

type ColorFormats = {
  hex: string;
  rgb: string;
  hsl: string;
  oklch: string;
};

const IMAGELAB_SESSION_STORAGE_KEY = "imagelab_session_v1";
const IMAGELAB_DB_NAME = "imagelab_db_v1";
const IMAGELAB_DB_STORE = "images";

type StoredImageRecord = {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
};

type ImageLabSessionStateV1 = {
  version: 1;
  tab: "resize" | "crop" | "color";
  activeId: string;
  items: Array<{
    id: string;
    name: string;
    type: string;
    originalWidth: number;
    originalHeight: number;
    crop: CropRect | null;
  }>;

  // Resizer / Export
  resizeMode: ResizeMode;
  longestEdge: number;
  scalePercent: number;
  boxWidth: number;
  boxHeight: number;
  keepAspect: boolean;
  preventUpscale: boolean;
  format: OutputFormat;
  quality: number;
  jpegBackground: string;

  autoCropEnabled: boolean;
  autoCropAspectPreset: AspectPreset;
  autoCropCustomW: number;
  autoCropCustomH: number;

  exportAsZip: boolean;
  zipName: string;
  zipFolder: string;

  useCustomNaming: boolean;
  namingMode: NamingMode;
  namePrefix: string;
  nameSuffix: string;
  seqStart: number;
  seqPad: number;
  includeDims: boolean;
  singleName: string;

  // Crop tool
  cropAspectPreset: AspectPreset;
  cropCustomW: number;
  cropCustomH: number;
  cropLockAspect: boolean;
  cropRuleOfThirds: boolean;
  draftCropMap: Record<string, CropRect>;

  // Color picker
  hue: number;
  sv: { s: number; v: number };
  recentColors: ColorFormats[];

  // UI / presets
  selectedPresetId: string;
  isCustomizeOpen: boolean;
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// ---- Persistence (IndexedDB) ----
function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

function idbTxDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

async function imagelabOpenDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this browser.");
  }

  return await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(IMAGELAB_DB_NAME, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMAGELAB_DB_STORE)) {
        db.createObjectStore(IMAGELAB_DB_STORE, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function imagelabPutImage(db: IDBDatabase, rec: StoredImageRecord): Promise<void> {
  const tx = db.transaction(IMAGELAB_DB_STORE, "readwrite");
  tx.objectStore(IMAGELAB_DB_STORE).put(rec);
  await idbTxDone(tx);
}

async function imagelabGetImage(db: IDBDatabase, id: string): Promise<StoredImageRecord | null> {
  const tx = db.transaction(IMAGELAB_DB_STORE, "readonly");
  const rec = await idbRequest<StoredImageRecord | undefined>(tx.objectStore(IMAGELAB_DB_STORE).get(id));
  await idbTxDone(tx);
  return (rec as any) ?? null;
}

async function imagelabDeleteImage(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction(IMAGELAB_DB_STORE, "readwrite");
  tx.objectStore(IMAGELAB_DB_STORE).delete(id);
  await idbTxDone(tx);
}

async function imagelabClearImages(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(IMAGELAB_DB_STORE, "readwrite");
  tx.objectStore(IMAGELAB_DB_STORE).clear();
  await idbTxDone(tx);
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

function safePathPart(input: string) {
  // allow a folder-ish path for zips, but keep it safe/portable
  return input
    .trim()
    .replace(/^[\/]+|[\/]+$/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/[^a-zA-Z0-9 _./-]/g, "")
    .replace(/[\s]+/g, " ")
    .replace(/[ ]/g, "-");
}

function safeBaseName(filename: string) {
  const base = filename.replace(/\.[^/.]+$/, "");
  return safePathPart(base).replace(/[\/]/g, "-") || "image";
}

function ensureExt(nameOrBase: string, fmt: OutputFormat) {
  const ext = extForFormat(fmt);
  return /\.[a-z0-9]+$/i.test(nameOrBase) ? nameOrBase : `${nameOrBase}.${ext}`;
}

function padSeq(n: number, pad: number) {
  const p = clamp(Math.round(pad), 1, 8);
  return String(Math.max(0, Math.floor(n))).padStart(p, "0");
}

function buildExportFilename(args: {
  itemName: string;
  index: number;
  size: { width: number; height: number };
  format: OutputFormat;
  useCustomNaming: boolean;
  namingMode: NamingMode;
  namePrefix: string;
  nameSuffix: string;
  seqStart: number;
  seqPad: number;
  includeDims: boolean;
  singleName: string;
  isSingle: boolean;
}) {
  const {
    itemName,
    index,
    size,
    format,
    useCustomNaming,
    namingMode,
    namePrefix,
    nameSuffix,
    seqStart,
    seqPad,
    includeDims,
    singleName,
    isSingle
  } = args;

  const ext = extForFormat(format);

  if (isSingle && singleName.trim().length > 0) {
    return ensureExt(safePathPart(singleName.trim()), format);
  }

  const base = safeBaseName(itemName);

  if (!useCustomNaming || namingMode === "default") {
    return `${base}-${size.width}x${size.height}.${ext}`;
  }

  const seq = padSeq(seqStart + index, seqPad);
  const suffix = nameSuffix.trim() ? `-${safePathPart(nameSuffix.trim())}` : "";
  const dims = includeDims ? `-${size.width}x${size.height}` : "";

  if (namingMode === "numbersOnly") {
    return `${seq}${suffix}${dims}.${ext}`;
  }

  // prefixSeq
  const prefix = namePrefix.trim().length > 0 ? safePathPart(namePrefix.trim()) : base;
  return `${prefix}${suffix}-${seq}${dims}.${ext}`;
}

function centerCropToAspect(imgW: number, imgH: number, ratio: number): CropRect {
  const imgRatio = imgW / imgH;
  if (Math.abs(imgRatio - ratio) < 1e-6) return { x: 0, y: 0, w: imgW, h: imgH };

  if (imgRatio > ratio) {
    const w = Math.round(imgH * ratio);
    const x = Math.round((imgW - w) / 2);
    return { x, y: 0, w, h: imgH };
  }

  const h = Math.round(imgW / ratio);
  const y = Math.round((imgH - h) / 2);
  return { x: 0, y, w: imgW, h };
}

// ---- Minimal ZIP builder (stored/no-compress) ----
// Images are already compressed (webp/png/jpg), so "stored" zips are usually fine.
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC32_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function u16(n: number) {
  const v = n & 0xFFFF;
  return new Uint8Array([v & 0xFF, (v >>> 8) & 0xFF]);
}

function u32(n: number) {
  const v = n >>> 0;
  return new Uint8Array([v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]);
}

function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function dosDateTime(d = new Date()) {
  const year = Math.max(1980, d.getFullYear());
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();

  const dosTime = ((hours & 0x1F) << 11) | ((minutes & 0x3F) << 5) | ((Math.floor(seconds / 2)) & 0x1F);
  const dosDate = (((year - 1980) & 0x7F) << 9) | ((month & 0x0F) << 5) | (day & 0x1F);

  return { dosTime, dosDate };
}

async function blobToU8(blob: Blob) {
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

function buildZip(files: Array<{ path: string; data: Uint8Array }>) {
  const enc = new TextEncoder();
  const dt = dosDateTime();

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];

  let localOffset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.path);
    const c = crc32(f.data);
    const size = f.data.length;

    // Local file header
    const localHeader = concatBytes([
      u32(0x04034b50),
      u16(20),          // version needed
      u16(0x0800),      // UTF-8
      u16(0),           // method: store
      u16(dt.dosTime),
      u16(dt.dosDate),
      u32(c),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      nameBytes
    ]);

    localParts.push(localHeader, f.data);

    // Central directory header
    const centralHeader = concatBytes([
      u32(0x02014b50),
      u16(20),          // version made by
      u16(20),          // version needed
      u16(0x0800),      // UTF-8
      u16(0),
      u16(dt.dosTime),
      u16(dt.dosDate),
      u32(c),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(localOffset),
      nameBytes
    ]);

    centralParts.push(centralHeader);

    localOffset += localHeader.length + size;
  }

  const centralDir = concatBytes(centralParts);
  const centralOffset = localOffset;

  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(centralOffset),
    u16(0)
  ]);

  return concatBytes([...localParts, centralDir, end]);
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
  if (!dt) return false;
  if (dt.files && dt.files.length > 0) return true;
  // During drag-over some browsers expose files via `types` but keep `files` empty.
  const types = Array.from(dt.types ?? []);
  return types.includes("Files") || types.includes("application/x-moz-file");
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
  const dbRef = useRef<IDBDatabase | null>(null);
  const dbOpeningRef = useRef<Promise<IDBDatabase> | null>(null);
  const didRestoreSessionRef = useRef(false);
  const restorePhaseRef = useRef<"pending" | "done">("pending");
  const latestSessionRef = useRef<ImageLabSessionStateV1 | null>(null);
  const sessionSaveTimeoutRef = useRef<number | null>(null);

  const ensureDb = useCallback(async () => {
      let didSetBusy = false;
    if (dbRef.current) return dbRef.current;
    if (!dbOpeningRef.current) dbOpeningRef.current = imagelabOpenDb();
    dbRef.current = await dbOpeningRef.current;
    return dbRef.current;
  }, []);


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


  // workflow helpers
  const [autoCropEnabled, setAutoCropEnabled] = useState(false);
  const [autoCropAspectPreset, setAutoCropAspectPreset] = useState<AspectPreset>("16:9");
  const [autoCropCustomW, setAutoCropCustomW] = useState(16);
  const [autoCropCustomH, setAutoCropCustomH] = useState(9);

  const [exportAsZip, setExportAsZip] = useState(false);
  const [zipName, setZipName] = useState("imagelab-export.zip");
  const [zipFolder, setZipFolder] = useState("");

  const [useCustomNaming, setUseCustomNaming] = useState(false);
  const [namingMode, setNamingMode] = useState<NamingMode>("default");
  const [namePrefix, setNamePrefix] = useState("");
  const [nameSuffix, setNameSuffix] = useState("");
  const [seqStart, setSeqStart] = useState(1);
  const [seqPad, setSeqPad] = useState(2);
  const [includeDims, setIncludeDims] = useState(false);
  const [singleName, setSingleName] = useState("");

  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("builtin:custom");
  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(true);
  const [presetNameDraft, setPresetNameDraft] = useState("");

  const isApplyingPresetRef = useRef<boolean>(false);
  const baselinePresetStateRef = useRef<string | null>(null);

  // crop tool
  const [cropAspectPreset, setCropAspectPreset] = useState<AspectPreset>("free");
  const [cropCustomW, setCropCustomW] = useState(4);
  const [cropCustomH, setCropCustomH] = useState(3);
  const [cropLockAspect, setCropLockAspect] = useState(true);
  const [cropRuleOfThirds, setCropRuleOfThirds] = useState(true);
  const [draftCrop, setDraftCrop] = useState<CropRect | null>(null);
  const [draftCropMap, setDraftCropMap] = useState<Record<string, CropRect>>({});
  const draftCropMapRef = useRef<Record<string, CropRect>>({});
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // figma-ish color picker
  const [hue, setHue] = useState(200);
  const [sv, setSv] = useState({ s: 0.6, v: 0.75 });
  const [recentColors, setRecentColors] = useState<ColorFormats[]>([]);

  // ---- Session restore (keeps your queue + settings when you navigate away) ----
  useEffect(() => {
    let cancelled = false;

    restorePhaseRef.current = "pending";

    (async () => {
      let didSetBusy = false;

      try {
        const raw = localStorage.getItem(IMAGELAB_SESSION_STORAGE_KEY);
        if (!raw) return;

        const session = JSON.parse(raw) as ImageLabSessionStateV1;
        if (!session || session.version !== 1) return;

        didRestoreSessionRef.current = true;

        const db = await ensureDb();
        setBusy(true);
        didSetBusy = true;

        // Clear any existing runtime caches (should be empty on first mount, but safe anyway)
        bitmapCache.current.forEach((bmp) => bmp.close());
        bitmapCache.current.clear();
        for (const it of itemsRef.current) {
          try {
            URL.revokeObjectURL(it.url);
          } catch {
            // ignore
          }
        }

        const nextItems: ImageItem[] = [];
        const metas = Array.isArray(session.items) ? session.items : [];

        for (const meta of metas) {
          const rec = await imagelabGetImage(db, meta.id);
          if (!rec) continue;

          const blob = rec.blob;
          const bitmap = await createImageBitmap(blob);
          bitmapCache.current.set(meta.id, bitmap);

          const url = URL.createObjectURL(blob);
          const file = new File([blob], rec.name || meta.name, {
            type: rec.type || meta.type || "image/png",
            lastModified: rec.lastModified || Date.now()
          });

          nextItems.push({
            id: meta.id,
            file,
            url,
            name: rec.name || meta.name,
            originalWidth: bitmap.width,
            originalHeight: bitmap.height,
            type: rec.type || meta.type,
            crop: meta.crop ?? null
          });
        }

        if (cancelled) return;

        if (nextItems.length === 0) {
          try {
            localStorage.removeItem(IMAGELAB_SESSION_STORAGE_KEY);
          } catch {
            // ignore
          }
          return;
        }

        didRestoreSessionRef.current = true;

        setTab(session.tab ?? "resize");
        setItems(nextItems);
        setActiveId(nextItems.some((it) => it.id === session.activeId) ? session.activeId : nextItems[0].id);

        // Resizer / Export
        setResizeMode(session.resizeMode ?? "longest");
        setLongestEdge(typeof session.longestEdge === "number" ? session.longestEdge : 1024);
        setScalePercent(typeof session.scalePercent === "number" ? session.scalePercent : 50);
        setBoxWidth(typeof session.boxWidth === "number" ? session.boxWidth : 1024);
        setBoxHeight(typeof session.boxHeight === "number" ? session.boxHeight : 1024);
        setKeepAspect(typeof session.keepAspect === "boolean" ? session.keepAspect : true);
        setPreventUpscale(typeof session.preventUpscale === "boolean" ? session.preventUpscale : true);
        setFormat(session.format ?? "png");
        setQuality(typeof session.quality === "number" ? session.quality : 0.9);
        setJpegBackground(typeof session.jpegBackground === "string" ? session.jpegBackground : "#0B1220");

        // Workflow helpers
        setAutoCropEnabled(!!session.autoCropEnabled);
        setAutoCropAspectPreset(session.autoCropAspectPreset ?? "16:9");
        setAutoCropCustomW(typeof session.autoCropCustomW === "number" ? session.autoCropCustomW : 16);
        setAutoCropCustomH(typeof session.autoCropCustomH === "number" ? session.autoCropCustomH : 9);

        setExportAsZip(!!session.exportAsZip);
        setZipName(typeof session.zipName === "string" ? session.zipName : "imagelab-export.zip");
        setZipFolder(typeof session.zipFolder === "string" ? session.zipFolder : "");

        setUseCustomNaming(!!session.useCustomNaming);
        setNamingMode(session.namingMode ?? "default");
        setNamePrefix(typeof session.namePrefix === "string" ? session.namePrefix : "");
        setNameSuffix(typeof session.nameSuffix === "string" ? session.nameSuffix : "");
        setSeqStart(typeof session.seqStart === "number" ? session.seqStart : 1);
        setSeqPad(typeof session.seqPad === "number" ? session.seqPad : 2);
        setIncludeDims(!!session.includeDims);
        setSingleName(typeof session.singleName === "string" ? session.singleName : "");

        // Crop tool
        setCropAspectPreset(session.cropAspectPreset ?? "free");
        setCropCustomW(typeof session.cropCustomW === "number" ? session.cropCustomW : 4);
        setCropCustomH(typeof session.cropCustomH === "number" ? session.cropCustomH : 3);
        setCropLockAspect(typeof session.cropLockAspect === "boolean" ? session.cropLockAspect : true);
        setCropRuleOfThirds(typeof session.cropRuleOfThirds === "boolean" ? session.cropRuleOfThirds : true);
        setDraftCropMap(session.draftCropMap && typeof session.draftCropMap === "object" ? session.draftCropMap : {});

        // Color picker
        setHue(typeof session.hue === "number" ? session.hue : 200);
        setSv(session.sv && typeof session.sv === "object" ? session.sv : { s: 0.6, v: 0.75 });
        setRecentColors(Array.isArray(session.recentColors) ? session.recentColors : []);

        // UI / presets
        setSelectedPresetId(typeof session.selectedPresetId === "string" ? session.selectedPresetId : "builtin:custom");
        setIsCustomizeOpen(!!session.isCustomizeOpen);
      } catch {
        // ignore
      } finally {
        restorePhaseRef.current = "done";
        if (!cancelled && didSetBusy) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ensureDb]);

  const active = useMemo(() => items.find((i) => i.id === activeId) ?? null, [items, activeId]);

  const effectiveSourceRect = useMemo<CropRect | null>(() => {
    if (!active) return null;
    const bmp = bitmapCache.current.get(active.id);
    const w = bmp?.width ?? active.originalWidth;
    const h = bmp?.height ?? active.originalHeight;

    if (active.crop) return clampCrop(active.crop, w, h);

    if (autoCropEnabled) {
      const ratio = aspectForPreset(autoCropAspectPreset, autoCropCustomW, autoCropCustomH);
      if (ratio) return clampCrop(centerCropToAspect(w, h, ratio), w, h);
    }

    return { x: 0, y: 0, w, h };
  }, [active, autoCropEnabled, autoCropAspectPreset, autoCropCustomW, autoCropCustomH]);

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

  const sessionState = useMemo<ImageLabSessionStateV1>(
    () => ({
      version: 1,
      tab,
      activeId,
      items: items.map((it) => ({
        id: it.id,
        name: it.name,
        type: it.type,
        originalWidth: it.originalWidth,
        originalHeight: it.originalHeight,
        crop: it.crop
      })),

      resizeMode,
      longestEdge,
      scalePercent,
      boxWidth,
      boxHeight,
      keepAspect,
      preventUpscale,
      format,
      quality,
      jpegBackground,

      autoCropEnabled,
      autoCropAspectPreset,
      autoCropCustomW,
      autoCropCustomH,

      exportAsZip,
      zipName,
      zipFolder,

      useCustomNaming,
      namingMode,
      namePrefix,
      nameSuffix,
      seqStart,
      seqPad,
      includeDims,
      singleName,

      cropAspectPreset,
      cropCustomW,
      cropCustomH,
      cropLockAspect,
      cropRuleOfThirds,
      draftCropMap,

      hue,
      sv,
      recentColors,

      selectedPresetId,
      isCustomizeOpen
    }),
    [
      tab,
      activeId,
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
      jpegBackground,
      autoCropEnabled,
      autoCropAspectPreset,
      autoCropCustomW,
      autoCropCustomH,
      exportAsZip,
      zipName,
      zipFolder,
      useCustomNaming,
      namingMode,
      namePrefix,
      nameSuffix,
      seqStart,
      seqPad,
      includeDims,
      singleName,
      cropAspectPreset,
      cropCustomW,
      cropCustomH,
      cropLockAspect,
      cropRuleOfThirds,
      draftCropMap,
      hue,
      sv,
      recentColors,
      selectedPresetId,
      isCustomizeOpen
    ]
  );


  // Keep refs in sync for unmount flush (route changes can happen before effects run)
  latestSessionRef.current = sessionState;
  itemsRef.current = items;
  draftCropMapRef.current = draftCropMap;

  const flushSessionToStorage = useCallback(() => {
    try {
      const s = latestSessionRef.current;
      if (!s) return;

      if (itemsRef.current.length === 0) {
        // In React Strict Mode, mount effects are intentionally torn down once.
        // Don't clear a valid saved session before restore has completed.
        if (restorePhaseRef.current !== "done") return;
        localStorage.removeItem(IMAGELAB_SESSION_STORAGE_KEY);
        return;
      }

      localStorage.setItem(IMAGELAB_SESSION_STORAGE_KEY, JSON.stringify(s));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Avoid wiping the saved session before restore has had a chance to run (React Strict Mode double-mount etc.)
    if (restorePhaseRef.current !== "done") return;

    if (items.length === 0) {
      try {
        localStorage.removeItem(IMAGELAB_SESSION_STORAGE_KEY);
      } catch {
        // ignore
      }
      return;
    }

    if (sessionSaveTimeoutRef.current) {
      window.clearTimeout(sessionSaveTimeoutRef.current);
    }

    sessionSaveTimeoutRef.current = window.setTimeout(() => {
      flushSessionToStorage();
    }, 200);

    return () => {
      if (sessionSaveTimeoutRef.current) {
        window.clearTimeout(sessionSaveTimeoutRef.current);
      }
    };
  }, [items.length, sessionState, flushSessionToStorage]);

  useEffect(() => {
    const onPageHide = () => flushSessionToStorage();
    const onVis = () => {
      if (document.visibilityState === "hidden") flushSessionToStorage();
    };

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [flushSessionToStorage]);

  useEffect(() => {
    return () => {
      // On route change, the component unmounts — flush immediately.
      if (sessionSaveTimeoutRef.current) {
        window.clearTimeout(sessionSaveTimeoutRef.current);
      }
      flushSessionToStorage();
    };
  }, [flushSessionToStorage]);


  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    draftCropMapRef.current = draftCropMap;
  }, [draftCropMap]);

  useEffect(() => {
    if (tab !== "crop") return;
    if (!activeId) return;
    if (!draftCrop) return;

    setDraftCropMap((prev) => {
      const current = prev[activeId];
      if (current && current.x === draftCrop.x && current.y === draftCrop.y && current.w === draftCrop.w && current.h === draftCrop.h) {
        return prev;
      }
      return { ...prev, [activeId]: draftCrop };
    });
  }, [tab, activeId, draftCrop]);

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
    setDraftCropMap({});

    try {
      localStorage.removeItem(IMAGELAB_SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }

    ensureDb()
      .then((db) => imagelabClearImages(db))
      .catch(() => {
        // ignore
      });
  }, [ensureDb]);

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

      let db: IDBDatabase | null = null;
      try {
        db = await ensureDb();
      } catch {
        // persistence is optional
      }

      for (const file of incoming) {
        const id = uid();
        const url = URL.createObjectURL(file);
        const bitmap = await fileToImageBitmap(file);
        bitmapCache.current.set(id, bitmap);
        if (db) {
          await imagelabPutImage(db, {
            id,
            blob: file,
            name: file.name,
            type: file.type || "image/png",
            lastModified: file.lastModified || Date.now()
          });
        }
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
  }, [ensureDb]);

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
    evt.stopPropagation();
    if (!evt.dataTransfer?.files?.length) return;
    await ingestFiles(evt.dataTransfer.files);
  };

  const onDragOver = (evt: React.DragEvent) => {
    if (!isDropEventWithFiles(evt)) return;
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
  };

  const removeItem = (id: string) => {
    setDraftCropMap((prev) => {
      if (!(id in prev)) return prev;
      const nextMap = { ...prev };
      delete nextMap[id];
      return nextMap;
    });

    ensureDb()
      .then((db) => imagelabDeleteImage(db, id))
      .catch(() => {
        // ignore
      });

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
    const saved = draftCropMapRef.current[active.id];
    const base = saved ?? active.crop ?? { x: 0, y: 0, w: imgW, h: imgH };
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

      try {
        const db = await ensureDb();
        await imagelabPutImage(db, {
          id: active.id,
          blob,
          name: nextFile.name,
          type: blob.type || outputType,
          lastModified: nextFile.lastModified || Date.now()
        });
      } catch {
        // persistence is optional
      }

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
  }, [active, draftCrop, ensureDb]);

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
  }, [active, draftCrop, ensureDb]);

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

  const src: CropRect = (() => {
    if (active.crop) return clampCrop(active.crop, bitmap.width, bitmap.height);

    if (autoCropEnabled) {
      const ratio = aspectForPreset(autoCropAspectPreset, autoCropCustomW, autoCropCustomH);
      if (ratio) return clampCrop(centerCropToAspect(bitmap.width, bitmap.height, ratio), bitmap.width, bitmap.height);
    }

    return { x: 0, y: 0, w: bitmap.width, h: bitmap.height };
  })();

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

    const filename = buildExportFilename({
      itemName: active.name,
      index: 0,
      size: targetSize,
      format,
      useCustomNaming,
      namingMode,
      namePrefix,
      nameSuffix,
      seqStart,
      seqPad,
      includeDims,
      singleName,
      isSingle: true
    });

    if (exportAsZip) {
      const folder = safePathPart(zipFolder);
      const zipBase = zipName.trim().length
        ? safePathPart(zipName.trim().replace(/\.zip$/i, ""))
        : "imagelab-export";
      const zipFile = `${zipBase}.zip`;

      const path = folder ? `${folder}/${filename}` : filename;
      const data = await blobToU8(blob);
      const zipBytes = buildZip([{ path, data }]);
      downloadBlob(zipFile, new Blob([zipBytes], { type: "application/zip" }));
    } else {
      downloadBlob(filename, blob);
    }
  } catch (e) {
    setError(e instanceof Error ? e.message : "Export failed");
  } finally {
    setBusy(false);
  }
}, [
  active,
  targetSize,
  format,
  quality,
  jpegBackground,
  autoCropEnabled,
  autoCropAspectPreset,
  autoCropCustomW,
  autoCropCustomH,
  useCustomNaming,
  namingMode,
  namePrefix,
  nameSuffix,
  seqStart,
  seqPad,
  includeDims,
  singleName,
  exportAsZip,
  zipName,
  zipFolder
]);

const exportAll = useCallback(async () => {
  if (items.length === 0) return;
  setBusy(true);
  setError(null);
  try {
    const folder = safePathPart(zipFolder);
    const zipBase = zipName.trim().length
      ? safePathPart(zipName.trim().replace(/\.zip$/i, ""))
      : "imagelab-export";
    const zipFile = `${zipBase}.zip`;

    const zipFiles: Array<{ path: string; data: Uint8Array }> = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const bmp = bitmapCache.current.get(it.id);
      if (!bmp) continue;

      const src: CropRect = (() => {
        if (it.crop) return clampCrop(it.crop, bmp.width, bmp.height);

        if (autoCropEnabled) {
          const ratio = aspectForPreset(autoCropAspectPreset, autoCropCustomW, autoCropCustomH);
          if (ratio) return clampCrop(centerCropToAspect(bmp.width, bmp.height, ratio), bmp.width, bmp.height);
        }

        return { x: 0, y: 0, w: bmp.width, h: bmp.height };
      })();

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

      const filename = buildExportFilename({
        itemName: it.name,
        index: i,
        size,
        format,
        useCustomNaming,
        namingMode,
        namePrefix,
        nameSuffix,
        seqStart,
        seqPad,
        includeDims,
        singleName,
        isSingle: false
      });

      if (exportAsZip) {
        const data = await blobToU8(blob);
        zipFiles.push({ path: folder ? `${folder}/${filename}` : filename, data });
      } else {
        downloadBlob(filename, blob);
        await new Promise((r) => setTimeout(r, 160));
      }
    }

    if (exportAsZip) {
      const zipBytes = buildZip(zipFiles);
      downloadBlob(zipFile, new Blob([zipBytes], { type: "application/zip" }));
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
  jpegBackground,
  autoCropEnabled,
  autoCropAspectPreset,
  autoCropCustomW,
  autoCropCustomH,
  useCustomNaming,
  namingMode,
  namePrefix,
  nameSuffix,
  seqStart,
  seqPad,
  includeDims,
  singleName,
  exportAsZip,
  zipName,
  zipFolder
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


  const capturePresetState = useCallback((): PresetState => {
    return {
      resizeMode,
      longestEdge,
      scalePercent,
      boxWidth,
      boxHeight,
      keepAspect,
      preventUpscale,
      format,
      quality,
      jpegBackground,
      autoCropEnabled,
      autoCropAspectPreset,
      autoCropCustomW,
      autoCropCustomH,
      useCustomNaming,
      namingMode,
      namePrefix,
      nameSuffix,
      seqStart,
      seqPad,
      includeDims,
      singleName,
      exportAsZip,
      zipName,
      zipFolder
    };
  }, [
    resizeMode,
    longestEdge,
    scalePercent,
    boxWidth,
    boxHeight,
    keepAspect,
    preventUpscale,
    format,
    quality,
    jpegBackground,
    autoCropEnabled,
    autoCropAspectPreset,
    autoCropCustomW,
    autoCropCustomH,
    useCustomNaming,
    namingMode,
    namePrefix,
    nameSuffix,
    seqStart,
    seqPad,
    includeDims,
    singleName,
    exportAsZip,
    zipName,
    zipFolder
  ]);

  const applyPresetState = useCallback((s: PresetState) => {
    setResizeMode(s.resizeMode);
    setLongestEdge(s.longestEdge);
    setScalePercent(s.scalePercent);
    setBoxWidth(s.boxWidth);
    setBoxHeight(s.boxHeight);
    setKeepAspect(s.keepAspect);
    setPreventUpscale(s.preventUpscale);
    setFormat(s.format);
    setQuality(s.quality);
    setJpegBackground(s.jpegBackground);

    setAutoCropEnabled(s.autoCropEnabled);
    setAutoCropAspectPreset(s.autoCropAspectPreset);
    setAutoCropCustomW(s.autoCropCustomW);
    setAutoCropCustomH(s.autoCropCustomH);

    setUseCustomNaming(s.useCustomNaming);
    setNamingMode(s.namingMode);
    setNamePrefix(s.namePrefix);
    setNameSuffix(s.nameSuffix);
    setSeqStart(s.seqStart);
    setSeqPad(s.seqPad);
    setIncludeDims(s.includeDims);
    setSingleName(s.singleName);

    setExportAsZip(s.exportAsZip);
    setZipName(s.zipName);
    setZipFolder(s.zipFolder);
  }, []);

  const builtinPresets = useMemo(() => {
    const cover: PresetState = {
      resizeMode: "exact",
      longestEdge: 1600,
      scalePercent: 100,
      boxWidth: 1600,
      boxHeight: 900,
      keepAspect: false,
      preventUpscale: false,
      format: "webp",
      quality: 0.82,
      jpegBackground,
      autoCropEnabled: true,
      autoCropAspectPreset: "16:9",
      autoCropCustomW: 16,
      autoCropCustomH: 9,
      useCustomNaming,
      namingMode,
      namePrefix,
      nameSuffix,
      seqStart,
      seqPad,
      includeDims,
      singleName: "cover",
      exportAsZip,
      zipName,
      zipFolder
    };

    const gallery: PresetState = {
      resizeMode: "longest",
      longestEdge: 1600,
      scalePercent: 100,
      boxWidth,
      boxHeight,
      keepAspect: true,
      preventUpscale: true,
      format: "webp",
      quality: 0.8,
      jpegBackground,
      autoCropEnabled: false,
      autoCropAspectPreset,
      autoCropCustomW,
      autoCropCustomH,
      useCustomNaming: true,
      namingMode: "numbersOnly",
      namePrefix,
      nameSuffix: "",
      seqStart: 1,
      seqPad: 2,
      includeDims: false,
      singleName: "",
      exportAsZip: true,
      zipName,
      zipFolder
    };

    return [
      { id: "builtin:custom", name: "Custom (leave as-is)", state: null as PresetState | null },
      { id: "builtin:cover", name: "Cover — 1600×900, WebP, center-crop 16:9", state: cover },
      { id: "builtin:gallery", name: "Gallery — 1600px max edge, WebP, zipped", state: gallery }
    ];
  }, [
    jpegBackground,
    useCustomNaming,
    namingMode,
    namePrefix,
    nameSuffix,
    seqStart,
    seqPad,
    includeDims,
    exportAsZip,
    zipName,
    zipFolder,
    autoCropAspectPreset,
    autoCropCustomW,
    autoCropCustomH,
    boxWidth,
    boxHeight
  ]);

  const applySelectedPreset = useCallback((id: string) => {
    setSelectedPresetId(id);

    // Auto-collapse advanced controls when picking a preset (except Custom)
    setIsCustomizeOpen(id === "builtin:custom");

    if (id === "builtin:custom") {
      baselinePresetStateRef.current = null;
      return;
    }

    const builtin = builtinPresets.find((p) => p.id === id);
    const user = userPresets.find((p) => p.id === id);
    const state = builtin?.state ?? user?.state;

    if (state) {
      isApplyingPresetRef.current = true;
      baselinePresetStateRef.current = JSON.stringify(state);
      applyPresetState(state);

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          isApplyingPresetRef.current = false;
        }, 0);
      } else {
        isApplyingPresetRef.current = false;
      }
    }
  }, [applyPresetState, builtinPresets, userPresets]);


  
  const selectedPresetName = useMemo(() => {
    const builtin = builtinPresets.find((p) => p.id === selectedPresetId)?.name;
    if (builtin) return builtin;
    const user = userPresets.find((p) => p.id === selectedPresetId)?.name;
    if (user) return user;
    return "Custom";
  }, [builtinPresets, selectedPresetId, userPresets]);

  const selectedPresetLabel = useMemo(() => {
    if (selectedPresetId === "builtin:cover") return "Cover";
    if (selectedPresetId === "builtin:gallery") return "Gallery";
    if (selectedPresetId === "builtin:custom") return "Custom";
    const user = userPresets.find((p) => p.id === selectedPresetId);
    return user ? user.name : "Custom";
  }, [selectedPresetId, userPresets]);

  const presetSummary = useMemo(() => {
    const fmt = format === "jpeg" ? "JPG" : format.toUpperCase();
    const q = format === "png" ? "" : ` @ ${Math.round(quality * 100)}%`;
    const output = `${fmt}${q}`;

    let resize = "As-is";
    if (resizeMode === "longest") resize = `Max edge ${longestEdge}px`;
    if (resizeMode === "scale") resize = `Scale ${scalePercent}%`;
    if (resizeMode === "exact") {
      const mode = keepAspect ? "contain" : "exact";
      resize = `Exact ${boxWidth}×${boxHeight} (${mode})`;
    }
    if (preventUpscale) resize += " • no upscale";

    const crop =
      autoCropEnabled
        ? `Auto ${autoCropAspectPreset === "custom" ? `${autoCropCustomW}:${autoCropCustomH}` : autoCropAspectPreset}`
        : "Manual only";

    let naming = "Default";
    if (useCustomNaming) {
      if (singleName.trim()) naming = `Single: ${singleName.trim()}`;
      else if (namingMode === "numbersOnly") naming = `01….${extForFormat(format)}`;
      else if (namingMode === "prefixSeq") naming = `${(namePrefix || "img").trim()} 01….${extForFormat(format)}`;
      else naming = includeDims ? "Default + dims" : "Default";
    }

    const download = exportAsZip
      ? `ZIP${zipFolder.trim() ? ` → ${zipFolder.trim()}/` : ""}`
      : "Batch (multi-download)";

    return { output, resize, crop, naming, download };
  }, [
    autoCropAspectPreset,
    autoCropCustomH,
    autoCropCustomW,
    autoCropEnabled,
    boxHeight,
    boxWidth,
    exportAsZip,
    format,
    includeDims,
    keepAspect,
    longestEdge,
    namePrefix,
    namingMode,
    preventUpscale,
    quality,
    resizeMode,
    scalePercent,
    singleName,
    useCustomNaming,
    zipFolder
  ]);

  const currentPresetStateStr = useMemo(() => JSON.stringify(capturePresetState()), [capturePresetState]);

  useEffect(() => {
    if (selectedPresetId === "builtin:custom") return;
    if (isApplyingPresetRef.current) return;

    const baseline = baselinePresetStateRef.current;
    if (!baseline) return;

    if (currentPresetStateStr !== baseline) {
      setSelectedPresetId("builtin:custom");
      baselinePresetStateRef.current = null;
      setIsCustomizeOpen(true);
    }
  }, [currentPresetStateStr, selectedPresetId]);
const savePreset = useCallback(() => {
    const name = presetNameDraft.trim();
    if (!name) return;
    const state = capturePresetState();

    setUserPresets((prev) => {
      const existing = prev.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return prev.map((p) => (p.id === existing.id ? { ...p, name, state } : p));
      }
      return [...prev, { id: uid(), name, state }];
    });
  }, [presetNameDraft, capturePresetState]);

  const deletePreset = useCallback(() => {
    if (selectedPresetId.startsWith("builtin:")) return;
    setUserPresets((prev) => prev.filter((p) => p.id !== selectedPresetId));
    setSelectedPresetId("builtin:custom");
    baselinePresetStateRef.current = null;
    setIsCustomizeOpen(true);
  }, [selectedPresetId]);




  // Load saved presets + last selection
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
      let parsed: UserPreset[] = [];
      if (raw) {
        const maybe = JSON.parse(raw) as UserPreset[];
        if (Array.isArray(maybe)) {
          parsed = maybe;
          setUserPresets(maybe);
        }
      }

      const last = localStorage.getItem(LAST_PRESET_STORAGE_KEY);
      if (last && !didRestoreSessionRef.current) {
        setSelectedPresetId(last);
        setIsCustomizeOpen(last === "builtin:custom");

        if (last === "builtin:custom") {
          baselinePresetStateRef.current = null;
        } else {
          const builtin = builtinPresets.find((p) => p.id === last)?.state;
          const user = parsed.find((p) => p.id === last)?.state;
          const state = builtin ?? user;

          if (state) {
            isApplyingPresetRef.current = true;
            baselinePresetStateRef.current = JSON.stringify(state);
            applyPresetState(state);

            if (typeof window !== "undefined") {
              window.setTimeout(() => {
                isApplyingPresetRef.current = false;
              }, 0);
            } else {
              isApplyingPresetRef.current = false;
            }
          }
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(userPresets));
    } catch {
      // ignore
    }
  }, [userPresets]);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_PRESET_STORAGE_KEY, selectedPresetId);
    } catch {
      // ignore
    }
  }, [selectedPresetId]);


  useEffect(() => {
    if (selectedPresetId === "builtin:custom") return;
    applySelectedPreset(selectedPresetId);
  }, [selectedPresetId, applySelectedPreset]);

  const edgePresets = [
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
                <p className="pl-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">Queue</p>
                <p className="min-w-0 text-xs text-muted-foreground">
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

                  <div className="surface-ghost rounded-2xl border border-border/60 bg-background/40 p-3">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Presets</p>
                      <span
                        title={selectedPresetName}
                        className="inline-flex min-w-0 max-w-[60%] items-center truncate rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {selectedPresetLabel}
                      </span>
                    </div>

                    <div className="mt-2 grid min-w-0 gap-2">
                      <select
                        className="h-10 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm"
                        value={selectedPresetId}
                        onChange={(e) => applySelectedPreset(e.target.value)}
                      >
                        <optgroup label="Built-in">
                          {builtinPresets.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Saved">
                          {userPresets.length === 0 ? (
                            <option value="__none__" disabled>
                              (none yet)
                            </option>
                          ) : null}
                          {userPresets.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => applySelectedPreset("builtin:cover")}
                          className="rounded-xl border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent"
                        >
                          Cover 1600×900
                        </button>
                        <button
                          type="button"
                          onClick={() => applySelectedPreset("builtin:gallery")}
                          className="rounded-xl border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent"
                        >
                          Gallery 1600
                        </button>
                      </div>

                      <div className="mt-1 rounded-2xl border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
                        <div className="grid gap-1">
                          <div>
                            <span className="text-foreground/80">Output:</span> {presetSummary.output}
                          </div>
                          <div>
                            <span className="text-foreground/80">Resize:</span> {presetSummary.resize}
                          </div>
                          <div>
                            <span className="text-foreground/80">Crop:</span> {presetSummary.crop}
                          </div>
                          <div>
                            <span className="text-foreground/80">Naming:</span> {presetSummary.naming}
                          </div>
                          <div>
                            <span className="text-foreground/80">Download:</span> {presetSummary.download}
                          </div>
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="min-w-0 text-xs text-muted-foreground">
                          Presets live in your browser (localStorage). Nothing is uploaded.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsCustomizeOpen((v) => !v)}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                        >
                          {isCustomizeOpen ? "Hide advanced" : "Customize"}
                        </button>
                      </div>

                      {isCustomizeOpen ? (
                        <div className="grid gap-2 pt-1">
                          <input
                            type="text"
                            value={presetNameDraft}
                            onChange={(e) => setPresetNameDraft(e.target.value)}
                            placeholder="Save current settings as…"
                            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={savePreset}
                              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                            >
                              Save / update
                            </button>
                            <button
                              type="button"
                              onClick={deletePreset}
                              disabled={selectedPresetId.startsWith("builtin:")}
                              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {isCustomizeOpen ? (
                    <>
                      <div className="surface-ghost rounded-2xl border border-border/60 bg-background/40 p-3">
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
                              {edgePresets.map((p) => (
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

                      <div className="surface-ghost rounded-2xl border border-border/60 bg-background/40 p-3">
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


<div className="grid gap-2 rounded-2xl border border-border/60 bg-background/40 p-3">
  <label className="flex items-center gap-2 text-xs text-muted-foreground">
    <input
      type="checkbox"
      checked={autoCropEnabled}
      onChange={(e) => setAutoCropEnabled(e.target.checked)}
    />
    Auto-crop on export (center-crop)
  </label>

  <select
    className="h-10 rounded-xl border border-border bg-background px-3 text-sm disabled:opacity-60"
    value={autoCropAspectPreset}
    onChange={(e) => setAutoCropAspectPreset(e.target.value as AspectPreset)}
    disabled={!autoCropEnabled}
  >
    <option value="1:1">1:1</option>
    <option value="16:9">16:9</option>
    <option value="4:5">4:5</option>
    <option value="3:2">3:2</option>
    <option value="2:3">2:3</option>
    <option value="custom">Custom</option>
  </select>

  {autoCropEnabled && autoCropAspectPreset === "custom" ? (
    <div className="grid grid-cols-2 gap-2">
      <input
        type="number"
        min={1}
        value={autoCropCustomW}
        onChange={(e) => setAutoCropCustomW(Number(e.target.value))}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
        placeholder="W"
      />
      <input
        type="number"
        min={1}
        value={autoCropCustomH}
        onChange={(e) => setAutoCropCustomH(Number(e.target.value))}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
        placeholder="H"
      />
    </div>
  ) : null}

  <p className="text-xs text-muted-foreground">
    Manual crops (Crop tab) always win. Auto-crop only applies when no manual crop is set.
  </p>
</div>

<div className="grid gap-2 rounded-2xl border border-border/60 bg-background/40 p-3">
  <label className="flex items-center gap-2 text-xs text-muted-foreground">
    <input
      type="checkbox"
      checked={useCustomNaming}
      onChange={(e) => setUseCustomNaming(e.target.checked)}
    />
    Custom filenames
  </label>

  {useCustomNaming ? (
    <>
      <div className="grid gap-2">
        <label className="text-xs text-muted-foreground">Mode</label>
        <select
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          value={namingMode}
          onChange={(e) => setNamingMode(e.target.value as NamingMode)}
        >
          <option value="prefixSeq">Prefix + number</option>
          <option value="numbersOnly">Numbers only (01.webp)</option>
          <option value="default">Default (name-1600x900)</option>
        </select>
      </div>

      {namingMode === "prefixSeq" ? (
        <div className="grid gap-2">
          <label className="text-xs text-muted-foreground">Prefix</label>
          <input
            type="text"
            value={namePrefix}
            onChange={(e) => setNamePrefix(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            placeholder="e.g. gallery"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <label className="text-xs text-muted-foreground">Start</label>
          <input
            type="number"
            min={0}
            value={seqStart}
            onChange={(e) => setSeqStart(Number(e.target.value))}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs text-muted-foreground">Pad</label>
          <input
            type="number"
            min={1}
            max={8}
            value={seqPad}
            onChange={(e) => setSeqPad(Number(e.target.value))}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-muted-foreground">Suffix (optional)</label>
        <input
          type="text"
          value={nameSuffix}
          onChange={(e) => setNameSuffix(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          placeholder="e.g. cover"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={includeDims}
          onChange={(e) => setIncludeDims(e.target.checked)}
        />
        Include dimensions in name
      </label>

      <div className="grid gap-2 pt-1">
        <label className="text-xs text-muted-foreground">Single export name (optional)</label>
        <input
          type="text"
          value={singleName}
          onChange={(e) => setSingleName(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          placeholder="cover.webp"
        />
      </div>
    </>
  ) : (
    <p className="text-xs text-muted-foreground">
      Uses default names like <span className="text-foreground">image-1600x900.webp</span>.
    </p>
  )}
</div>

<div className="grid gap-2 rounded-2xl border border-border/60 bg-background/40 p-3">
  <label className="flex items-center gap-2 text-xs text-muted-foreground">
    <input
      type="checkbox"
      checked={exportAsZip}
      onChange={(e) => setExportAsZip(e.target.checked)}
    />
    Download as ZIP (single file)
  </label>

  {exportAsZip ? (
    <div className="grid gap-2">
      <div className="grid gap-2">
        <label className="text-xs text-muted-foreground">ZIP name</label>
        <input
          type="text"
          value={zipName}
          onChange={(e) => setZipName(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          placeholder="imagelab-export.zip"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-xs text-muted-foreground">ZIP folder (optional)</label>
        <input
          type="text"
          value={zipFolder}
          onChange={(e) => setZipFolder(e.target.value)}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          placeholder="my-project"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: set folder to your project slug so you can drop the ZIP straight into your project
        folder.
      </p>
    </div>
  ) : (
    <p className="text-xs text-muted-foreground">
                          {exportAsZip ? "ZIP export downloads one file." : "Batch export triggers multiple downloads. Your browser may ask permission."}
                        </p>
  )}
</div>
                      
                        </div>
                      </div>
                    </>
                  ) : null}

                  <div className="surface-ghost rounded-2xl border border-border/60 bg-background/40 p-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Export</p>

                    <div className="mt-3 grid gap-2">
                      <button
                        type="button"
                        onClick={exportSelected}
                        disabled={!active || !targetSize || busy}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-primary px-3 py-2 text-sm text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        Export selected{exportAsZip ? " (ZIP)" : ""}
                      </button>
                      <button
                        type="button"
                        onClick={exportAll}
                        disabled={items.length === 0 || busy}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        Export all {exportAsZip ? "(ZIP)" : "(batch)"}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {exportAsZip
                          ? "ZIP export downloads one file."
                          : "Batch export triggers multiple downloads. Your browser may ask permission."}
                      </p>
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
