import { createHash, randomUUID } from "node:crypto";
import electron from "electron";
import type { PouchItem } from "../shared/types";

const { clipboard, nativeImage } = electron;

/*
 * Clipboard pouch: a short, in-memory history of what the user copied
 * (text, links, screenshots). Nothing is written to disk and the history is
 * gone when Companion quits. Content that password managers mark as private
 * is never captured.
 */

type StoredItem = PouchItem & { png?: Buffer; signature: string };

const MAX_ITEMS = 12;
const MAX_IMAGES = 4;
const MAX_TEXT = 20_000;
const PRIVATE_FORMATS = [
  "ExcludeClipboardContentFromMonitorProcessing",
  "Clipboard Viewer Ignore",
  "CanIncludeInClipboardHistory"
];

let items: StoredItem[] = [];
let lastSignature = "";
let timer: NodeJS.Timeout | null = null;
let onChange: (() => void) | null = null;

function isPrivate(): boolean {
  const formats = clipboard.availableFormats().map((format) => format.toLowerCase());
  return PRIVATE_FORMATS.some((format) => formats.includes(format.toLowerCase()));
}

function imageSignature(image: Electron.NativeImage): string {
  // Cheap fingerprint: size plus a hash of a tiny resampled copy.
  const { width, height } = image.getSize();
  const tiny = image.resize({ width: 16, height: 16, quality: "good" }).toBitmap();
  return `img:${width}x${height}:${createHash("sha1").update(tiny).digest("hex")}`;
}

function add(item: StoredItem): void {
  items = [item, ...items.filter((existing) => existing.signature !== item.signature)];
  let images = 0;
  items = items.filter((entry) => (entry.kind === "image" ? ++images <= MAX_IMAGES : true)).slice(0, MAX_ITEMS);
  onChange?.();
}

function poll(): void {
  try {
    if (isPrivate()) return;
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      const signature = imageSignature(image);
      if (signature === lastSignature) return;
      lastSignature = signature;
      const { width, height } = image.getSize();
      const thumb = image.resize(width >= height ? { width: 360, quality: "good" } : { height: 360, quality: "good" });
      add({
        id: randomUUID(),
        kind: "image",
        preview: thumb.toDataURL(),
        width,
        height,
        createdAt: Date.now(),
        png: image.toPNG(),
        signature
      });
      return;
    }
    const text = clipboard.readText();
    if (!text || !text.trim()) return;
    const signature = `txt:${createHash("sha1").update(text).digest("hex")}`;
    if (signature === lastSignature) return;
    lastSignature = signature;
    const trimmed = text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text;
    add({
      id: randomUUID(),
      kind: /^\s*https?:\/\/\S+\s*$/i.test(trimmed) ? "link" : "text",
      preview: trimmed,
      createdAt: Date.now(),
      signature
    });
  } catch {
    // The clipboard can be briefly locked by another app; try again next tick.
  }
}

export function startPouch(changed: () => void): void {
  onChange = changed;
  if (timer) return;
  // Start from what's already on the clipboard without adding it.
  try {
    const image = clipboard.readImage();
    lastSignature = !image.isEmpty()
      ? imageSignature(image)
      : `txt:${createHash("sha1").update(clipboard.readText() ?? "").digest("hex")}`;
  } catch {
    lastSignature = "";
  }
  timer = setInterval(poll, 900);
}

export function stopPouch(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

export function clearPouch(): void {
  items = [];
  onChange?.();
}

export function removePouchItem(id: string): void {
  items = items.filter((item) => item.id !== id);
  onChange?.();
}

export function listPouch(): PouchItem[] {
  return items.map(({ png: _png, signature: _signature, ...item }) => item);
}

/** Puts an item back on the clipboard (and moves it to the top). */
export function copyPouchItem(id: string): boolean {
  const item = items.find((entry) => entry.id === id);
  if (!item) return false;
  if (item.kind === "image" && item.png) {
    const image = nativeImage.createFromBuffer(item.png);
    clipboard.writeImage(image);
    lastSignature = imageSignature(image);
  } else {
    clipboard.writeText(item.preview);
    lastSignature = item.signature;
  }
  items = [item, ...items.filter((entry) => entry.id !== id)];
  onChange?.();
  return true;
}
