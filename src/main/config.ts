import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Folder of the built main bundle (works for both the ES module and CommonJS builds).
const mainDir = dirname(fileURLToPath(import.meta.url));

export const APP_NAME = "Companion";
export const STORE_NAME = "companion";
export const APP_ID = "com.companion.desktop";

export const PET_WINDOW = {
  width: 220,
  height: 340
} as const;

export const SCREEN_BLOCK_WINDOW = {
  minWidth: 520,
  minHeight: 420
} as const;

export const SETTINGS_WINDOW = {
  width: 1080,
  height: 740
} as const;

export const PRELOAD_PATH = join(mainDir, "../preload/index.cjs");
export const RENDERER_HTML_PATH = join(mainDir, "../renderer/index.html");
export const IS_DEV = Boolean(process.env.ELECTRON_RENDERER_URL);

export const DISTRACTION_CHECK_INTERVAL_MS = 3000;
export const DISTRACTION_WARNING_COOLDOWN_MS = 60_000;
export const BREAK_RUN_DURATION_MS = 60_000;
export const BREAK_RUN_TICK_MS = 8;
