import { execFile } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import electron from "electron";
import Store from "electron-store";
import updater from "electron-updater";
import {
  createEmptyStats,
  DEFAULT_CUSTOM_REMINDER_COUNTDOWN_LEAD_MINUTES,
  DEFAULT_CUSTOM_REMINDER_DUE_SCALE_MULTIPLIER,
  DEFAULT_SETTINGS,
  todayKey
} from "../shared/constants";
import { allPets, BUNDLED_PETS } from "../shared/bundledPets";
import { i18n, pick, resolveLanguage } from "../shared/i18n";
import { mapPetStateToPetdexState, PETDEX_SPRITE_SIZE, PETDEX_STATES } from "../shared/spriteStates";
import type {
  AppSnapshot,
  BlockingMode,
  CustomReminder,
  DistractionStatus,
  DemoTrigger,
  PetFacing,
  PetLayout,
  PetRoamDirection,
  PetState,
  Settings,
  StatsHistory,
  SpeechBubble,
  TodayStats,
  UpdateStatus,
  AgentActivity,
  AgentSource,
  AgentStatus
} from "../shared/types";
import {
  APP_ID,
  APP_NAME,
  BREAK_RUN_DURATION_MS,
  BREAK_RUN_TICK_MS,
  DISTRACTION_CHECK_INTERVAL_MS,
  DISTRACTION_WARNING_COOLDOWN_MS,
  IS_DEV,
  PET_WINDOW,
  PRELOAD_PATH,
  RENDERER_HTML_PATH,
  SETTINGS_WINDOW,
  SCREEN_BLOCK_WINDOW,
  STORE_NAME
} from "./config";
import {
  classifyDistraction,
  isBrowserProcess,
  isPermissionError,
  isProtectedProcess,
  readActiveWindow
} from "./distraction";
import { closeActiveTab, closeWindow, killProcess, shutdownWindowsFocusHelper } from "./windowsFocus";
import { clearPouch, copyPouchItem, listPouch, removePouchItem, startPouch, stopPouch } from "./pouch";
import {
  accountStoreName,
  changePassword,
  createAccount,
  currentAccount,
  signIn,
  signOut,
  updateProfile
} from "./accounts";
import type { ActiveWindowInfo } from "./distraction";
import { parseClaudeLogRecord } from "./claudeEvents";
import {
  chooseAndImportPet,
  deleteInstalledPet,
  discoverInstalledPets,
  legacyUserPetsRoot,
  userPetsRoot
} from "./petPackages";
import { createTrayImage } from "./trayIcon";

const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  net,
  Notification,
  protocol,
  screen,
  shell,
  Tray
} = electron;
const { autoUpdater } = updater;

type PetPosition = {
  x: number;
  y: number;
};

type StoreSchema = {
  settings: Settings;
  stats: TodayStats;
  statsHistory: StatsHistory;
  petPosition?: PetPosition;
  focusSession?: FocusSession;
};

type FocusSession = {
  startedAt: number;
  endsAt: number;
};

const MIN_PET_SCALE = 0.3;
const MAX_PET_SCALE = 1.5;
const MAX_CUSTOM_REMINDER_PET_SCALE = 4;
const MIN_CUSTOM_REMINDER_SCALE_MULTIPLIER = 1;
const MAX_CUSTOM_REMINDER_SCALE_MULTIPLIER = 3;
const PET_VISUAL_BASE_SCALE = 0.88;
const PET_WINDOW_PADDING = 52;
const COUNTDOWN_BADGE_MIN_WINDOW_WIDTH = 132;
const BUBBLE_WINDOW_WIDTH = 300;
const BUBBLE_RENDER_WIDTH = 276;
const BUBBLE_WINDOW_EXTRA_HEIGHT = 190;
const BUBBLE_RESIZE_SETTLE_MS = 34;
// Windows rounds timers up to its ~15.6 ms clock: a 16 ms interval really fires
// every ~31 ms (choppy ~32 fps). An 8 ms interval lands on every clock tick
// (~60 fps); movement itself is time-based, so the exact cadence doesn't matter.
const MOTION_TICK_MS = 8;
const AMBIENT_ROAM_TICK_MS = MOTION_TICK_MS;
const AMBIENT_POSE_MIN_DELAY_MS = 12_000;
const AMBIENT_POSE_MAX_DELAY_MS = 55_000;
const AGENT_ACTIVITY_CHECK_INTERVAL_MS = 5000;
const AGENT_EVENT_MAX_AGE_MS = 2 * 60 * 1000;
const PET_LIBRARY_CHECK_INTERVAL_MS = 3000;
const BATTERY_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const LOW_BATTERY_ALERT_COOLDOWN_MS = 30 * 60 * 1000;
const LOW_BATTERY_THRESHOLD_PERCENT = 20;

type AgentEventKind = "complete" | "failed" | "needs-review" | "working";
type AgentProgressKind =
  | "working"
  | "thinking"
  | "tool"
  | "script"
  | "choice"
  | "permission"
  | "review"
  | "complete"
  | "failed";
type AgentMonitorEvent = {
  id: string;
  source: AgentSource;
  sessionKey: string;
  kind: AgentEventKind;
  message: string;
  progressKind?: AgentProgressKind;
  state: PetState;
  timestampMs: number;
  showProgress?: boolean;
};
type AgentWindowTarget = {
  source: AgentSource;
  sessionKey: string;
  appName: string;
  windowTitle: string;
  observedAt: number;
};
type BatteryStatus = {
  percent: number;
  isCharging: boolean;
};

app.setName(APP_NAME);
if (process.platform === "win32") app.setAppUserModelId(APP_ID);

/*
 * Windows shows a toast's app name and icon from the registered AppUserModelID.
 * The installer's Start Menu shortcut registers it, but dev runs and the
 * portable exe have no shortcut, so Windows falls back to "Electron" and the
 * Electron logo. Registering the ID under HKCU (no admin needed) fixes both.
 */
function registerWindowsNotificationIdentity(): void {
  if (process.platform !== "win32") return;
  const key = ["HKCU", "Software", "Classes", "AppUserModelId", APP_ID].join("\\");
  const iconPath = runtimeAssetPath("icon.png");
  const values: Array<[string, string]> = [
    ["DisplayName", APP_NAME],
    ["IconUri", iconPath],
    ["IconBackgroundColor", "FFFFFFFF"]
  ];
  for (const [name, data] of values) {
    execFile("reg.exe", ["add", key, "/v", name, "/t", "REG_SZ", "/d", data, "/f"], { windowsHide: true }, () => undefined);
  }
}

// Only one companion at a time: a second launch just surfaces the running one.
/** True when Windows/macOS started Companion at sign-in (see applyLaunchAtLogin). */
const LAUNCHED_AT_LOGIN = process.argv.includes("--autostart") || app.getLoginItemSettings().wasOpenedAtLogin;

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.exit(0);
}
app.on("second-instance", () => {
  if (sessionActive) ensurePetWindowVisible();
  createSettingsWindow();
});

function openDataStore(name: string): Store<StoreSchema> {
  return new Store<StoreSchema>({
    name,
    defaults: {
      settings: DEFAULT_SETTINGS,
      stats: createEmptyStats(),
      statsHistory: {}
    }
  });
}

// Each account has its own settings and stats; the signed-in account's store
// is swapped in on sign-in.
function storeForSession(): Store<StoreSchema> {
  const account = currentAccount();
  return openDataStore((account && accountStoreName(account.id)) || STORE_NAME);
}

let store = storeForSession();
let sessionActive = false;

let petWindow: Electron.BrowserWindow | null = null;
let settingsWindow: Electron.BrowserWindow | null = null;
let tray: Electron.Tray | null = null;
let petState: PetState = "idle";
let petFacing: PetFacing = "right";
let blockingMode: BlockingMode = null;
let focusActive = false;
let focusStartedAt: number | null = null;
let breakRunTimer: NodeJS.Timeout | null = null;
let breakRunCountdownTimer: NodeJS.Timeout | null = null;
let breakRunMovementTimer: NodeJS.Timeout | null = null;
let screenBlockTimer: NodeJS.Timeout | null = null;
let screenBlockCountdownTimer: NodeJS.Timeout | null = null;
let focusWarningTimer: NodeJS.Timeout | null = null;
let breakTimer: NodeJS.Timeout | null = null;
let hydrationTimer: NodeJS.Timeout | null = null;
const customReminderTimers = new Map<string, NodeJS.Timeout>();
let focusTimer: NodeJS.Timeout | null = null;
let distractionTimer: NodeJS.Timeout | null = null;
let distractionStartupTimer: NodeJS.Timeout | null = null;
let breakDueAt: number | null = null;
let breakSnoozeDueAt: number | null = null;
let hydrationDueAt: number | null = null;
let focusEndsAt: number | null = null;
let screenBlockEndsAt: number | null = null;
let bubbleTimer: NodeJS.Timeout | null = null;
let bubbleResizeSettleTimer: NodeJS.Timeout | null = null;
let bubbleRenderToken = 0;
let dragTimer: NodeJS.Timeout | null = null;
let dragSafetyTimer: NodeJS.Timeout | null = null;
let ambientRoamTimer: NodeJS.Timeout | null = null;
let ambientRoamMoveTimer: NodeJS.Timeout | null = null;
let ambientRoamStopTimer: NodeJS.Timeout | null = null;
let ambientPoseTimer: NodeJS.Timeout | null = null;
let ambientPoseStopTimer: NodeJS.Timeout | null = null;
let agentActivityTimer: NodeJS.Timeout | null = null;
let agentPoseTimer: NodeJS.Timeout | null = null;
let petLibraryTimer: NodeJS.Timeout | null = null;
let batteryMonitorTimer: NodeJS.Timeout | null = null;
let updateCheckTimer: NodeJS.Timeout | null = null;
let updateCheckInterval: NodeJS.Timeout | null = null;
let manualUpdateCheck = false;
let breakRunVelocity: PetPosition = { x: 0, y: 0 };
let breakRunFormatter: ((seconds: number) => string) | null = null;
let nextBreakRunTurnAt = 0;
let breakMutedToday = false;
let dragOffset: PetPosition = { x: 0, y: 0 };
let currentBubble: SpeechBubble | null = null;
let petScaleOverride: number | null = null;
let petLayout: PetLayout = {
  petOffsetX: 0,
  bubbleAnchorX: 0,
  bubbleLeftX: 0,
  bubbleArrowX: 0
};
let ambientRoamDirection:
  | "left"
  | "right"
  | "up"
  | "down"
  | "upLeft"
  | "upRight"
  | "downLeft"
  | "downRight" = "right";
let ambientRoamSpeed = 1.2;
// Walks ease in and out instead of snapping between standing and full speed.
const ROAM_EASE_MS = 420;
let ambientRoamStartedAt = 0;
let ambientRoamEndsAt = 0;

function smoothstep(value: number): number {
  const t = Math.min(Math.max(value, 0), 1);
  return t * t * (3 - 2 * t);
}

function ambientRoamEase(now = Date.now()): number {
  return smoothstep((now - ambientRoamStartedAt) / ROAM_EASE_MS) * smoothstep((ambientRoamEndsAt - now) / ROAM_EASE_MS);
}

/*
 * Smooth window motion. Speeds are expressed in px per 60 Hz frame, but each
 * tick is scaled by the real elapsed time (Windows timers fire every ~15.6 ms
 * with jitter), and the fractional position is kept between ticks so slow and
 * diagonal moves don't stall or stutter from per-tick rounding.
 */
type SmoothMotion = { x: number; y: number; lastTickAt: number };
const MOTION_FRAME_MS = 1000 / 60;
let ambientMotion: SmoothMotion | null = null;
let breakRunMotion: SmoothMotion | null = null;
let breakRunWindowSize: { width: number; height: number } | null = null;

function motionFrameScale(motion: SmoothMotion | null, bounds: Electron.Rectangle): { motion: SmoothMotion; scale: number } {
  const now = performance.now();
  const drifted =
    !motion || Math.abs(Math.round(motion.x) - bounds.x) > 2 || Math.abs(Math.round(motion.y) - bounds.y) > 2;
  if (drifted) {
    return { motion: { x: bounds.x, y: bounds.y, lastTickAt: now }, scale: 1 };
  }
  const scale = Math.min(Math.max((now - motion.lastTickAt) / MOTION_FRAME_MS, 0), 4);
  motion.lastTickAt = now;
  return { motion, scale };
}

function movePetWindowTo(x: number, y: number): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const current = petWindow.getBounds();
  // Always pin the intended size. On scaled displays (e.g. 125%) Windows rounds
  // each setPosition and the window grows a pixel per move, which over a few
  // walks left the pet trapped in a too-wide window, running in place.
  const size = blockingMode === "breakRun" && breakRunWindowSize ? breakRunWindowSize : petWindowSize();
  const next = { x: Math.round(x), y: Math.round(y), width: size.width, height: size.height };
  if (
    next.x === current.x &&
    next.y === current.y &&
    next.width === current.width &&
    next.height === current.height
  ) {
    return;
  }
  petWindow.setBounds(next, false);
  followPetWithPouch();
}
let agentLastNotificationAt = 0;
let agentLastProgressBubbleAt = 0;
let agentMonitorPrimed = false;
let lowBatteryAlertArmed = true;
let lastLowBatteryAlertAt = 0;
const agentSeenEventIds = new Set<string>();
const agentActiveSessions = new Map<string, number>();
const agentSessionSources = new Map<string, AgentSource>();
const agentBubbleActionSessions = new Map<string, string>();
const agentWindowTargets = new Map<string, AgentWindowTarget>();
const recentAgentWindowTargets: AgentWindowTarget[] = [];
const claudeSessionStatuses = new Map<string, string>();
let ambientPoseActiveState: PetState | null = null;
let agentPoseActiveState: PetState | null = null;
let lastPetLibrarySignature = "";

function normalizePetScale(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_SETTINGS.petScale;
  return Math.min(MAX_PET_SCALE, Math.max(MIN_PET_SCALE, value));
}

function normalizeNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizeBubbleDurationSeconds(value: unknown): number {
  const normalized = normalizeNumber(value, DEFAULT_SETTINGS.petBubbleDurationSeconds, 0.1, 10);
  return Math.round(normalized * 10) / 10;
}

function normalizeCountdownLeadMinutes(value: unknown): number {
  return Math.round(
    normalizeNumber(value, DEFAULT_CUSTOM_REMINDER_COUNTDOWN_LEAD_MINUTES, 1, 1440)
  );
}

function normalizeReminderScaleMultiplier(value: unknown): number {
  const normalized = normalizeNumber(
    value,
    DEFAULT_CUSTOM_REMINDER_DUE_SCALE_MULTIPLIER,
    MIN_CUSTOM_REMINDER_SCALE_MULTIPLIER,
    MAX_CUSTOM_REMINDER_SCALE_MULTIPLIER
  );
  return Math.round(normalized * 10) / 10;
}

function normalizeRoamDirection(value: unknown): PetRoamDirection {
  return value === "left" ||
    value === "right" ||
    value === "both" ||
    value === "vertical" ||
    value === "diagonal" ||
    value === "all"
    ? value
    : DEFAULT_SETTINGS.petRoamDirection;
}

function isValidReminderTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeCustomReminders(value: unknown): CustomReminder[] {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.customReminders;
  const seen = new Set<string>();
  return value.flatMap((entry, index): CustomReminder[] => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Partial<CustomReminder>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!title || !isValidReminderTime(record.time)) return [];
    const rawId = typeof record.id === "string" && record.id.trim()
      ? record.id.trim()
      : `reminder-${index}-${record.time}`;
    const id = seen.has(rawId) ? `${rawId}-${index}` : rawId;
    seen.add(id);
    return [
      {
        id,
        title,
        time: record.time,
        enabled: record.enabled !== false,
        showCountdownOnPet: Boolean(record.showCountdownOnPet),
        countdownLeadMinutes: normalizeCountdownLeadMinutes(record.countdownLeadMinutes),
        enlargePetOnDue: Boolean(record.enlargePetOnDue),
        duePetScaleMultiplier: normalizeReminderScaleMultiplier(record.duePetScaleMultiplier),
        createdAt:
          typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
            ? record.createdAt
            : Date.now()
      }
    ];
  });
}

function installedPetsFromDisk(): ReturnType<typeof discoverInstalledPets> {
  return discoverInstalledPets();
}

function visiblePetSize(scale: number): Pick<Electron.Rectangle, "width" | "height"> {
  const renderScale = PET_VISUAL_BASE_SCALE * scale;
  return {
    width: Math.round(PETDEX_SPRITE_SIZE.frameWidth * renderScale),
    height: Math.round(PETDEX_SPRITE_SIZE.frameHeight * renderScale)
  };
}

function compactPetWindowSize(scale = getSettings().petScale): Pick<Electron.Rectangle, "width" | "height"> {
  const petSize = visiblePetSize(scale);
  return {
    width: Math.max(COUNTDOWN_BADGE_MIN_WINDOW_WIDTH, petSize.width + PET_WINDOW_PADDING),
    height: Math.max(48, petSize.height + PET_WINDOW_PADDING)
  };
}

function petWindowSize(
  scale = getSettings().petScale,
  includeBubble = Boolean(currentBubble)
): Pick<Electron.Rectangle, "width" | "height"> {
  if (!includeBubble) return compactPetWindowSize(scale);
  const petSize = visiblePetSize(scale);
  return {
    width: Math.max(BUBBLE_WINDOW_WIDTH, petSize.width + PET_WINDOW_PADDING * 2),
    height: petSize.height + BUBBLE_WINDOW_EXTRA_HEIGHT
  };
}

function currentPetDisplayScale(settings = getSettings()): number {
  return petScaleOverride ?? settings.petScale;
}
let preScreenBlockBounds: Electron.Rectangle | null = null;
let distractionStatus: DistractionStatus = {
  state: "idle",
  activeApp: "",
  activeWindowTitle: "",
  matchedRule: null,
  lastCheckedAt: null,
  lastWarningAt: null,
  error: null
};

function getSettings(): Settings {
  const stored = store.get("settings");
  const installedPets = installedPetsFromDisk();
  const candidatePetId =
    typeof stored.selectedPetId === "string" && stored.selectedPetId
      ? stored.selectedPetId
      : DEFAULT_SETTINGS.selectedPetId;
  const selectedPetId = allPets(installedPets).some((pet) => pet.slug === candidatePetId)
    ? candidatePetId
    : DEFAULT_SETTINGS.selectedPetId;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    language: resolveLanguage(stored.language),
    petAppearanceId: selectedPetId,
    petScale: normalizePetScale(stored.petScale),
    petRoamEnabled:
      typeof stored.petRoamEnabled === "boolean"
        ? stored.petRoamEnabled
        : DEFAULT_SETTINGS.petRoamEnabled,
    petRoamDirection: normalizeRoamDirection(stored.petRoamDirection),
    petRoamFrequencySeconds: normalizeNumber(
      stored.petRoamFrequencySeconds,
      DEFAULT_SETTINGS.petRoamFrequencySeconds,
      5,
      180
    ),
    petRoamDurationSeconds: normalizeNumber(
      stored.petRoamDurationSeconds,
      DEFAULT_SETTINGS.petRoamDurationSeconds,
      1,
      30
    ),
    petIdleMotionSeconds: normalizeNumber(
      stored.petIdleMotionSeconds,
      DEFAULT_SETTINGS.petIdleMotionSeconds,
      1,
      12
    ),
    petBubbleDurationSeconds: normalizeBubbleDurationSeconds(stored.petBubbleDurationSeconds),
    lyricsModeEnabled:
      typeof stored.lyricsModeEnabled === "boolean"
        ? stored.lyricsModeEnabled
        : DEFAULT_SETTINGS.lyricsModeEnabled,
    screenBlockDurationSeconds: normalizeNumber(
      stored.screenBlockDurationSeconds,
      DEFAULT_SETTINGS.screenBlockDurationSeconds,
      15,
      600
    ),
    screenBlockCoverageRatio: normalizeNumber(
      stored.screenBlockCoverageRatio,
      DEFAULT_SETTINGS.screenBlockCoverageRatio,
      0.35,
      1
    ),
    agentActivityEnabled:
      typeof stored.agentActivityEnabled === "boolean"
        ? stored.agentActivityEnabled
        : DEFAULT_SETTINGS.agentActivityEnabled,
    agentCompletionSoundEnabled:
      typeof stored.agentCompletionSoundEnabled === "boolean"
        ? stored.agentCompletionSoundEnabled
        : DEFAULT_SETTINGS.agentCompletionSoundEnabled,
    customReminders: normalizeCustomReminders(stored.customReminders),
    userName: normalizeUserName(stored.userName),
    avatarImage: normalizeAvatar(stored.avatarImage),
    avatarPet: typeof stored.avatarPet === "string" ? stored.avatarPet.slice(0, 80) : "",
    avatarColor:
      typeof stored.avatarColor === "string" && /^#[0-9a-f]{6}$/i.test(stored.avatarColor)
        ? stored.avatarColor
        : DEFAULT_SETTINGS.avatarColor,
    seenPetIds: Array.isArray(stored.seenPetIds)
      ? stored.seenPetIds.filter((id): id is string => typeof id === "string")
      : DEFAULT_SETTINGS.seenPetIds,
    announcedPetIds: Array.isArray(stored.announcedPetIds)
      ? stored.announcedPetIds.filter((id): id is string => typeof id === "string")
      : Array.isArray(stored.seenPetIds)
        ? stored.seenPetIds.filter((id): id is string => typeof id === "string")
        : DEFAULT_SETTINGS.announcedPetIds,
    selectedPetId,
    installedPets
  };
}

function normalizeAvatar(value: unknown): string {
  return typeof value === "string" && value.startsWith("data:image/") && value.length < 600_000 ? value : "";
}

function normalizeUserName(value: unknown): string {
  return typeof value === "string" ? value.replace(/^\s+/, "").slice(0, 40) : "";
}

function text(): ReturnType<typeof i18n> {
  return i18n(getSettings().language);
}

/** Settings that decide when break, water and custom reminders fire. */
function reminderScheduleKey(settings: Settings): string {
  return JSON.stringify([
    settings.breakReminderEnabled,
    settings.breakIntervalMinutes,
    settings.hydrationReminderEnabled,
    settings.hydrationIntervalMinutes,
    settings.customReminders
  ]);
}

function setSettings(next: Settings): void {
  const previous = getSettings();
  const installedPets = installedPetsFromDisk();
  const selectedPetId = allPets(installedPets).some((pet) => pet.slug === next.selectedPetId)
    ? next.selectedPetId
    : DEFAULT_SETTINGS.selectedPetId;
  const normalized = {
    ...next,
    userName: normalizeUserName(next.userName),
    language: resolveLanguage(next.language),
    petAppearanceId: selectedPetId,
    petScale: normalizePetScale(next.petScale),
    petRoamEnabled: Boolean(next.petRoamEnabled),
    petRoamDirection: normalizeRoamDirection(next.petRoamDirection),
    petRoamFrequencySeconds: normalizeNumber(next.petRoamFrequencySeconds, 18, 5, 180),
    petRoamDurationSeconds: normalizeNumber(next.petRoamDurationSeconds, 5, 1, 30),
    petIdleMotionSeconds: normalizeNumber(next.petIdleMotionSeconds, 3.2, 1, 12),
    petBubbleDurationSeconds: normalizeBubbleDurationSeconds(next.petBubbleDurationSeconds),
    lyricsModeEnabled: Boolean(next.lyricsModeEnabled),
    screenBlockDurationSeconds: normalizeNumber(next.screenBlockDurationSeconds, 120, 15, 600),
    screenBlockCoverageRatio: normalizeNumber(next.screenBlockCoverageRatio, 0.4, 0.35, 1),
    breakReminderEnabled: Boolean(next.breakReminderEnabled),
    breakIntervalMinutes: Math.round(normalizeNumber(next.breakIntervalMinutes, DEFAULT_SETTINGS.breakIntervalMinutes, 1, 180)),
    screenBlockReminderEnabled: Boolean(next.screenBlockReminderEnabled),
    hydrationReminderEnabled: Boolean(next.hydrationReminderEnabled),
    hydrationIntervalMinutes: Math.round(normalizeNumber(next.hydrationIntervalMinutes, DEFAULT_SETTINGS.hydrationIntervalMinutes, 1, 240)),
    focusDurationMinutes: Math.round(normalizeNumber(next.focusDurationMinutes, DEFAULT_SETTINGS.focusDurationMinutes, 1, 120)),
    petCheckInMinutes: Math.round(normalizeNumber(next.petCheckInMinutes, DEFAULT_SETTINGS.petCheckInMinutes, 2, 60)),
    distractionGraceSeconds: Math.round(normalizeNumber(next.distractionGraceSeconds, DEFAULT_SETTINGS.distractionGraceSeconds, 0, 120)),
    customReminders: normalizeCustomReminders(next.customReminders),
    agentActivityEnabled: Boolean(next.agentActivityEnabled),
    agentCompletionSoundEnabled: Boolean(next.agentCompletionSoundEnabled),
    selectedPetId,
    installedPets
  };
  store.set("settings", normalized);
  if (normalized.lyricsModeEnabled) stopPetDrag();
  updatePetWindowMouseEvents(normalized.lyricsModeEnabled);
  resizePetWindowForScale(currentPetDisplayScale(normalized), Boolean(currentBubble));
  sendToAll("settings:updated", normalized);
  settingsWindow?.setTitle(APP_NAME);
  // Only restart reminder countdowns when their own settings change; editing
  // your name or pet should not push the next break further away.
  if (reminderScheduleKey(previous) !== reminderScheduleKey(normalized)) scheduleReminderTimers();
  else publishSnapshot();
  scheduleDistractionDetection();
  scheduleAgentActivityMonitor();
  stopAmbientRoam(false);
  scheduleAmbientRoam(500);
  scheduleAmbientPose();
  updateTrayMenu();
}

function getStatsHistory(): StatsHistory {
  return store.get("statsHistory", {});
}

function isSameStats(left: TodayStats | undefined, right: TodayStats): boolean {
  return Boolean(
    left &&
      left.date === right.date &&
      left.breaksTaken === right.breaksTaken &&
      left.watersLogged === right.watersLogged &&
      left.focusMinutes === right.focusMinutes &&
      left.focusWarnings === right.focusWarnings
  );
}

function saveStatsToHistory(stats: TodayStats): void {
  if (!stats.date) return;
  const history = getStatsHistory();
  if (isSameStats(history[stats.date], stats)) return;
  store.set("statsHistory", {
    ...history,
    [stats.date]: stats
  });
}

function getStats(): TodayStats {
  const today = todayKey();
  const stats = store.get("stats", createEmptyStats());
  if (stats.date !== today) {
    saveStatsToHistory(stats);
    const current = getStatsHistory()[today] ?? createEmptyStats(today);
    store.set("stats", current);
    saveStatsToHistory(current);
    return current;
  }
  saveStatsToHistory(stats);
  return stats;
}

function getFocusSession(): FocusSession | null {
  const session = store.get("focusSession");
  if (
    !session ||
    typeof session.startedAt !== "number" ||
    typeof session.endsAt !== "number" ||
    !Number.isFinite(session.startedAt) ||
    !Number.isFinite(session.endsAt) ||
    session.endsAt <= session.startedAt
  ) {
    return null;
  }
  return session;
}

function saveFocusSession(startedAt: number, endsAt: number): void {
  store.set("focusSession", { startedAt, endsAt });
}

function clearFocusSession(): void {
  store.delete("focusSession");
}

function restoreFocusSession(): void {
  const session = getFocusSession();
  if (!session) {
    clearFocusSession();
    return;
  }

  const now = Date.now();
  if (session.endsAt <= now) {
    const elapsedMinutes = Math.max(1, Math.round((session.endsAt - session.startedAt) / 60000));
    clearFocusSession();
    updateStats((stats) => ({
      ...stats,
      focusMinutes: stats.focusMinutes + elapsedMinutes
    }));
    setPetState("focusDone");
    return;
  }

  focusActive = true;
  focusStartedAt = session.startedAt;
  focusEndsAt = session.endsAt;
  blockingMode = null;
  setPetState("focusGuard");
  if (focusTimer) clearTimeout(focusTimer);
  focusTimer = setTimeout(() => stopFocusMode(true), session.endsAt - now);
}

function updateStats(mutator: (stats: TodayStats) => TodayStats): void {
  const next = mutator(getStats());
  store.set("stats", next);
  saveStatsToHistory(next);
  sendToAll("stats:updated", next);
  publishSnapshot();
}

function resetTodayStats(): void {
  breakMutedToday = false;
  const reset = createEmptyStats();
  store.set("stats", reset);
  saveStatsToHistory(reset);
  sendToAll("stats:updated", reset);
  publishSnapshot();
}

function snapshot(): AppSnapshot {
  const settings = getSettings();
  return {
    settings,
    stats: getStats(),
    statsHistory: getStatsHistory(),
    timers: {
      breakDueAt,
      breakSnoozeDueAt,
      hydrationDueAt,
      focusEndsAt
    },
    distraction: distractionStatus,
    petState,
    petFacing,
    petDisplayScale: currentPetDisplayScale(settings),
    blockingMode,
    dogVisible: Boolean(petWindow?.isVisible()),
    focusActive,
    screenBlockActive: blockingMode === "breakRun" || blockingMode === "focusWarning",
    screenBlockEndsAt,
    update: updateStatus,
    agentActivity,
    account: currentAccount()
  };
}

function sendToPet<T>(channel: string, payload?: T): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  petWindow.webContents.send(channel, payload);
}

function sendToAll<T>(channel: string, payload?: T): void {
  sendToPet(channel, payload);
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send(channel, payload);
  }
}

function clampNumber(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function layoutForPetAnchor(bounds: Electron.Rectangle, petAnchorScreenX?: number): PetLayout {
  const anchorX =
    petAnchorScreenX === undefined
      ? Math.round(bounds.width / 2)
      : petAnchorScreenX - bounds.x;
  const bubbleWidth = Math.min(BUBBLE_RENDER_WIDTH, Math.max(0, bounds.width - 12));
  const bubbleLeftX = currentBubble
    ? clampNumber(anchorX, 6 + bubbleWidth / 2, bounds.width - 6 - bubbleWidth / 2)
    : anchorX;
  const bubbleArrowX = currentBubble
    ? clampNumber(anchorX - (bubbleLeftX - bubbleWidth / 2), 18, Math.max(18, bubbleWidth - 18))
    : Math.round(bubbleWidth / 2);

  return {
    petOffsetX: Math.round(anchorX - bounds.width / 2),
    bubbleAnchorX: Math.round(anchorX),
    bubbleLeftX: Math.round(bubbleLeftX),
    bubbleArrowX: Math.round(bubbleArrowX)
  };
}

function sendPetLayout(): void {
  sendToPet("pet:layout", petLayout);
}

function publishSnapshot(): void {
  sendToAll("app:snapshot", snapshot());
}

function setPetState(next: PetState): void {
  petState = next;
  sendToAll("pet:set-state", next);
}

function setPetFacing(next: PetFacing): void {
  if (petFacing === next) return;
  petFacing = next;
  publishSnapshot();
}

// True while the cursor is over the pet, its bubble or badges (reported by the
// renderer from forwarded mouse moves). Everywhere else the transparent pet
// window lets clicks fall through to the apps underneath.
let petPointerInteractive = false;
let petMouseIgnored: boolean | null = null;

function updatePetWindowMouseEvents(lyricsModeEnabled = getSettings().lyricsModeEnabled): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const screenBlock = blockingMode === "breakRun" || blockingMode === "focusWarning";
  const ignore = lyricsModeEnabled || (!screenBlock && !dragTimer && !petPointerInteractive);
  if (ignore === petMouseIgnored) return;
  petMouseIgnored = ignore;
  if (ignore) petWindow.setIgnoreMouseEvents(true, { forward: true });
  else petWindow.setIgnoreMouseEvents(false);
}

function bubbleDisplayMs(): number {
  return Math.round(getSettings().petBubbleDurationSeconds * 1000);
}

function bubbleSettleMs(): number {
  return bubbleDisplayMs() + 100;
}

function bubbleAutoDismissMs(bubble: SpeechBubble): number | null {
  return bubble.autoDismissMs ? bubbleDisplayMs() : null;
}

function withoutEmoji(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, "")
    .replace(/[\u200D\uFE0F]/g, "")
    .replace(/\s+([!?.,~])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function showBubble(input: SpeechBubble): void {
  const bubble: SpeechBubble = {
    ...input,
    message: withoutEmoji(input.message),
    actions: input.actions?.map((action) => ({ ...action, label: withoutEmoji(action.label) }))
  };
  if (bubbleTimer) {
    clearTimeout(bubbleTimer);
    bubbleTimer = null;
  }
  if (bubbleResizeSettleTimer) {
    clearTimeout(bubbleResizeSettleTimer);
    bubbleResizeSettleTimer = null;
  }
  const renderToken = ++bubbleRenderToken;
  currentBubble = bubble;
  resizePetWindowForScale(currentPetDisplayScale(), true);
  // Let the transparent window finish resizing before changing rendered content.
  bubbleResizeSettleTimer = setTimeout(() => {
    bubbleResizeSettleTimer = null;
    if (renderToken !== bubbleRenderToken || currentBubble?.id !== bubble.id) return;
    sendToPet("pet:show-bubble", bubble);
    const autoDismissMs = bubbleAutoDismissMs(bubble);
    if (autoDismissMs) {
      bubbleTimer = setTimeout(() => hideBubble(), autoDismissMs);
    }
  }, BUBBLE_RESIZE_SETTLE_MS);
}

function hideBubble(): void {
  if (bubbleTimer) {
    clearTimeout(bubbleTimer);
    bubbleTimer = null;
  }
  if (bubbleResizeSettleTimer) {
    clearTimeout(bubbleResizeSettleTimer);
    bubbleResizeSettleTimer = null;
  }
  const renderToken = ++bubbleRenderToken;
  sendToPet("pet:hide-bubble");
  currentBubble = null;
  bubbleResizeSettleTimer = setTimeout(() => {
    bubbleResizeSettleTimer = null;
    if (renderToken !== bubbleRenderToken || currentBubble) return;
    resizePetWindowForScale(currentPetDisplayScale(), false);
  }, BUBBLE_RESIZE_SETTLE_MS);
}

function setPetScaleOverride(scale: number | null): void {
  petScaleOverride = scale;
  resizePetWindowForScale(currentPetDisplayScale(), Boolean(currentBubble));
  publishSnapshot();
}

function rendererUrl(route: "pet" | "settings" | "pouch"): string {
  const devServer = process.env.ELECTRON_RENDERER_URL;
  if (devServer) return `${devServer}#${route}`;
  return RENDERER_HTML_PATH;
}

function runtimeAssetPath(filename: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, filename)
    : resolve(process.cwd(), "build", filename);
}

function loadRenderer(win: Electron.BrowserWindow, route: "pet" | "settings" | "pouch"): void {
  const devServer = process.env.ELECTRON_RENDERER_URL;
  if (devServer) {
    void win.loadURL(rendererUrl(route));
    return;
  }
  void win.loadFile(rendererUrl(route), { hash: route });
}

function clampBoundsToWorkArea(bounds: Electron.Rectangle): Electron.Rectangle {
  const center = {
    x: bounds.x + Math.round(bounds.width / 2),
    y: bounds.y + Math.round(bounds.height / 2)
  };
  const workArea = screen.getDisplayNearestPoint(center).workArea;
  return {
    ...bounds,
    x: Math.min(Math.max(bounds.x, workArea.x), workArea.x + workArea.width - bounds.width),
    y: Math.min(Math.max(bounds.y, workArea.y), workArea.y + workArea.height - bounds.height)
  };
}

function initialPetBounds(): Electron.Rectangle {
  const workArea = screen.getPrimaryDisplay().workArea;
  const stored = store.get("petPosition");
  const size = petWindowSize();
  const fallback = {
    ...size,
    x: Math.round(workArea.x + workArea.width / 2 - size.width / 2),
    y: workArea.y + workArea.height - size.height
  };

  if (!stored) return fallback;
  const compactSize = compactPetWindowSize();
  return clampBoundsToWorkArea({
    ...fallback,
    x: Math.round(stored.x + compactSize.width / 2 - size.width / 2),
    y: stored.y + compactSize.height - size.height
  });
}

function persistPetPosition(): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const bounds = petWindow.getBounds();
  const scale = getSettings().petScale;
  const compactSize = compactPetWindowSize(scale);
  const petAnchorX = bounds.x + bounds.width / 2 + petLayout.petOffsetX;
  const compactBounds = clampBoundsToWorkArea({
    ...compactSize,
    x: Math.round(petAnchorX - compactSize.width / 2),
    y: bounds.y + bounds.height - compactSize.height
  });
  store.set("petPosition", { x: compactBounds.x, y: compactBounds.y });
}

function resizePetWindowForScale(scale: number, includeBubble = Boolean(currentBubble)): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  if (blockingMode === "breakRun" || blockingMode === "focusWarning") {
    petLayout = layoutForPetAnchor(petWindow.getBounds());
    sendPetLayout();
    return;
  }
  const current = petWindow.getBounds();
  const nextSize = petWindowSize(scale, includeBubble);
  const petAnchorX = current.x + current.width / 2 + petLayout.petOffsetX;
  const nextBounds = clampBoundsToWorkArea({
    ...nextSize,
    x: Math.round(petAnchorX - nextSize.width / 2),
    y: current.y + current.height - nextSize.height
  });
  petLayout = layoutForPetAnchor(nextBounds, petAnchorX);
  if (
    current.width !== nextBounds.width ||
    current.height !== nextBounds.height ||
    current.x !== nextBounds.x ||
    current.y !== nextBounds.y
  ) {
    petWindow.setBounds(nextBounds, false);
  }
  sendPetLayout();
  persistPetPosition();
  followPetWithPouch();
}

function showPetWindowInactive(): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  if (!petWindow.isVisible()) petWindow.showInactive();
  if (process.platform === "darwin") {
    petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  petWindow.setAlwaysOnTop(true, process.platform === "darwin" ? "floating" : "normal");
  petMouseIgnored = null;
  petPointerInteractive = false;
  updatePetWindowMouseEvents();
  updateTrayMenu();
  sendPetLayout();
  publishSnapshot();
}

function createPetWindow(): void {
  const icon = runtimeAssetPath("tray-icon.png");
  const bounds = initialPetBounds();
  petLayout = layoutForPetAnchor(bounds);
  petWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    show: false,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    icon,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: !IS_DEV
    }
  });

  petWindow.setAlwaysOnTop(true, process.platform === "darwin" ? "floating" : "normal");
  if (process.platform === "darwin") {
    petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  loadRenderer(petWindow, "pet");
  petWindow.once("ready-to-show", showPetWindowInactive);
  petWindow.webContents.once("did-finish-load", showPetWindowInactive);
  petWindow.on("show", () => {
    updateTrayMenu();
    publishSnapshot();
  });
  petWindow.on("hide", () => {
    stopPetDrag();
    updateTrayMenu();
    publishSnapshot();
  });
  petWindow.on("closed", () => {
    stopPetDrag();
    petWindow = null;
    updateTrayMenu();
    publishSnapshot();
  });
}

function ensurePetWindowVisible(): void {
  if (!sessionActive) return;
  if (!petWindow || petWindow.isDestroyed()) createPetWindow();
  showPetWindowInactive();
}

let pouchWindow: Electron.BrowserWindow | null = null;
let pouchOpen = false;
let pouchHideTimer: NodeJS.Timeout | null = null;
const POUCH_SIZE = { width: 360, height: 560 };

function sendPouch(): void {
  if (pouchWindow && !pouchWindow.isDestroyed()) pouchWindow.webContents.send("pouch:updated", listPouch());
}

/** True while the Compboard is on screen (the window itself is kept warm while hidden). */
function isPouchOpen(): boolean {
  return pouchOpen && !!pouchWindow && !pouchWindow.isDestroyed();
}

/** Plays the exit animation in the renderer, then hides the window for reuse. */
function closePouchWindow(): void {
  if (!isPouchOpen() || !pouchWindow) return;
  pouchOpen = false;
  const closing = pouchWindow;
  closing.webContents.send("pouch:closing");
  if (pouchHideTimer) clearTimeout(pouchHideTimer);
  pouchHideTimer = setTimeout(() => {
    pouchHideTimer = null;
    if (!closing.isDestroyed() && !pouchOpen) closing.hide();
  }, 170);
}

/** Destroys the warm Compboard window (session end or feature turned off). */
function destroyPouchWindow(): void {
  pouchOpen = false;
  if (pouchHideTimer) clearTimeout(pouchHideTimer);
  pouchHideTimer = null;
  const win = pouchWindow;
  pouchWindow = null;
  if (win && !win.isDestroyed()) win.destroy();
}

/** Where the Compboard sits: just above the pet, or beside it near the top edge. */
function pouchPosition(): { x: number; y: number } {
  const pet = petWindow && !petWindow.isDestroyed() ? petWindow.getBounds() : { x: 0, y: 0, width: 0, height: 0 };
  const workArea = screen.getDisplayNearestPoint({ x: pet.x + pet.width / 2, y: pet.y + pet.height / 2 }).workArea;
  const petCenterX = pet.x + pet.width / 2 + petLayout.petOffsetX;
  let x = Math.round(petCenterX - POUCH_SIZE.width / 2);
  let y = pet.y + pet.height - Math.round(visiblePetSize(currentPetDisplayScale()).height) - POUCH_SIZE.height - 6;
  if (y < workArea.y + 8) {
    y = Math.max(workArea.y + 8, pet.y + pet.height - POUCH_SIZE.height);
    x =
      petCenterX + 70 + POUCH_SIZE.width < workArea.x + workArea.width
        ? Math.round(petCenterX + 70)
        : Math.round(petCenterX - 70 - POUCH_SIZE.width);
  }
  x = Math.min(Math.max(x, workArea.x + 8), workArea.x + workArea.width - POUCH_SIZE.width - 8);
  return { x, y };
}

/** Keeps an open Compboard attached to the pet as it moves. */
function followPetWithPouch(): void {
  if (!isPouchOpen() || !pouchWindow) return;
  const { x, y } = pouchPosition();
  const [cx, cy] = pouchWindow.getPosition();
  if (cx !== x || cy !== y) pouchWindow.setBounds({ x, y, ...POUCH_SIZE }, false);
}

/** Creates the Compboard window once, hidden, so opening it is instant. */
function ensurePouchWindow(): Electron.BrowserWindow {
  if (pouchWindow && !pouchWindow.isDestroyed()) return pouchWindow;
  const { x, y } = pouchPosition();
  const win = new BrowserWindow({
    ...POUCH_SIZE,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      webSecurity: !IS_DEV
    }
  });
  win.setAlwaysOnTop(true, process.platform === "darwin" ? "floating" : "pop-up-menu");
  loadRenderer(win, "pouch");
  win.on("blur", () => {
    // Stay open while you drag the pet (focus moves to the pet window);
    // close when you move on to anything else.
    setTimeout(() => {
      if (petWindow && !petWindow.isDestroyed() && petWindow.isFocused()) return;
      closePouchWindow();
    }, 0);
  });
  win.on("closed", () => {
    if (pouchWindow === win) {
      pouchWindow = null;
      pouchOpen = false;
    }
  });
  pouchWindow = win;
  return win;
}

/** Opens the Compboard just above (or beside) the pet, or closes it if open. */
function togglePouchWindow(): void {
  if (isPouchOpen()) {
    closePouchWindow();
    return;
  }
  if (!petWindow || petWindow.isDestroyed()) return;
  stopAmbientRoam(false);
  stopAmbientPose(true);

  const win = ensurePouchWindow();
  pouchOpen = true;
  if (pouchHideTimer) {
    clearTimeout(pouchHideTimer);
    pouchHideTimer = null;
  }
  const { x, y } = pouchPosition();
  win.setBounds({ x, y, ...POUCH_SIZE }, false);

  const present = (): void => {
    if (win.isDestroyed() || !pouchOpen || pouchWindow !== win) return;
    sendPouch();
    // Start the entrance animation on the frame the window appears.
    win.webContents.send("pouch:opening");
    win.show();
    win.focus();
  };
  if (win.webContents.isLoading()) win.webContents.once("did-finish-load", present);
  else present();
}

function createSettingsWindow(options: { background?: boolean } = {}): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: SETTINGS_WINDOW.width,
    height: SETTINGS_WINDOW.height,
    title: APP_NAME,
    resizable: true,
    minWidth: 820,
    minHeight: 560,
    show: false,
    icon: runtimeAssetPath("icon.png"),
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0a0a0a" : "#faf9f6",
    ...(process.platform === "darwin"
      ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 14, y: 14 } }
      : { autoHideMenuBar: true }),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: !IS_DEV
    }
  });

  loadRenderer(settingsWindow, "settings");
  settingsWindow.once("ready-to-show", () => {
    // When Windows starts Companion at sign-in, open without stealing focus.
    if (options.background) settingsWindow?.showInactive();
    else settingsWindow?.show();
    publishSnapshot();
  });
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

function createTray(): void {
  tray = new Tray(createTrayImage(runtimeAssetPath(process.platform === "darwin" ? "trayTemplate.png" : "tray-icon.png")));
  tray.setToolTip(APP_NAME);
  tray.on("click", () => {
    tray?.popUpContextMenu();
  });
  if (process.platform !== "darwin") {
    nativeTheme.on("updated", () => tray?.setImage(createTrayImage(runtimeAssetPath("tray-icon.png"))));
  }
  nativeTheme.on("updated", () => {
    settingsWindow?.setBackgroundColor(nativeTheme.shouldUseDarkColors ? "#14110f" : "#ffffff");
  });
  updateTrayMenu();
}

function actionMenuItems(): Electron.MenuItemConstructorOptions[] {
  const dogVisible = Boolean(petWindow?.isVisible());
  const labels = text().menu;
  return [
    {
      label: dogVisible ? labels.hideDog : labels.showDog,
      click: () => {
        if (!petWindow) createPetWindow();
        if (!petWindow) return;
        if (petWindow.isVisible()) petWindow.hide();
        else petWindow.showInactive();
        updateTrayMenu();
        sendToAll("app:snapshot", snapshot());
      }
    },
    {
      label: focusActive ? labels.stopFocusMode : labels.startFocusMode,
      click: () => {
        if (focusActive) stopFocusMode(true);
        else startFocusMode();
      }
    },
    ...(app.isPackaged
      ? []
      : [
          { type: "separator" as const },
          { label: labels.demoBreakReminder, click: () => triggerDemo("break") },
          { label: labels.demoHydrationReminder, click: () => triggerDemo("hydration") },
          { label: labels.demoFocusWarning, click: () => triggerDemo("focusWarning") },
          { label: labels.demoHappyReaction, click: () => triggerDemo("happy") }
        ]),
    { type: "separator" },
    { label: labels.settings, click: () => createSettingsWindow() },
    ...(app.isPackaged
      ? [{ label: labels.checkForUpdates, click: () => void checkForUpdates(true) }]
      : [])
  ];
}

function updateApplicationMenu(): void {
  const labels = text().menu;
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: APP_NAME,
      submenu: [
        ...actionMenuItems(),
        { type: "separator" },
        { role: "quit", label: labels.quit }
      ]
    },
    { role: "editMenu" },
    { role: "windowMenu" }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function updateTrayMenu(): void {
  updateApplicationMenu();
  if (!tray) return;
  if (!sessionActive) {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: APP_NAME, enabled: false },
        { type: "separator" },
        { label: "Sign in…", click: () => createSettingsWindow() },
        { type: "separator" },
        { label: "Quit Companion", click: () => app.quit() }
      ])
    );
    return;
  }
  const labels = text().menu;
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: APP_NAME, enabled: false },
    { type: "separator" },
    ...actionMenuItems(),
    { type: "separator" },
    {
      label: labels.quit,
      click: () => {
        app.quit();
      }
    }
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function showPetContextMenu(): void {
  if (getSettings().lyricsModeEnabled) return;
  const labels = text().menu;
  const petName = getSettings().petNickname.trim();
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: "Open Companion", click: () => createSettingsWindow() },
    { type: "separator" },
    {
      label: "Log a glass of water",
      enabled: !blockingMode,
      click: () => handleBubbleAction("hydration:done")
    },
    {
      label: focusActive ? "End focus session" : "Start focus session",
      enabled: !blockingMode || focusActive,
      click: () => {
        if (focusActive) stopFocusMode(false);
        else startFocusMode();
      }
    },
    {
      label: "Take a break now",
      enabled: !blockingMode,
      click: () => triggerBreakReminder(true)
    },
    { type: "separator" },
    {
      label: petName ? `Hide ${petName}` : labels.hideDog,
      click: () => {
        petWindow?.hide();
        updateTrayMenu();
        sendToAll("app:snapshot", snapshot());
      }
    },
    { label: "Quit Companion", click: () => app.quit() }
  ];

  Menu.buildFromTemplate(template).popup({ window: petWindow ?? undefined });
}

function movePetWithCursor(): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const cursor = screen.getCursorScreenPoint();
  const size = petWindowSize();
  const bounds = clampBoundsToWorkArea({
    ...size,
    x: cursor.x - dragOffset.x,
    y: cursor.y - dragOffset.y
  });
  const current = petWindow.getBounds();
  if (
    current.x === bounds.x &&
    current.y === bounds.y &&
    current.width === bounds.width &&
    current.height === bounds.height
  ) {
    return;
  }
  petWindow.setBounds(bounds);
  followPetWithPouch();
}

function startPetDrag(offset: { offsetX: number; offsetY: number }): void {
  if (
    getSettings().lyricsModeEnabled ||
    blockingMode === "breakRun" ||
    !petWindow ||
    petWindow.isDestroyed()
  ) {
    return;
  }
  stopAmbientRoam(false);
  stopAmbientPose(true);
  dragOffset = {
    x: Math.min(Math.max(Math.round(offset.offsetX), 0), petWindow.getBounds().width),
    y: Math.min(Math.max(Math.round(offset.offsetY), 0), petWindow.getBounds().height)
  };
  if (dragTimer) clearInterval(dragTimer);
  if (dragSafetyTimer) clearTimeout(dragSafetyTimer);
  movePetWithCursor();
  dragTimer = setInterval(movePetWithCursor, MOTION_TICK_MS);
  dragSafetyTimer = setTimeout(stopPetDrag, 15_000);
}

function stopPetDrag(): void {
  const wasDragging = Boolean(dragTimer || dragSafetyTimer);
  if (dragTimer) {
    clearInterval(dragTimer);
    dragTimer = null;
  }
  if (dragSafetyTimer) {
    clearTimeout(dragSafetyTimer);
    dragSafetyTimer = null;
  }
  if (wasDragging) {
    persistPetPosition();
    sendToAll("app:snapshot", snapshot());
    scheduleAmbientPose();
  }
}

function canAmbientRoam(): boolean {
  const settings = getSettings();
  return Boolean(
    petWindow?.isVisible() &&
      settings.petRoamEnabled &&
      !blockingMode &&
      !focusActive &&
      !currentBubble &&
      !dragTimer &&
      !dragSafetyTimer &&
      !isPouchOpen() &&
      (petState === "idle" || petState === "sitting" || petState === "sleeping")
  );
}

function canAmbientPose(): boolean {
  return Boolean(
    petWindow?.isVisible() &&
      !blockingMode &&
      !focusActive &&
      !currentBubble &&
      !dragTimer &&
      !dragSafetyTimer &&
      !ambientRoamMoveTimer &&
      !agentPoseTimer &&
      petState === "idle"
  );
}

function stopAmbientPose(restoreState: boolean): void {
  if (ambientPoseTimer) {
    clearTimeout(ambientPoseTimer);
    ambientPoseTimer = null;
  }
  if (ambientPoseStopTimer) {
    clearTimeout(ambientPoseStopTimer);
    ambientPoseStopTimer = null;
  }
  if (restoreState && ambientPoseActiveState && petState === ambientPoseActiveState) {
    setPetState("idle");
  }
  ambientPoseActiveState = null;
}

function scheduleAmbientPose(delayMs?: number): void {
  stopAmbientPose(false);
  const settings = getSettings();
  const baseDelay = clampNumber(
    settings.petIdleMotionSeconds * 5000,
    AMBIENT_POSE_MIN_DELAY_MS,
    AMBIENT_POSE_MAX_DELAY_MS
  );
  const jitter = Math.round(baseDelay * (Math.random() * 0.35 - 0.12));
  ambientPoseTimer = setTimeout(
    startAmbientPose,
    delayMs ?? Math.max(AMBIENT_POSE_MIN_DELAY_MS, baseDelay + jitter)
  );
}

function startAmbientPose(): void {
  if (!canAmbientPose()) {
    scheduleAmbientPose();
    return;
  }

  // Calm idle moments only, and always whole animation cycles, so the pet
  // never snaps out of a pose mid-frame (the "review" row is too busy to loop).
  const next = pick<PetState>(["waving", "waiting", "waiting"]);
  const cycleMs = PETDEX_STATES[mapPetStateToPetdexState(next)].durationMs;
  const cycles = next === "waving" ? 2 : 2 + Math.floor(Math.random() * 2);
  ambientPoseActiveState = next;
  setPetState(next);
  ambientPoseStopTimer = setTimeout(() => {
    if (ambientPoseActiveState && petState === ambientPoseActiveState) setPetState("idle");
    ambientPoseActiveState = null;
    scheduleAmbientPose();
  }, cycleMs * cycles);
}

function scheduleAmbientRoam(delayMs?: number): void {
  if (ambientRoamTimer) clearTimeout(ambientRoamTimer);
  const settings = getSettings();
  if (!settings.petRoamEnabled) return;
  const baseDelay = settings.petRoamFrequencySeconds * 1000;
  const jitter = Math.round(baseDelay * (Math.random() * 0.3 - 0.15));
  ambientRoamTimer = setTimeout(startAmbientRoam, delayMs ?? Math.max(1000, baseDelay + jitter));
}

function randomAmbientDirection(direction: PetRoamDirection): typeof ambientRoamDirection {
  if (direction === "left" || direction === "right") return direction;
  const directions =
    direction === "vertical"
      ? (["up", "down"] as const)
      : direction === "diagonal"
        ? (["upLeft", "upRight", "downLeft", "downRight"] as const)
      : direction === "all"
        ? (["left", "right", "up", "down"] as const)
        : (["left", "right"] as const);
  return pick([...directions]);
}

function ambientDirectionX(direction: typeof ambientRoamDirection): -1 | 0 | 1 {
  if (direction === "left" || direction === "upLeft" || direction === "downLeft") return -1;
  if (direction === "right" || direction === "upRight" || direction === "downRight") return 1;
  return 0;
}

function ambientDirectionY(direction: typeof ambientRoamDirection): -1 | 0 | 1 {
  if (direction === "up" || direction === "upLeft" || direction === "upRight") return -1;
  if (direction === "down" || direction === "downLeft" || direction === "downRight") return 1;
  return 0;
}

function ambientDirectionFromVector(x: -1 | 0 | 1, y: -1 | 0 | 1): typeof ambientRoamDirection {
  if (x < 0 && y < 0) return "upLeft";
  if (x > 0 && y < 0) return "upRight";
  if (x < 0 && y > 0) return "downLeft";
  if (x > 0 && y > 0) return "downRight";
  if (x < 0) return "left";
  if (x > 0) return "right";
  if (y < 0) return "up";
  return "down";
}

function setAmbientRoamDirection(direction: typeof ambientRoamDirection): void {
  ambientRoamDirection = direction;
  const x = ambientDirectionX(direction);
  if (x < 0) setPetFacing("left");
  if (x > 0) setPetFacing("right");
  setPetState(
    x < 0 || (x === 0 && petFacing === "left")
      ? "runningLeft"
      : "runningRight"
  );
}

function startAmbientRoam(): void {
  if (!canAmbientRoam() || !petWindow || petWindow.isDestroyed()) {
    scheduleAmbientRoam();
    return;
  }

  stopAmbientPose(false);
  const settings = getSettings();
  setAmbientRoamDirection(randomAmbientDirection(settings.petRoamDirection));
  ambientRoamSpeed = 1.0 + Math.random() * 0.35;

  if (ambientRoamMoveTimer) clearInterval(ambientRoamMoveTimer);
  if (ambientRoamStopTimer) clearTimeout(ambientRoamStopTimer);
  ambientMotion = null;
  ambientRoamMoveTimer = setInterval(movePetForAmbientRoam, AMBIENT_ROAM_TICK_MS);
  // Walk for a whole number of stride cycles so the pet stops on a natural frame.
  const strideMs = PETDEX_STATES["running-right"].durationMs;
  const walkMs = Math.max(2, Math.round((settings.petRoamDurationSeconds * 1000) / strideMs)) * strideMs;
  ambientRoamStartedAt = Date.now();
  ambientRoamEndsAt = ambientRoamStartedAt + walkMs;
  ambientRoamStopTimer = setTimeout(() => stopAmbientRoam(true), walkMs);
}

function movePetForAmbientRoam(): void {
  if (!petWindow || petWindow.isDestroyed() || !petWindow.isVisible()) return;
  if (blockingMode || dragTimer || dragSafetyTimer) {
    stopAmbientRoam(true);
    return;
  }

  const bounds = petWindow.getBounds();
  const workArea = screen.getDisplayNearestPoint({
    x: bounds.x + Math.round(bounds.width / 2),
    y: bounds.y + Math.round(bounds.height / 2)
  }).workArea;
  const minX = workArea.x + 4;
  const maxX = workArea.x + workArea.width - bounds.width - 4;
  const minY = workArea.y + 4;
  const maxY = workArea.y + workArea.height - bounds.height - 4;
  let directionX = ambientDirectionX(ambientRoamDirection);
  let directionY = ambientDirectionY(ambientRoamDirection);
  const isDiagonal = directionX !== 0 && directionY !== 0;
  const frame = motionFrameScale(ambientMotion, bounds);
  ambientMotion = frame.motion;
  const step =
    (isDiagonal ? ambientRoamSpeed / Math.SQRT2 : ambientRoamSpeed) * frame.scale * ambientRoamEase();
  const horizontalDelta = directionX * step;
  const verticalDelta = directionY * step;
  let nextX = ambientMotion.x + horizontalDelta;
  let nextY = ambientMotion.y + verticalDelta;

  if (horizontalDelta !== 0) {
    if (nextX >= maxX) {
      nextX = maxX;
      directionX = -1;
    }
    if (nextX <= minX) {
      nextX = minX;
      directionX = 1;
    }
  } else {
    nextX = clampNumber(nextX, minX, maxX);
  }
  if (verticalDelta !== 0) {
    if (nextY >= maxY) {
      nextY = maxY;
      directionY = -1;
    }
    if (nextY <= minY) {
      nextY = minY;
      directionY = 1;
    }
  } else {
    nextY = clampNumber(nextY, minY, maxY);
  }
  const nextDirection = ambientDirectionFromVector(directionX, directionY);
  if (nextDirection !== ambientRoamDirection) setAmbientRoamDirection(nextDirection);

  ambientMotion.x = nextX;
  ambientMotion.y = nextY;
  movePetWindowTo(nextX, nextY);
}

function stopAmbientRoam(scheduleNext: boolean): void {
  if (ambientRoamTimer) {
    clearTimeout(ambientRoamTimer);
    ambientRoamTimer = null;
  }
  if (ambientRoamMoveTimer) {
    clearInterval(ambientRoamMoveTimer);
    ambientRoamMoveTimer = null;
  }
  if (ambientRoamStopTimer) {
    clearTimeout(ambientRoamStopTimer);
    ambientRoamStopTimer = null;
  }
  if (petState === "runningLeft" || petState === "runningRight") {
    setPetState(focusActive ? "focusGuard" : "idle");
    persistPetPosition();
  }
  if (scheduleNext) scheduleAmbientRoam();
  if (scheduleNext) scheduleAmbientPose();
}

function startClickRunReaction(direction: "left" | "right"): void {
  if (!petWindow || petWindow.isDestroyed() || blockingMode || focusActive) return;
  stopAmbientRoam(false);
  stopAmbientPose(true);
  clearAgentPose(true);
  setAmbientRoamDirection(direction);
  ambientRoamSpeed = 2.2 + Math.random() * 0.6;
  if (ambientRoamMoveTimer) clearInterval(ambientRoamMoveTimer);
  if (ambientRoamStopTimer) clearTimeout(ambientRoamStopTimer);
  ambientMotion = null;
  ambientRoamMoveTimer = setInterval(movePetForAmbientRoam, AMBIENT_ROAM_TICK_MS);
  const clickRunMs = PETDEX_STATES["running-right"].durationMs * (1 + Math.round(Math.random()));
  ambientRoamStartedAt = Date.now();
  ambientRoamEndsAt = ambientRoamStartedAt + clickRunMs;
  ambientRoamStopTimer = setTimeout(() => stopAmbientRoam(true), clickRunMs);
}

function clearBreakRunTimers(): void {
  if (breakRunTimer) {
    clearTimeout(breakRunTimer);
    breakRunTimer = null;
  }
  if (breakRunCountdownTimer) {
    clearInterval(breakRunCountdownTimer);
    breakRunCountdownTimer = null;
  }
  if (breakRunMovementTimer) {
    clearInterval(breakRunMovementTimer);
    breakRunMovementTimer = null;
  }
  if (screenBlockTimer) {
    clearTimeout(screenBlockTimer);
    screenBlockTimer = null;
  }
  if (screenBlockCountdownTimer) {
    clearInterval(screenBlockCountdownTimer);
    screenBlockCountdownTimer = null;
  }
  if (focusWarningTimer) {
    clearTimeout(focusWarningTimer);
    focusWarningTimer = null;
  }
}

function showBreakRunCountdown(endsAt: number): void {
  const labels = text();
  const remainingSeconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  const formatter = breakRunFormatter ?? pick(labels.bubble.breakRun);
  showBubble({
    id: "break-run",
    message: formatter(remainingSeconds),
    actions: [
      { id: "break-run:done", label: labels.actions.breakRunDone, kind: "primary" },
      { id: "break-run:snooze", label: labels.actions.breakSnooze }
    ]
  });
}

function chooseBreakRunVelocity(): PetPosition {
  const speed = 2.2 + Math.random() * 1.2;
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed
  };
}

function movePetForBreakRun(): void {
  if (!petWindow || petWindow.isDestroyed() || !petWindow.isVisible()) return;

  const bounds = petWindow.getBounds();
  const workArea = screen.getDisplayNearestPoint({
    x: bounds.x + Math.round(bounds.width / 2),
    y: bounds.y + Math.round(bounds.height / 2)
  }).workArea;
  const now = Date.now();
  const minX = workArea.x + 8;
  const maxX = workArea.x + workArea.width - bounds.width - 8;
  const minY = workArea.y + 8;
  const maxY = workArea.y + workArea.height - bounds.height - 8;

  if (now >= nextBreakRunTurnAt && Math.random() < 0.45) {
    breakRunVelocity = chooseBreakRunVelocity();
  }

  const frame = motionFrameScale(breakRunMotion, bounds);
  breakRunMotion = frame.motion;
  let nextX = breakRunMotion.x + breakRunVelocity.x * frame.scale;
  let nextY = breakRunMotion.y + breakRunVelocity.y * frame.scale;

  if (nextX <= minX) {
    nextX = minX;
    breakRunVelocity.x = Math.abs(breakRunVelocity.x);
  }
  if (nextX >= maxX) {
    nextX = maxX;
    breakRunVelocity.x = -Math.abs(breakRunVelocity.x);
  }
  if (nextY <= minY) {
    nextY = minY;
    breakRunVelocity.y = Math.abs(breakRunVelocity.y);
  }
  if (nextY >= maxY) {
    nextY = maxY;
    breakRunVelocity.y = -Math.abs(breakRunVelocity.y);
  }

  if (now >= nextBreakRunTurnAt) {
    nextBreakRunTurnAt = now + 350 + Math.round(Math.random() * 850);
  }

  setPetFacing(breakRunVelocity.x >= 0 ? "right" : "left");
  breakRunMotion.x = nextX;
  breakRunMotion.y = nextY;
  movePetWindowTo(nextX, nextY);
}

function finishBreakRun(): void {
  clearBreakRunTimers();
  breakRunFormatter = null;
  blockingMode = null;
  screenBlockEndsAt = null;
  restorePetWindowAfterScreenBlock();
  updateStats((stats) => ({ ...stats, breaksTaken: stats.breaksTaken + 1 }));
  hideBubble();
  showBubble({ id: "break-run-complete", message: pick(text().bubble.breakRunComplete), autoDismissMs: 2200 });
  setPetState("breakDone");
  setTimeout(() => {
    if (!blockingMode && !focusActive) {
      hideBubble();
      setPetState("idle");
      scheduleReminderTimers();
      scheduleAmbientPose();
    }
  }, bubbleSettleMs());
  publishSnapshot();
}

function startBreakRun(): void {
  ensurePetWindowVisible();
  clearBreakRunTimers();
  stopPetDrag();
  stopAmbientRoam(false);
  stopAmbientPose(true);
  blockingMode = "breakRun";
  breakDueAt = null;
  breakSnoozeDueAt = null;
  breakRunFormatter = pick(text().bubble.breakRun);
  expandPetWindowForScreenBlock();
  setPetState("breakRunning");
  setPetFacing("right");
  breakRunVelocity = chooseBreakRunVelocity();
  breakRunMotion = null;
  if (petWindow && !petWindow.isDestroyed()) {
    const { width, height } = petWindow.getBounds();
    breakRunWindowSize = { width, height };
  }
  nextBreakRunTurnAt = Date.now() + 600;
  const settings = getSettings();
  const durationMs = Math.max(15, settings.screenBlockDurationSeconds) * 1000;
  const endsAt = Date.now() + durationMs;
  screenBlockEndsAt = endsAt;
  showBreakRunCountdown(endsAt);
  screenBlockCountdownTimer = setInterval(() => showBreakRunCountdown(endsAt), 1000);
  breakRunMovementTimer = setInterval(movePetForBreakRun, BREAK_RUN_TICK_MS);
  screenBlockTimer = setTimeout(finishBreakRun, durationMs);
  publishSnapshot();
}

function expandPetWindowForScreenBlock(coverageRatio?: number): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const settings = getSettings();
  const current = petWindow.getBounds();
  preScreenBlockBounds = current;
  const display = screen.getDisplayNearestPoint({
    x: current.x + Math.round(current.width / 2),
    y: current.y + Math.round(current.height / 2)
  });
  const workArea = display.workArea;
  const ratio = Math.min(1, Math.max(0.35, coverageRatio ?? settings.screenBlockCoverageRatio));
  const targetWidth = Math.max(SCREEN_BLOCK_WINDOW.minWidth, Math.round(workArea.width * ratio));
  const targetHeight = Math.max(SCREEN_BLOCK_WINDOW.minHeight, Math.round(workArea.height * ratio));
  petWindow.setBounds({
    width: Math.min(workArea.width, targetWidth),
    height: Math.min(workArea.height, targetHeight),
    x: workArea.x + Math.round((workArea.width - targetWidth) / 2),
    y: workArea.y + Math.round((workArea.height - targetHeight) / 2)
  });
  petLayout = layoutForPetAnchor(petWindow.getBounds());
  sendPetLayout();
  petWindow.setAlwaysOnTop(true, process.platform === "darwin" ? "screen-saver" : "pop-up-menu");
  updatePetWindowMouseEvents();
}

function restorePetWindowAfterScreenBlock(): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  if (preScreenBlockBounds) {
    petWindow.setBounds(clampBoundsToWorkArea(preScreenBlockBounds));
    preScreenBlockBounds = null;
  } else {
    petWindow.setBounds(initialPetBounds());
  }
  petLayout = layoutForPetAnchor(petWindow.getBounds());
  sendPetLayout();
  petWindow.setAlwaysOnTop(true, process.platform === "darwin" ? "floating" : "normal");
  // Screen block is over; blockingMode is cleared right after, so re-check shortly.
  setTimeout(() => updatePetWindowMouseEvents(), 0);
}

function scheduleReminderTimers(): void {
  if (breakTimer) clearTimeout(breakTimer);
  if (hydrationTimer) clearTimeout(hydrationTimer);
  scheduleCustomReminderTimers();
  breakDueAt = null;
  breakSnoozeDueAt = null;
  hydrationDueAt = null;

  const settings = getSettings();
  if (settings.breakReminderEnabled && !breakMutedToday) {
    breakDueAt = Date.now() + settings.breakIntervalMinutes * 60 * 1000;
    breakTimer = setTimeout(
      () => triggerBreakReminder(false),
      settings.breakIntervalMinutes * 60 * 1000
    );
  }
  if (settings.hydrationReminderEnabled) {
    hydrationDueAt = Date.now() + settings.hydrationIntervalMinutes * 60 * 1000;
    hydrationTimer = setTimeout(
      () => triggerHydrationReminder(false),
      settings.hydrationIntervalMinutes * 60 * 1000
    );
  }
  publishSnapshot();
}

function setDistractionStatus(partial: Partial<DistractionStatus>): void {
  distractionStatus = { ...distractionStatus, ...partial };
  publishSnapshot();
}

const DISTRACTION_SUPPORTED = process.platform === "darwin" || process.platform === "win32";
// Windows polling is a cheap request to a resident helper, so it can react fast.
const DISTRACTION_POLL_MS = process.platform === "win32" ? 1500 : DISTRACTION_CHECK_INTERVAL_MS;
const FORCE_QUIT_AFTER_MS = 4000;
let distractionMatch: { key: string; since: number } | null = null;
let distractionEnforcedAt = 0;
let distractionCheckRunning = false;

/*
 * Focus-mode enforcement (Windows). Keyword rules only ever close the active
 * browser tab (Ctrl+W), never a whole app, because keywords can also appear in
 * editor or document titles. App rules close that app's window, and force-quit
 * it if it is still in front a few seconds later (games often ignore close).
 */
async function enforceDistraction(active: ActiveWindowInfo, matchedRule: string): Promise<boolean> {
  if (process.platform !== "win32" || !getSettings().distractionAutoClose) return false;
  if (!active.hwnd || isProtectedProcess(active.appName)) return false;
  const browser = isBrowserProcess(active.appName);

  if (matchedRule.startsWith("keyword:")) {
    if (!browser) return false;
    return closeActiveTab(active.hwnd).catch(() => false);
  }

  const closed = await closeWindow(active.hwnd).catch(() => false);
  if (!closed || browser || !active.pid) return closed;
  const pid = active.pid;
  const hwnd = active.hwnd;
  setTimeout(() => {
    void readActiveWindow()
      .then((now) => {
        if (!focusActive || now.pid !== pid || now.hwnd !== hwnd) return;
        return killProcess(pid);
      })
      .catch(() => undefined);
  }, FORCE_QUIT_AFTER_MS);
  return true;
}

async function checkDistractionNow(): Promise<void> {
  if (distractionCheckRunning) return;
  distractionCheckRunning = true;
  try {
    await runDistractionCheck();
  } finally {
    distractionCheckRunning = false;
  }
}

async function runDistractionCheck(): Promise<void> {
  const settings = getSettings();
  if (!settings.distractionDetectionEnabled && !focusActive) return;

  try {
    const active = await readActiveWindow();
    const matchedRule = classifyDistraction(active, settings);
    const now = Date.now();

    setDistractionStatus({
      state: "watching",
      activeApp: active.appName,
      activeWindowTitle: active.windowTitle,
      matchedRule,
      lastCheckedAt: now,
      error: null
    });

    if (!focusActive || !matchedRule) {
      distractionMatch = null;
      return;
    }

    // The distraction has to stay in front for the grace period before acting,
    // so quickly alt-tabbing past a blocked window doesn't close it.
    const key = `${matchedRule}|${active.hwnd ?? active.appName}`;
    if (!distractionMatch || distractionMatch.key !== key) distractionMatch = { key, since: now };
    if (now - distractionMatch.since < settings.distractionGraceSeconds * 1000) return;
    if (now - distractionEnforcedAt < 1200) return;

    distractionEnforcedAt = now;
    distractionMatch = null;
    const enforced = await enforceDistraction(active, matchedRule);
    const label = matchedRule.replace(/^(app|keyword):/, "");

    if (blockingMode === "focusWarning") return;
    if (
      !enforced &&
      distractionStatus.lastWarningAt &&
      now - distractionStatus.lastWarningAt < DISTRACTION_WARNING_COOLDOWN_MS
    ) {
      return;
    }

    setDistractionStatus({ lastWarningAt: now });
    triggerFocusWarning(label);
  } catch (error) {
    setDistractionStatus({
      state: isPermissionError(error) ? "permission-needed" : "error",
      error: error instanceof Error ? error.message : String(error),
      lastCheckedAt: Date.now()
    });
  }
}

function scheduleDistractionDetection(): void {
  if (distractionTimer) {
    clearInterval(distractionTimer);
    distractionTimer = null;
  }
  if (distractionStartupTimer) {
    clearTimeout(distractionStartupTimer);
    distractionStartupTimer = null;
  }

  const settings = getSettings();
  // During a focus session distractions are always watched; otherwise only
  // when detection is switched on.
  if (!settings.distractionDetectionEnabled && !focusActive) {
    setDistractionStatus({
      state: "idle",
      matchedRule: null,
      error: null
    });
    return;
  }

  setDistractionStatus({
    state: DISTRACTION_SUPPORTED ? "watching" : "unsupported",
    error: DISTRACTION_SUPPORTED ? null : text().system.unsupportedDistraction
  });

  if (!DISTRACTION_SUPPORTED) return;

  distractionMatch = null;
  distractionStartupTimer = setTimeout(() => {
    void checkDistractionNow();
    distractionTimer = setInterval(() => void checkDistractionNow(), DISTRACTION_POLL_MS);
  }, 0);
}

function sourceFromAgentWindow(appName: string, title: string): AgentSource | null {
  const target = `${appName} ${title}`;
  if (/\bdeep\s*seek\b|\bdeepseek(?:[-\s]*tui)?\b/i.test(target)) return "DeepSeek TUI";
  if (/\bhermes\b/i.test(target)) return "Hermes";
  if (/\bclaude(?:\s+code)?\b/i.test(target)) return "Claude Code";
  if (/\bcodex\b/i.test(target)) return "Codex";
  if (/\bopen\s*code\b|\bopencode\b/i.test(target)) return "OpenCode";
  return null;
}

function sourceFromSessionKey(sessionKey: string): AgentSource | null {
  if (sessionKey.startsWith("DeepSeek TUI:")) return "DeepSeek TUI";
  if (sessionKey.startsWith("Hermes:")) return "Hermes";
  if (sessionKey.startsWith("Claude Code:")) return "Claude Code";
  if (sessionKey.startsWith("Codex:")) return "Codex";
  if (sessionKey.startsWith("OpenCode:")) return "OpenCode";
  return null;
}

function activeWindowAgentSessionKey(source: AgentSource, appName: string): string {
  const appKey = appName.trim().toLowerCase() || "unknown-app";
  return `${source}:active-window:${appKey}`;
}

function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function agentWindowsScript(): string {
  return `
set previousDelimiters to AppleScript's text item delimiters
set rowDelimiter to ASCII character 30
set fieldDelimiter to ASCII character 31
set rows to {}
tell application "System Events"
  repeat with appProcess in application processes
    set appName to name of appProcess
    if appName is not "Companion" then
      try
        repeat with appWindow in windows of appProcess
          set windowTitle to ""
          try
            set windowTitle to name of appWindow
          end try
          if windowTitle is not "" then
            set end of rows to appName & fieldDelimiter & windowTitle
          end if
        end repeat
      end try
    end if
  end repeat
end tell
set AppleScript's text item delimiters to rowDelimiter
set output to rows as text
set AppleScript's text item delimiters to previousDelimiters
return output
`;
}

async function readAgentWindows(): Promise<AgentWindowTarget[]> {
  if (process.platform !== "darwin") return [];
  const output = await execFileText("/usr/bin/osascript", ["-e", agentWindowsScript()]);
  const rows = output
    .trim()
    .split(String.fromCharCode(30))
    .map((row) => row.split(String.fromCharCode(31)))
    .filter((parts): parts is [string, string] => parts.length >= 2);

  return rows
    .map(([appName, windowTitle]) => {
      const source = sourceFromAgentWindow(appName, windowTitle);
      if (!source) return null;
      return {
        source,
        sessionKey: `${source}:window-scan`,
        appName: appName.trim(),
        windowTitle: windowTitle.trim(),
        observedAt: Date.now()
      };
    })
    .filter((target): target is AgentWindowTarget => Boolean(target));
}

function rememberAgentSession(event: Pick<AgentMonitorEvent, "sessionKey" | "source">): void {
  agentSessionSources.set(event.sessionKey, event.source);
}

function rememberAgentWindowTarget(
  event: Pick<AgentMonitorEvent, "sessionKey" | "source">,
  active: ActiveWindowInfo
): void {
  const activeSource = sourceFromAgentWindow(active.appName, active.windowTitle);
  if (activeSource !== event.source) return;
  const target: AgentWindowTarget = {
    source: event.source,
    sessionKey: event.sessionKey,
    appName: active.appName,
    windowTitle: active.windowTitle,
    observedAt: Date.now()
  };
  agentWindowTargets.set(event.sessionKey, target);
  recentAgentWindowTargets.unshift(target);
  if (recentAgentWindowTargets.length > 30) recentAgentWindowTargets.length = 30;
}

function looksLikeAgentHostWindow(appName: string, title: string): boolean {
  const target = `${appName} ${title}`;
  return /(terminal|iterm|warp|ghostty|wezterm|alacritty|kitty|tabby|rio|hyper|cursor|visual studio code|code|trae|zed|deepseek|hermes|codex|claude|opencode|open\s*code)/i.test(
    target
  );
}

function rememberAgentWindowTargetForEvent(
  event: Pick<AgentMonitorEvent, "sessionKey" | "source">,
  active: ActiveWindowInfo | null
): void {
  if (!active) return;
  const activeSource = sourceFromAgentWindow(active.appName, active.windowTitle);
  if (activeSource && activeSource !== event.source) return;
  if (!activeSource && event.source === "Codex") return;
  if (!activeSource && !looksLikeAgentHostWindow(active.appName, active.windowTitle)) return;
  const target: AgentWindowTarget = {
    source: event.source,
    sessionKey: event.sessionKey,
    appName: active.appName,
    windowTitle: active.windowTitle,
    observedAt: Date.now()
  };
  agentWindowTargets.set(event.sessionKey, target);
  recentAgentWindowTargets.unshift(target);
  if (recentAgentWindowTargets.length > 30) recentAgentWindowTargets.length = 30;
}

function shouldTrustAgentSessionEvent(
  event: Pick<AgentMonitorEvent, "source">,
  active: ActiveWindowInfo | null
): boolean {
  if (event.source !== "Codex") return true;
  if (!active) return false;
  return sourceFromAgentWindow(active.appName, active.windowTitle) === "Codex";
}

function registerAgentBubbleAction(
  event: Pick<AgentMonitorEvent, "sessionKey" | "source" | "timestampMs">
): string {
  rememberAgentSession(event);
  const actionId = `agent:open:${hashText(event.sessionKey)}:${event.timestampMs}`;
  agentBubbleActionSessions.set(actionId, event.sessionKey);
  while (agentBubbleActionSessions.size > 50) {
    const first = agentBubbleActionSessions.keys().next().value;
    if (typeof first !== "string") break;
    agentBubbleActionSessions.delete(first);
  }
  return actionId;
}

function normalizeWindowText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ").trim();
}

function titleSimilarityScore(left: string, right: string): number {
  const normalizedLeft = normalizeWindowText(left);
  const normalizedRight = normalizeWindowText(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 120;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return 80;
  const leftTokens = new Set(normalizedLeft.split(" ").filter((token) => token.length >= 4));
  const rightTokens = normalizedRight.split(" ").filter((token) => token.length >= 4);
  return rightTokens.reduce((score, token) => score + (leftTokens.has(token) ? 8 : 0), 0);
}

function sessionPathTokens(sessionKey: string): string[] {
  const source = sourceFromSessionKey(sessionKey);
  if (!source) return [];
  const raw = sessionKey.slice(source.length + 1);
  return raw
    .split(/[\\/_.:-]+/)
    .flatMap((part) => part.split("-"))
    .map((part) => part.toLowerCase())
    .filter((part) => part.length >= 4 && !/^\d+$/.test(part))
    .slice(-8);
}

function scoreAgentWindow(
  sessionKey: string,
  source: AgentSource,
  windowTarget: AgentWindowTarget,
  knownTarget: AgentWindowTarget | undefined
): number {
  if (windowTarget.source !== source) return 0;
  let score = 40;
  if (knownTarget) {
    if (windowTarget.appName === knownTarget.appName) score += 60;
    score += titleSimilarityScore(windowTarget.windowTitle, knownTarget.windowTitle);
  }
  const activePrefix = `${source}:active-window:`;
  if (sessionKey.startsWith(activePrefix)) {
    const appKey = sessionKey.slice(activePrefix.length);
    if (windowTarget.appName.trim().toLowerCase() === appKey) score += 80;
  }
  const normalizedTitle = normalizeWindowText(`${windowTarget.appName} ${windowTarget.windowTitle}`);
  for (const token of sessionPathTokens(sessionKey)) {
    if (normalizedTitle.includes(token)) score += 10;
  }
  return score;
}

async function resolveAgentWindowTarget(sessionKey: string): Promise<AgentWindowTarget | null> {
  const source = agentSessionSources.get(sessionKey) ?? sourceFromSessionKey(sessionKey);
  if (!source) return null;
  const windows = await readAgentWindows();
  const knownTarget = agentWindowTargets.get(sessionKey);
  const recentTarget = recentAgentWindowTargets.find((target) => target.sessionKey === sessionKey);
  const recentSourceTarget = recentAgentWindowTargets.find((target) => target.source === source);
  const preferredTarget = knownTarget ?? recentTarget ?? recentSourceTarget;
  const scored = windows
    .map((windowTarget) => ({
      windowTarget,
      score: scoreAgentWindow(sessionKey, source, windowTarget, preferredTarget)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);
  return scored[0]?.windowTarget ?? preferredTarget ?? null;
}

function focusAgentWindowScript(target: Pick<AgentWindowTarget, "appName" | "windowTitle">): string {
  return `
set targetAppName to ${appleScriptString(target.appName)}
set targetWindowTitle to ${appleScriptString(target.windowTitle)}
tell application "System Events"
  repeat with appProcess in application processes
    if name of appProcess is targetAppName then
      set frontmost of appProcess to true
      repeat with appWindow in windows of appProcess
        set windowTitle to ""
        try
          set windowTitle to name of appWindow
        end try
        if windowTitle is targetWindowTitle then
          try
            perform action "AXRaise" of appWindow
          end try
          try
            set value of attribute "AXMain" of appWindow to true
          end try
          try
            set focused of appWindow to true
          end try
          return "focused"
        end if
      end repeat
      try
        tell application targetAppName to activate
      end try
      try
        if (count of windows of appProcess) > 0 then
          set appWindow to item 1 of windows of appProcess
          try
            perform action "AXRaise" of appWindow
          end try
          try
            set value of attribute "AXMain" of appWindow to true
          end try
          try
            set focused of appWindow to true
          end try
          return "focused-app"
        end if
      end try
    end if
  end repeat
end tell
return "missing"
`;
}

async function focusAgentWindowForAction(actionId: string): Promise<void> {
  const sessionKey = agentBubbleActionSessions.get(actionId);
  if (!sessionKey || process.platform !== "darwin") return;
  const target = await resolveAgentWindowTarget(sessionKey);
  if (!target) return;
  const result = await execFileText("/usr/bin/osascript", ["-e", focusAgentWindowScript(target)]);
  if (/focused/i.test(result)) hideBubble();
}

function openExternalUrl(rawUrl: string): void {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return;
    if (url.hostname !== "petdex.crafter.run") return;
    void shell.openExternal(url.toString());
  } catch {
    // Ignore malformed renderer input.
  }
}

// Portable builds can't self-install; they get a link to the release instead.
const IS_PORTABLE = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
const RELEASES_URL = "https://github.com/pradhan-not-found/Companion-/releases/latest";
let updateStatus: UpdateStatus = {
  state: "idle",
  currentVersion: app.getVersion(),
  canInstall: app.isPackaged && !IS_PORTABLE
};

function setUpdateStatus(partial: Partial<UpdateStatus>): void {
  updateStatus = { ...updateStatus, ...partial };
  publishSnapshot();
}

function releaseNotesText(notes: unknown): string | undefined {
  const raw = Array.isArray(notes)
    ? notes.map((entry) => (typeof entry?.note === "string" ? entry.note : "")).join("\n")
    : typeof notes === "string"
      ? notes
      : "";
  // GitHub release notes arrive as HTML; keep them as readable plain text.
  const textOnly = raw
    .replace(/<\/(p|li|h\d)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return textOnly ? textOnly.slice(0, 1200) : undefined;
}

const noteActions = new Map<string, () => void>();

/*
 * Notifications come from the pet: a titled speech bubble you can click.
 * Only when the pet can't speak (signed out, or during a screen block) does
 * it fall back to a Windows notification, so nothing gets lost.
 */
function notify(title: string, body: string, onClick?: () => void): void {
  if (sessionActive && !blockingMode) {
    ensurePetWindowVisible();
    const id = `note-${Date.now()}`;
    if (onClick) noteActions.set(id, onClick);
    stopAmbientRoam(false);
    stopAmbientPose(true);
    setPetState("waving");
    showBubble({ id, message: body, note: { title }, clickActionId: onClick ? id : undefined, autoDismissMs: 9000 });
    setTimeout(() => {
      if (petState === "waving") setPetState(focusActive ? "focusGuard" : "idle");
    }, 2200);
    return;
  }
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title, body, icon: runtimeAssetPath("icon.png"), silent: false });
  if (onClick) notification.on("click", onClick);
  notification.show();
}

function installDownloadedUpdate(): void {
  if (updateStatus.state !== "downloaded" || !updateStatus.canInstall) {
    void shell.openExternal(RELEASES_URL);
    return;
  }
  autoUpdater.quitAndInstall(false, true);
}

/** Registers (or removes) Companion as a sign-in app so it runs in the background. */
function applyLaunchAtLogin(): void {
  if (!app.isPackaged || (process.platform !== "win32" && process.platform !== "darwin")) return;
  const openAtLogin = getSettings().launchAtLogin;
  // The portable exe unpacks to a temp folder on every run; register the real file.
  const exePath = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  try {
    app.setLoginItemSettings({ openAtLogin, path: exePath, args: ["--autostart"] });
  } catch {
    // Login items can be blocked by policy; the app works without it.
  }
}

// While the hello is on screen, agent activity only updates its status pill.
let greetingUntil = 0;

function startupGreeting(name: string): { salutation: string; name: string; line: string } {
  const hour = new Date().getHours();
  const salutation = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const line =
    hour < 5
      ? pick(["Working late? I'm right here.", "Don't forget to rest soon."])
      : hour < 12
        ? pick(["Let's start with a glass of water.", "Ready for a great day?"])
        : hour < 17
          ? pick(["How's the day going?", "A good moment to stretch."])
          : pick(["Nice to see you.", "Let's wrap up the day gently."]);
  return { salutation, name: name.split(/\s+/)[0] ?? "", line };
}

/** The mascot waves hello every time Companion starts (including at sign-in). */
function greetOnStartup(attempt = 0): void {
  const settings = getSettings();
  if (!settings.onboardingDismissed || blockingMode) return;
  // The pet window may still be loading right after launch; wait for it.
  if (!petWindow || petWindow.isDestroyed() || !petWindow.isVisible()) {
    if (attempt < 12) setTimeout(() => greetOnStartup(attempt + 1), 500);
    return;
  }
  stopAmbientRoam(false);
  stopAmbientPose(true);
  clearAgentPose(false);
  setPetState("waving");
  greetingUntil = Date.now() + 5000;
  const greeting = startupGreeting(settings.userName.trim());
  showBubble({
    id: "startup-greeting",
    message: greeting.line,
    greeting: { salutation: greeting.salutation, name: greeting.name },
    autoDismissMs: 5200
  });
  setTimeout(() => {
    if (petState === "waving") setPetState(focusActive ? "focusGuard" : "idle");
    if (!focusActive && !blockingMode) {
      scheduleAmbientRoam();
      scheduleAmbientPose();
    }
  }, 5000);
}

/** Introduces pets that arrived with an update (bundled, but not seen yet). */
function announceNewPets(): void {
  const settings = getSettings();
  if (!settings.onboardingDismissed) return;
  const seen = new Set(settings.seenPetIds);
  const announced = new Set(settings.announcedPetIds);
  // Only pets that genuinely arrived with an update, and only once each.
  const fresh = BUNDLED_PETS.filter((pet) => !seen.has(pet.slug) && !announced.has(pet.slug));
  if (!fresh.length) return;
  setSettings({ ...settings, announcedPetIds: [...announced, ...fresh.map((pet) => pet.slug)] });
  const first = fresh[0];
  const names = fresh.map((pet) => pet.manifest.displayName);
  const headline = fresh.length === 1 ? `Meet ${names[0]}!` : `${fresh.length} new companions arrived`;
  notify(`New companion · ${headline}`, `Say hi to ${names.join(", ")} in Companion.`, () => createSettingsWindow());
  if (blockingMode) return;
  ensurePetWindowVisible();
  stopAmbientRoam(false);
  stopAmbientPose(true);
  setPetState("waving");
  showBubble({
    id: "new-pet",
    message:
      fresh.length === 1
        ? `${first.manifest.displayName} just joined Companion. Want to say hi?`
        : `${names.join(", ")} just joined Companion.`,
    newPet: { slug: first.slug, name: first.manifest.displayName, count: fresh.length },
    actions: [
      { id: "pets:open", label: "Say hi", kind: "primary" },
      { id: "bubble:dismiss", label: "Later" }
    ],
    autoDismissMs: 12_000
  });
  setTimeout(() => {
    if (petState === "waving") setPetState(focusActive ? "focusGuard" : "idle");
  }, 3000);
}

function newerVersion(latest: string, current: string): boolean {
  const parse = (value: string): number[] => value.replace(/^v/i, "").split(/[.-]/).slice(0, 3).map((part) => Number.parseInt(part, 10) || 0);
  const [a, b] = [parse(latest), parse(current)];
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) > (b[index] ?? 0);
  }
  return false;
}

/*
 * Running from source, the app can't install itself, so it asks GitHub
 * Releases directly and offers the download link when a newer build exists.
 */
async function checkGitHubReleases(): Promise<void> {
  if (updateStatus.state === "checking") return;
  setUpdateStatus({ state: "checking", error: undefined });
  try {
    const response = await net.fetch("https://api.github.com/repos/pradhan-not-found/Companion-/releases/latest", {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "Companion-Updater" }
    });
    if (!response.ok) throw new Error(`GitHub responded ${response.status}`);
    const release = (await response.json()) as { tag_name?: string; body?: string };
    const latest = (release.tag_name ?? "").replace(/^v/i, "");
    if (latest && newerVersion(latest, app.getVersion())) {
      setUpdateStatus({
        state: "available",
        version: latest,
        releaseNotes: releaseNotesText(release.body),
        checkedAt: Date.now()
      });
    } else {
      setUpdateStatus({ state: "not-available", version: undefined, checkedAt: Date.now() });
    }
  } catch (error) {
    setUpdateStatus({
      state: "error",
      checkedAt: Date.now(),
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function checkForUpdates(manual = false): Promise<void> {
  if (!app.isPackaged) {
    await checkGitHubReleases();
    return;
  }
  if (updateStatus.state === "checking" || updateStatus.state === "downloading") return;
  if (updateStatus.state === "downloaded") {
    if (manual) installPromptForDownloaded();
    return;
  }
  manualUpdateCheck = manualUpdateCheck || manual;
  setUpdateStatus({ state: "checking", error: undefined });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setUpdateStatus({
      state: "error",
      checkedAt: Date.now(),
      error: error instanceof Error ? error.message : String(error)
    });
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    await dialog.showMessageBox({ type: "error", title: APP_NAME, message: text().system.updateError });
  }
}

async function installPromptForDownloaded(): Promise<void> {
  const labels = text().system;
  const result = await dialog.showMessageBox({
    type: "info",
    title: APP_NAME,
    message: labels.updateDownloaded(updateStatus.version ?? ""),
    buttons: [labels.restartToUpdate, labels.later],
    defaultId: 0,
    cancelId: 1
  });
  if (result.response === 0) installDownloadedUpdate();
}

function scheduleUpdateChecks(): void {
  if (!app.isPackaged) {
    updateCheckTimer = setTimeout(() => void checkGitHubReleases(), 8_000);
    updateCheckInterval = setInterval(() => void checkGitHubReleases(), 6 * 60 * 60 * 1000);
    return;
  }
  autoUpdater.autoDownload = !IS_PORTABLE;
  autoUpdater.autoInstallOnAppQuit = !IS_PORTABLE;

  autoUpdater.on("update-available", async (info) => {
    setUpdateStatus({
      state: IS_PORTABLE ? "available" : "downloading",
      version: info.version,
      progress: 0,
      releaseNotes: releaseNotesText(info.releaseNotes),
      checkedAt: Date.now()
    });
    notify(
      `${APP_NAME} ${info.version} is available`,
      IS_PORTABLE ? "Click to download the new version." : "Downloading in the background — we'll let you know when it's ready.",
      IS_PORTABLE ? () => void shell.openExternal(RELEASES_URL) : () => createSettingsWindow()
    );
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    await dialog.showMessageBox({ type: "info", title: APP_NAME, message: text().system.updateAvailable(info.version) });
  });
  autoUpdater.on("download-progress", (progress) => {
    setUpdateStatus({ state: "downloading", progress: Math.round(progress.percent) });
  });
  autoUpdater.on("update-not-available", async () => {
    setUpdateStatus({ state: "not-available", checkedAt: Date.now(), version: undefined });
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    await dialog.showMessageBox({ type: "info", title: APP_NAME, message: text().system.updateNotAvailable });
  });
  autoUpdater.on("update-downloaded", async (info) => {
    setUpdateStatus({
      state: "downloaded",
      version: info.version,
      progress: 100,
      releaseNotes: releaseNotesText(info.releaseNotes) ?? updateStatus.releaseNotes
    });
    notify(`${APP_NAME} ${info.version} is ready`, "Click to restart and update now.", installDownloadedUpdate);
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    await installPromptForDownloaded();
  });
  autoUpdater.on("error", async (error) => {
    setUpdateStatus({ state: "error", checkedAt: Date.now(), error: error?.message ?? String(error) });
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    await dialog.showMessageBox({ type: "error", title: APP_NAME, message: text().system.updateError });
  });

  updateCheckTimer = setTimeout(() => void checkForUpdates(false), 30_000);
  updateCheckInterval = setInterval(() => void checkForUpdates(false), 6 * 60 * 60 * 1000);
}

function titleLooksBusy(title: string): boolean {
  return /running|working|thinking|generating|executing|building|applying|processing|in progress|正在|运行|执行|生成|思考|处理中|…/.test(
    title.toLowerCase()
  );
}

function titleLooksDone(title: string): boolean {
  return /complete|completed|finished|done|success|ready|waiting for input|needs review|changes applied|任务完成|完成|已完成|等待输入|成功/.test(
    title.toLowerCase()
  );
}

function titleLooksFailed(title: string): boolean {
  return /failed|failure|error|blocked|crashed|报错|失败|错误|无法继续/.test(title.toLowerCase());
}

function execFileText(file: string, args: string[], timeout = 1500): Promise<string> {
  return new Promise((resolveText) => {
    execFile(file, args, { timeout }, (_error, stdout) => {
      resolveText(stdout);
    });
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function eventTimeMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = stringValue(value);
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") return null;
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function hashText(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function rememberAgentEvent(id: string): void {
  agentSeenEventIds.add(id);
  if (agentSeenEventIds.size <= 500) return;
  const first = agentSeenEventIds.values().next().value;
  if (typeof first === "string") agentSeenEventIds.delete(first);
}

function markAgentSessionWorking(event: Pick<AgentMonitorEvent, "sessionKey">): void {
  agentActiveSessions.set(event.sessionKey, Date.now());
  for (const [sessionKey, lastSeenAt] of agentActiveSessions) {
    if (Date.now() - lastSeenAt > AGENT_EVENT_MAX_AGE_MS) {
      agentActiveSessions.delete(sessionKey);
    }
  }
}

function hasRecentAgentWork(event: Pick<AgentMonitorEvent, "sessionKey">): boolean {
  const lastSeenAt = agentActiveSessions.get(event.sessionKey);
  return Boolean(lastSeenAt && Date.now() - lastSeenAt <= AGENT_EVENT_MAX_AGE_MS);
}

function listRecentFiles(root: string, extension: string, maxFiles: number, maxDepth = 5): string[] {
  if (!existsSync(root)) return [];
  const files: Array<{ path: string; mtimeMs: number }> = [];

  function walk(directory: string, depth: number): void {
    if (depth < 0) return;
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path, depth - 1);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(extension)) continue;
      try {
        files.push({ path, mtimeMs: statSync(path).mtimeMs });
      } catch {
        // Ignore files that disappear while sessions rotate.
      }
    }
  }

  walk(root, maxDepth);
  return files
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, maxFiles)
    .map((file) => file.path);
}

function readTextTail(path: string, maxBytes = 96_000): string {
  const stat = statSync(path);
  const start = Math.max(0, stat.size - maxBytes);
  const length = stat.size - start;
  const buffer = Buffer.alloc(length);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buffer, 0, length, start);
  } finally {
    closeSync(fd);
  }
  return buffer.toString("utf8");
}

function parseJsonLinesTail(path: string): Array<Record<string, unknown>> {
  try {
    const text = readTextTail(path);
    const lines = text.split("\n");
    if (!text.startsWith("{")) lines.shift();
    return lines
      .map((line) => {
        try {
          return asRecord(JSON.parse(line));
        } catch {
          return null;
        }
      })
      .filter((line): line is Record<string, unknown> => Boolean(line));
  } catch {
    return [];
  }
}

function unknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function extractTextFromContent(content: unknown, typeName: string): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      const record = asRecord(part);
      if (!record || record.type !== typeName) return "";
      return stringValue(record.text);
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

function compactAgentText(text: string): string {
  const plain = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const firstSentence = plain.match(/^.{8,90}?[。！？.!?](?=\s|$)/)?.[0] ?? plain;
  return firstSentence.length > 58 ? `${firstSentence.slice(0, 56)}...` : firstSentence;
}

function classifyAgentProgressKind(text: string, fallback: AgentProgressKind = "working"): AgentProgressKind {
  if (/(权限|授权|批准|允许|permission|approval|authorize|grant access|allow access|sandbox)/i.test(text)) {
    return "permission";
  }
  if (/(选择|选项|决定|确认方案|二选一|choose|pick|select|option|decision|which one)/i.test(text)) {
    return "choice";
  }
  if (/(脚本|命令|终端|执行.*(pnpm|npm|yarn|node|python|pytest|tsc|shell)|script|command|terminal|exec_command|write_stdin|running command|shell)/i.test(text)) {
    return "script";
  }
  if (/(工具|调用|tool|function_call)/i.test(text)) return "tool";
  if (/(思考|推理|reasoning|thinking)/i.test(text)) return "thinking";
  if (/(需要|review|attention|done|完成|停下)/i.test(text)) return "review";
  return fallback;
}

function classifyAgentText(text: string): Omit<AgentMonitorEvent, "id" | "source" | "sessionKey" | "timestampMs"> | null {
  const compact = compactAgentText(text);
  if (!compact) return null;

  const progressKind = classifyAgentProgressKind(text);

  if (progressKind === "permission") {
    return {
      kind: "needs-review",
      message: compact,
      progressKind,
      state: "reviewing"
    };
  }

  if (progressKind === "choice") {
    return {
      kind: "needs-review",
      message: compact,
      progressKind,
      state: "reviewing"
    };
  }

  if (/(报错|失败|没有通过|无法继续|blocked|failed|error)/i.test(text)) {
    return {
      kind: "failed",
      message: compact,
      progressKind: "failed",
      state: "failed"
    };
  }

  if (/(等待你|需要你|请你|需要确认|可以看|去看一眼|waiting for input|needs review|review it)/i.test(text)) {
    return {
      kind: "needs-review",
      message: compact,
      progressKind: "review",
      state: "reviewing"
    };
  }

  if (
    /^(已|都|好，?已|装好|修好|完成|All done|Done|Fixed|Ready)/i.test(compact) ||
    /(已修完|已处理|已完成|修好了|完成了|安装完成|改好了|实现了|重启应用|done\.?|fixed\.?|ready\.?)/i.test(text)
  ) {
    return {
      kind: "complete",
      message: compact,
      progressKind: "complete",
      state: "waving"
    };
  }

  if (/(我会|我先|现在|接下来|正在|先看|先确认|thinking|working|running|executing|processing|applying)/i.test(text)) {
    return {
      kind: "working",
      message: compact,
      progressKind,
      state: "thinking"
    };
  }

  return null;
}

function agentProgressMessage(event: Pick<AgentMonitorEvent, "source" | "message" | "progressKind">): string {
  const labels = text().bubble;
  const progressKind = event.progressKind ?? classifyAgentProgressKind(event.message);
  if (progressKind === "permission") return pick(labels.agentNeedsPermission)(event.source);
  if (progressKind === "choice") return pick(labels.agentNeedsChoice)(event.source);
  if (progressKind === "script") return pick(labels.agentRunningScript)(event.source);
  if (progressKind === "tool") return pick(labels.agentUsingTool)(event.source);
  if (progressKind === "thinking") return pick(labels.agentThinking)(event.source);
  if (progressKind === "review") return pick(labels.agentNeedsReview)(event.source);
  return pick(labels.agentWorking)(event.source);
}

function agentEventMessage(event: AgentMonitorEvent): string {
  const labels = text().bubble;
  if (event.kind === "failed") return pick(labels.agentFailed)(event.source);
  if (event.progressKind === "permission") return pick(labels.agentNeedsPermission)(event.source);
  if (event.progressKind === "choice") return pick(labels.agentNeedsChoice)(event.source);
  if (event.kind === "needs-review") return pick(labels.agentNeedsReview)(event.source);
  return pick(labels.agentComplete)(event.source);
}

function playAgentCompletionSound(event: AgentMonitorEvent): void {
  if (!getSettings().agentCompletionSoundEnabled) return;
  if (event.kind !== "complete" && event.kind !== "failed") return;
  if (process.platform === "darwin") {
    const sound = event.kind === "failed" ? "Basso.aiff" : "Glass.aiff";
    execFile(
      "/usr/bin/afplay",
      [join("/System/Library/Sounds", sound)],
      { timeout: 2500 },
      (error) => {
        if (!error) return;
        execFile("/usr/bin/osascript", ["-e", "beep 1"], { timeout: 1500 }, () => {
          shell.beep();
        });
      }
    );
    return;
  }
  shell.beep();
}

function makeAgentEvent(
  source: AgentSource,
  path: string,
  timestampMs: number,
  text: string,
  classified: Omit<AgentMonitorEvent, "id" | "source" | "sessionKey" | "timestampMs">
): AgentMonitorEvent {
  return {
    ...classified,
    id: `${source}:${path}:${timestampMs}:${classified.kind}:${hashText(text)}`,
    source,
    sessionKey: `${source}:${path}`,
    timestampMs
  };
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const key = process.platform === "win32" ? value.toLowerCase() : value;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique;
}

function windowsAppDataRoots(): string[] {
  if (process.platform !== "win32") return [];
  const home = app.getPath("home");
  return uniqueStrings([
    process.env.APPDATA,
    process.env.LOCALAPPDATA,
    join(home, "AppData", "Roaming"),
    join(home, "AppData", "Local")
  ]);
}

function companionAgentEventFiles(fileName: string, override?: string): string[] {
  const home = app.getPath("home");
  const windowsFiles = windowsAppDataRoots().map((root) =>
    join(root, "Companion", "agent-events", fileName)
  );
  return uniqueStrings([
    override,
    join(home, ".local", "share", "companion", "agent-events", fileName),
    join(home, "Library", "Application Support", "Companion", "agent-events", fileName),
    join(app.getPath("userData"), "agent-events", fileName),
    ...windowsFiles
  ]).filter((file) => existsSync(file));
}

function openCodeHookEventFiles(): string[] {
  return companionAgentEventFiles("opencode.jsonl", process.env.COMPANION_AGENT_EVENTS);
}

function hermesHookEventFiles(): string[] {
  return uniqueStrings([
    ...companionAgentEventFiles("hermes.jsonl", process.env.COMPANION_HERMES_AGENT_EVENTS),
    ...companionAgentEventFiles("hermes.jsonl", process.env.COMPANION_AGENT_EVENTS)
  ]);
}

function agentEventKind(value: string): AgentEventKind | null {
  if (value === "complete" || value === "failed" || value === "needs-review" || value === "working") {
    return value;
  }
  return null;
}

function agentProgressKind(value: string): AgentProgressKind | undefined {
  if (
    value === "working" ||
    value === "thinking" ||
    value === "tool" ||
    value === "script" ||
    value === "choice" ||
    value === "permission" ||
    value === "review" ||
    value === "complete" ||
    value === "failed"
  ) {
    return value;
  }
  return undefined;
}

function stateForAgentEvent(kind: AgentEventKind, progressKind?: AgentProgressKind): PetState {
  if (kind === "failed") return "failed";
  if (kind === "needs-review") return "reviewing";
  if (kind === "complete") return "waving";
  if (progressKind === "tool" || progressKind === "script" || progressKind === "thinking") return "thinking";
  return "thinking";
}

function normalizeOpenCodeRawEvent(
  record: Record<string, unknown>
): Omit<AgentMonitorEvent, "id" | "source" | "sessionKey" | "timestampMs"> | null {
  const type = stringValue(record.type);
  const message = stringValue(record.message);

  if (type === "session.idle") {
    return {
      kind: "complete",
      message: message || "OpenCode session is idle",
      progressKind: "complete",
      state: "waving"
    };
  }

  if (type === "session.next.step.started") {
    return {
      kind: "working",
      message: message || "OpenCode is working",
      progressKind: "thinking",
      state: "thinking"
    };
  }

  if (
    type === "session.next.tool.called" ||
    type === "session.next.tool.input.started" ||
    type === "tool.execute.before"
  ) {
    const tool = stringValue(record.tool);
    return {
      kind: "working",
      message: tool || message || "OpenCode is using a tool",
      progressKind: classifyAgentProgressKind(tool || message || "tool", "tool"),
      state: "thinking"
    };
  }

  if (type === "session.next.shell.started") {
    return {
      kind: "working",
      message: stringValue(record.command) || message || "OpenCode is running a command",
      progressKind: "script",
      state: "thinking"
    };
  }

  if (type === "permission.asked" || type === "permission.ask") {
    return {
      kind: "needs-review",
      message: message || "OpenCode needs permission",
      progressKind: "permission",
      state: "reviewing"
    };
  }

  if (type === "question.asked") {
    return {
      kind: "needs-review",
      message: message || "OpenCode needs a choice",
      progressKind: "choice",
      state: "reviewing"
    };
  }

  if (type === "session.error" || type === "session.next.step.failed") {
    return {
      kind: "failed",
      message: message || "OpenCode ran into a problem",
      progressKind: "failed",
      state: "failed"
    };
  }

  return null;
}

function normalizeHermesRawEvent(
  record: Record<string, unknown>
): Omit<AgentMonitorEvent, "id" | "source" | "sessionKey" | "timestampMs"> | null {
  const eventName = stringValue(record.event) || stringValue(record.type) || stringValue(record.hook_event_name);
  const message = stringValue(record.message);

  if (eventName === "on_session_finalize" || eventName === "on_session_end") {
    return {
      kind: "complete",
      message: message || "Hermes session finished",
      progressKind: "complete",
      state: "waving"
    };
  }

  if (eventName === "pre_approval_request") {
    return {
      kind: "needs-review",
      message: message || "Hermes needs permission",
      progressKind: "permission",
      state: "reviewing"
    };
  }

  if (eventName === "post_approval_response") {
    const choice = stringValue(record.choice);
    if (choice === "deny" || choice === "timeout") {
      return {
        kind: "failed",
        message: message || "Hermes approval was denied",
        progressKind: "failed",
        state: "failed"
      };
    }
    return null;
  }

  if (eventName === "pre_llm_call" || eventName === "post_llm_call") {
    return {
      kind: "working",
      message: message || "Hermes is thinking",
      progressKind: "thinking",
      state: "thinking",
      showProgress: eventName === "post_llm_call" ? false : undefined
    };
  }

  if (eventName === "pre_tool_call" || eventName === "post_tool_call") {
    const toolName = stringValue(record.tool_name) || stringValue(record.toolName) || stringValue(record.tool);
    const progressKind = classifyAgentProgressKind(toolName || message || "tool", "tool");
    return {
      kind: "working",
      message: toolName || message || "Hermes is using a tool",
      progressKind,
      state: "thinking",
      showProgress: eventName === "post_tool_call" ? false : undefined
    };
  }

  return null;
}

function eventTimestampMs(record: Record<string, unknown>): number {
  const raw =
    record.timestampMs ??
    record.timestamp_ms ??
    record.timestamp ??
    record.time ??
    record.created_at ??
    record.createdAt;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw < 10_000_000_000 ? raw * 1000 : raw;
  const parsed = Date.parse(stringValue(raw));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeOpenCodeHookEvent(record: Record<string, unknown>, file: string): AgentMonitorEvent | null {
  const timestampMs =
    typeof record.timestampMs === "number" && Number.isFinite(record.timestampMs)
      ? record.timestampMs
      : typeof record.timestamp === "number" && Number.isFinite(record.timestamp)
        ? record.timestamp
        : null;
  if (timestampMs === null) return null;

  const rawKind = agentEventKind(stringValue(record.kind));
  const progressKind = agentProgressKind(stringValue(record.progressKind));
  const classified =
    rawKind === null
      ? normalizeOpenCodeRawEvent(record)
      : {
          kind: rawKind,
          message: stringValue(record.message) || "OpenCode updated",
          progressKind,
          state: stateForAgentEvent(rawKind, progressKind)
        };
  if (!classified) return null;

  const sessionID = stringValue(record.sessionID) || stringValue(record.sessionId) || "unknown";
  const rawId = stringValue(record.id) || `${sessionID}:${timestampMs}:${classified.kind}:${hashText(classified.message)}`;
  return {
    ...classified,
    id: `OpenCode:${rawId}`,
    source: "OpenCode",
    sessionKey: `OpenCode:${sessionID || file}`,
    timestampMs,
    showProgress: record.showProgress === false ? false : undefined
  };
}

function collectOpenCodeHookEvents(): AgentMonitorEvent[] {
  const events: AgentMonitorEvent[] = [];
  for (const file of openCodeHookEventFiles()) {
    for (const line of parseJsonLinesTail(file)) {
      const event = normalizeOpenCodeHookEvent(line, file);
      if (event) events.push(event);
    }
  }
  return events;
}

function normalizeHermesHookEvent(record: Record<string, unknown>, file: string): AgentMonitorEvent | null {
  const source = stringValue(record.source);
  if (source && !/hermes/i.test(source)) return null;

  const kind = agentEventKind(stringValue(record.kind));
  const progressKind = agentProgressKind(stringValue(record.progressKind) || stringValue(record.progress_kind));
  const classified =
    kind === null
      ? normalizeHermesRawEvent(record)
      : {
          kind,
          message: stringValue(record.message) || "Hermes updated",
          progressKind,
          state: stateForAgentEvent(kind, progressKind)
        };
  if (!classified) return null;

  const timestampMs = eventTimestampMs(record);
  const sessionId =
    stringValue(record.session_id) ||
    stringValue(record.sessionID) ||
    stringValue(record.sessionId) ||
    stringValue(record.session_key) ||
    stringValue(record.task_id) ||
    "unknown";
  const rawId =
    stringValue(record.id) ||
    `${sessionId}:${timestampMs}:${classified.kind}:${hashText(classified.message)}`;

  return {
    ...classified,
    id: `Hermes:${rawId}`,
    source: "Hermes",
    sessionKey: `Hermes:${sessionId || file}`,
    timestampMs,
    showProgress: record.showProgress === false || record.show_progress === false ? false : classified.showProgress
  };
}

function collectHermesHookEvents(): AgentMonitorEvent[] {
  const events: AgentMonitorEvent[] = [];
  for (const file of hermesHookEventFiles()) {
    for (const line of parseJsonLinesTail(file)) {
      const event = normalizeHermesHookEvent(line, file);
      if (event) events.push(event);
    }
  }
  return events;
}

function hermesSessionRoots(): string[] {
  return uniqueStrings([
    process.env.COMPANION_HERMES_SESSIONS,
    process.env.HERMES_SESSIONS_DIR,
    join(app.getPath("home"), ".hermes", "sessions")
  ]);
}

function hermesMessageText(message: Record<string, unknown>): string {
  const content = message.content;
  if (typeof content === "string") return content;
  return unknownArray(content)
    .map((part) => {
      if (typeof part === "string") return part;
      const record = asRecord(part);
      if (!record) return "";
      return stringValue(record.text) || stringValue(record.content);
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

function collectHermesSessionEvents(): AgentMonitorEvent[] {
  const files = uniqueStrings(
    hermesSessionRoots().flatMap((root) => listRecentFiles(root, ".json", 6))
  ).slice(0, 12);
  const events: AgentMonitorEvent[] = [];

  for (const file of files) {
    try {
      const data = asRecord(JSON.parse(readFileSync(file, "utf8")));
      if (!data) continue;
      const messages = unknownArray(data.messages).map(asRecord).filter((message): message is Record<string, unknown> => Boolean(message));
      const lastMessage = messages.at(-1);
      if (!lastMessage) continue;

      const sessionId = stringValue(data.session_id) || file;
      const timestampMs = eventTimeMs(data.last_updated) ?? statSync(file).mtimeMs;
      const messageCount = numberValue(data.message_count) ?? messages.length;
      const role = stringValue(lastMessage.role);
      const sessionKey = `Hermes:${sessionId}`;

      if (role === "user") {
        events.push({
          id: `Hermes:session:${sessionId}:${messageCount}:user:${timestampMs}`,
          source: "Hermes",
          sessionKey,
          kind: "working",
          message: "Hermes is thinking",
          progressKind: "thinking",
          state: "thinking",
          timestampMs
        });
        continue;
      }

      if (role !== "assistant") continue;

      const text = hermesMessageText(lastMessage);
      const classified = classifyAgentText(text);
      const hasTerminalState = classified?.kind === "failed" || classified?.kind === "needs-review";
      const terminalTimestampMs = Math.max(0, timestampMs - (hasTerminalState ? 0 : 1));
      events.push({
        id: `Hermes:session:${sessionId}:${messageCount}:working:${timestampMs}`,
        source: "Hermes",
        sessionKey,
        kind: "working",
        message: stringValue(lastMessage.reasoning) || stringValue(lastMessage.reasoning_content) || "Hermes is thinking",
        progressKind: "thinking",
        state: "thinking",
        timestampMs: Math.max(0, timestampMs - 1000),
        showProgress: false
      });
      events.push({
        id: `Hermes:session:${sessionId}:${messageCount}:assistant:${timestampMs}`,
        source: "Hermes",
        sessionKey,
        kind: classified?.kind ?? "complete",
        message: classified?.message ?? "Hermes replied",
        progressKind: classified?.progressKind ?? "complete",
        state: classified?.state ?? "waving",
        timestampMs: terminalTimestampMs
      });
    } catch {
      // Ignore partially-written session files.
    }
  }

  return events;
}

function openCodeDatabasePath(): string | null {
  const home = app.getPath("home");
  const xdgDataHome = process.env.XDG_DATA_HOME || join(home, ".local", "share");
  const candidates = uniqueStrings([
    join(xdgDataHome, "opencode", "opencode.db"),
    join(home, ".local", "share", "opencode", "opencode.db"),
    join(home, "Library", "Application Support", "opencode", "opencode.db"),
    join(home, "AppData", "Roaming", "opencode", "opencode.db")
  ]);
  return candidates.find((file) => existsSync(file)) ?? null;
}

async function execSqliteJson(databasePath: string, sql: string): Promise<Array<Record<string, unknown>>> {
  const candidates = uniqueStrings([
    process.env.SQLITE3_PATH,
    process.platform === "darwin" ? "/usr/bin/sqlite3" : undefined,
    "sqlite3"
  ]);

  for (const executable of candidates) {
    if (isAbsolute(executable) && !existsSync(executable)) continue;
    const output = await execFileText(executable, ["-json", databasePath, sql], 1800);
    const trimmed = output.trim();
    if (!trimmed.startsWith("[")) continue;
    try {
      const rows = JSON.parse(trimmed);
      if (Array.isArray(rows)) {
        return rows.filter((row): row is Record<string, unknown> => Boolean(asRecord(row)));
      }
    } catch {
      // Try the next sqlite executable candidate.
    }
  }

  return [];
}

function normalizeOpenCodeDatabasePart(row: Record<string, unknown>): AgentMonitorEvent | null {
  const timestampMs = numberValue(row.time_updated) ?? numberValue(row.time_created);
  if (timestampMs === null) return null;

  const part = parseJsonRecord(row.part_data);
  const message = parseJsonRecord(row.message_data);
  if (!part || !message) return null;

  const partId = stringValue(row.id);
  const messageId = stringValue(row.message_id);
  const sessionID = stringValue(row.session_id) || "unknown";
  const role = stringValue(message.role);
  const type = stringValue(part.type);
  if (!partId || !type) return null;

  const base = {
    id: `OpenCode:db:${sessionID}:${messageId}:${partId}:${timestampMs}`,
    source: "OpenCode" as const,
    sessionKey: `OpenCode:${sessionID}`,
    timestampMs
  };

  if (role === "user" && type === "text") {
    return {
      ...base,
      kind: "working",
      message: "OpenCode is thinking",
      progressKind: "thinking",
      state: "thinking"
    };
  }

  if (role !== "assistant") return null;

  if (type === "step-start" || type === "reasoning") {
    return {
      ...base,
      kind: "working",
      message: "OpenCode is thinking",
      progressKind: "thinking",
      state: "thinking",
      showProgress: false
    };
  }

  if (type === "text") {
    return {
      ...base,
      kind: "working",
      message: compactAgentText(stringValue(part.text) || "OpenCode is responding"),
      progressKind: "thinking",
      state: "thinking",
      showProgress: false
    };
  }

  if (/tool|command|bash|shell/i.test(type)) {
    const tool = stringValue(part.tool) || stringValue(part.name) || stringValue(part.command) || type;
    return {
      ...base,
      kind: "working",
      message: tool,
      progressKind: classifyAgentProgressKind(tool, "tool"),
      state: "thinking"
    };
  }

  if (type === "step-finish") {
    const reason = stringValue(part.reason);
    const failed = /error|fail|cancel/i.test(reason);
    return {
      ...base,
      kind: failed ? "failed" : "complete",
      message: failed ? "OpenCode ran into a problem" : "OpenCode session is idle",
      progressKind: failed ? "failed" : "complete",
      state: failed ? "failed" : "waving"
    };
  }

  return null;
}

async function collectOpenCodeDatabaseEvents(): Promise<AgentMonitorEvent[]> {
  const databasePath = openCodeDatabasePath();
  if (!databasePath) return [];

  const newestAllowedAt = Date.now() - AGENT_EVENT_MAX_AGE_MS - 30_000;
  const rows = await execSqliteJson(
    databasePath,
    `select p.id, p.session_id, p.message_id, p.time_created, p.time_updated, p.data as part_data, m.data as message_data
from part p join message m on m.id = p.message_id
where p.time_updated >= ${Math.max(0, newestAllowedAt)}
order by p.time_updated asc
limit 120`
  );

  return rows
    .map(normalizeOpenCodeDatabasePart)
    .filter((event): event is AgentMonitorEvent => Boolean(event));
}

function deepSeekSessionRoot(): string {
  return join(app.getPath("home"), ".deepseek", "sessions");
}

function deepSeekAuditLogPath(): string {
  return join(app.getPath("home"), ".deepseek", "audit.log");
}

function extractDeepSeekContentText(content: unknown, typeName: string): string {
  return unknownArray(content)
    .map((part) => {
      const record = asRecord(part);
      if (!record || record.type !== typeName) return "";
      return stringValue(record.text) || stringValue(record.thinking);
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

function lastDeepSeekMessage(messages: unknown): Record<string, unknown> | null {
  const records = unknownArray(messages)
    .map(asRecord)
    .filter((message): message is Record<string, unknown> => Boolean(message));
  return records.at(-1) ?? null;
}

function deepSeekToolNames(content: unknown): string[] {
  return uniqueStrings(
    unknownArray(content)
      .map(asRecord)
      .filter((part): part is Record<string, unknown> => part !== null && part.type === "tool_use")
      .map((part) => stringValue(part.name))
  );
}

function makeDeepSeekEvent(
  file: string,
  sessionId: string,
  timestampMs: number,
  suffix: string,
  classified: Omit<AgentMonitorEvent, "id" | "source" | "sessionKey" | "timestampMs">
): AgentMonitorEvent {
  return {
    ...classified,
    id: `DeepSeek TUI:${file}:${sessionId}:${timestampMs}:${suffix}`,
    source: "DeepSeek TUI",
    sessionKey: `DeepSeek TUI:${sessionId || file}`,
    timestampMs
  };
}

function collectDeepSeekSessionEvents(): AgentMonitorEvent[] {
  const files = listRecentFiles(deepSeekSessionRoot(), ".json", 6);
  const events: AgentMonitorEvent[] = [];

  for (const file of files) {
    try {
      const data = asRecord(JSON.parse(readFileSync(file, "utf8")));
      const metadata = asRecord(data?.metadata);
      if (!data || !metadata) continue;

      const sessionId = stringValue(metadata.id) || file;
      const timestampMs = eventTimeMs(metadata.updated_at) ?? statSync(file).mtimeMs;
      const lastMessage = lastDeepSeekMessage(data.messages);
      if (!lastMessage) continue;

      const role = stringValue(lastMessage.role);
      const content = lastMessage.content;
      const text = extractDeepSeekContentText(content, "text");
      const thinking = extractDeepSeekContentText(content, "thinking");
      const toolNames = deepSeekToolNames(content);

      if (role === "user") {
        const message = compactAgentText(text || "DeepSeek TUI is thinking");
        events.push(
          makeDeepSeekEvent(file, sessionId, timestampMs, `user:${hashText(message)}`, {
            kind: "working",
            message: "DeepSeek TUI is thinking",
            progressKind: "thinking",
            state: "thinking"
          })
        );
        continue;
      }

      if (role !== "assistant") continue;

      if (thinking || toolNames.length > 0) {
        const tool = toolNames.at(-1);
        events.push(
          makeDeepSeekEvent(file, sessionId, Math.max(0, timestampMs - 1000), `working:${hashText(thinking || tool || "")}`, {
            kind: "working",
            message: tool || "DeepSeek TUI is thinking",
            progressKind: tool ? classifyAgentProgressKind(tool, "tool") : "thinking",
            state: "thinking",
            showProgress: false
          })
        );
      }

      const classified = classifyAgentText(text);
      events.push(
        makeDeepSeekEvent(file, sessionId, timestampMs, `assistant:${hashText(text)}`, {
          kind: classified?.kind ?? "complete",
          message: classified?.message ?? compactAgentText(text || "DeepSeek TUI responded"),
          progressKind: classified?.progressKind ?? "complete",
          state: classified?.state ?? "waving"
        })
      );
    } catch {
      // Ignore partially-written session files.
    }
  }

  return events;
}

function collectDeepSeekAuditEvents(): AgentMonitorEvent[] {
  const file = deepSeekAuditLogPath();
  if (!existsSync(file)) return [];

  const events: AgentMonitorEvent[] = [];
  for (const line of parseJsonLinesTail(file)) {
    const timestampMs = eventTimeMs(line.ts);
    const details = asRecord(line.details);
    if (timestampMs === null || !details) continue;

    const eventName = stringValue(line.event);
    const sessionId = stringValue(details.session_id) || file;
    const toolName = stringValue(details.tool_name);
    const mode = stringValue(details.mode);
    const base = {
      source: "DeepSeek TUI" as const,
      sessionKey: `DeepSeek TUI:${sessionId}`,
      timestampMs
    };

    if (eventName === "tool.approval.prompted") {
      events.push({
        ...base,
        id: `DeepSeek TUI:audit:${sessionId}:${timestampMs}:permission:${toolName}`,
        kind: "needs-review",
        message: toolName || "DeepSeek TUI needs permission",
        progressKind: "permission",
        state: "reviewing"
      });
      continue;
    }

    if (/tool\.approval\.auto_approve|tool\.approval\.approved/i.test(eventName)) {
      events.push({
        ...base,
        id: `DeepSeek TUI:audit:${sessionId}:${timestampMs}:tool:${toolName}:${mode}`,
        kind: "working",
        message: toolName || "DeepSeek TUI is using a tool",
        progressKind: classifyAgentProgressKind(toolName, "tool"),
        state: "thinking"
      });
    }
  }

  return events;
}

function collectCodexSessionEvents(): AgentMonitorEvent[] {
  const sessionsRoot = join(app.getPath("home"), ".codex", "sessions");
  const files = listRecentFiles(sessionsRoot, ".jsonl", 4);
  const events: AgentMonitorEvent[] = [];

  for (const file of files) {
    for (const line of parseJsonLinesTail(file)) {
      if (line.type !== "response_item") continue;
      const payload = asRecord(line.payload);
      if (!payload) continue;
      const timestampMs = eventTimeMs(line.timestamp);
      if (timestampMs === null) continue;
      const payloadType = stringValue(payload.type);

      if (payloadType === "message") {
        const text = extractTextFromContent(payload.content, "output_text");
        const classified = classifyAgentText(text);
        if (classified) events.push(makeAgentEvent("Codex", file, timestampMs, text, classified));
        continue;
      }

      if (payloadType === "function_call" || payloadType === "reasoning") {
        const callName = stringValue(payload.name);
        const progressKind = payloadType === "reasoning"
          ? "thinking"
          : classifyAgentProgressKind(callName || "正在执行工具", "tool");
        events.push({
          id: `Codex:${file}:${timestampMs}:${payloadType}`,
          source: "Codex",
          sessionKey: `Codex:${file}`,
          kind: "working",
          message: payloadType === "function_call" ? callName || "正在执行工具" : "正在思考",
          progressKind,
          state: "thinking",
          timestampMs
        });
      }
    }
  }

  return events;
}

function collectClaudeSessionEvents(): AgentMonitorEvent[] {
  const projectRoot = join(app.getPath("home"), ".claude", "projects");
  const files = listRecentFiles(projectRoot, ".jsonl", 5, 3);
  const events: AgentMonitorEvent[] = [];

  for (const file of files) {
    for (const line of parseJsonLinesTail(file)) {
      const signal = parseClaudeLogRecord(line);
      if (!signal) continue;

      if (signal.kind === "working") {
        events.push({
          id: `Claude Code:${file}:${signal.id}`,
          source: "Claude Code",
          sessionKey: `Claude Code:${file}`,
          kind: "working",
          message: signal.message || "正在执行工具",
          progressKind: signal.progressKind,
          state: "thinking",
          timestampMs: signal.timestampMs
        });
        continue;
      }

      const classified = classifyAgentText(signal.text) ?? {
        kind: "complete" as const,
        message: compactAgentText(signal.text),
        progressKind: "complete" as const,
        state: "waving" as const
      };
      events.push({
        ...makeAgentEvent("Claude Code", file, signal.timestampMs, signal.text, classified),
        id: `Claude Code:${file}:${signal.id}:${classified.kind}`
      });
    }
  }

  return events;
}

function collectClaudeStatusEvents(): AgentMonitorEvent[] {
  const sessionsRoot = join(app.getPath("home"), ".claude", "sessions");
  const files = listRecentFiles(sessionsRoot, ".json", 8, 1);
  const events: AgentMonitorEvent[] = [];

  for (const file of files) {
    try {
      const data = asRecord(JSON.parse(readFileSync(file, "utf8")));
      if (!data) continue;
      const sessionId = stringValue(data.sessionId) || file;
      const status = stringValue(data.status);
      const previous = claudeSessionStatuses.get(sessionId);
      claudeSessionStatuses.set(sessionId, status);
      if (!previous || previous === status) continue;

      const timestampMs =
        typeof data.updatedAt === "number" && Number.isFinite(data.updatedAt)
          ? data.updatedAt
          : Date.now();
      if (status === "idle" && /busy|running|working|processing/i.test(previous)) {
        events.push({
          id: `Claude Code:${sessionId}:${timestampMs}:idle`,
          source: "Claude Code",
          sessionKey: `Claude Code:${sessionId}`,
          kind: "complete",
          message: "任务已停下，可以看结果",
          progressKind: "complete",
          state: "waving",
          timestampMs
        });
      }
      if (/busy|running|working|processing/i.test(status)) {
        events.push({
          id: `Claude Code:${sessionId}:${timestampMs}:busy`,
          source: "Claude Code",
          sessionKey: `Claude Code:${sessionId}`,
          kind: "working",
          message: "Claude Code 正在处理任务",
          progressKind: "working",
          state: "thinking",
          timestampMs,
          showProgress: false
        });
      }
      if (/error|failed/i.test(status)) {
        events.push({
          id: `Claude Code:${sessionId}:${timestampMs}:failed`,
          source: "Claude Code",
          sessionKey: `Claude Code:${sessionId}`,
          kind: "failed",
          message: "任务状态变成失败",
          progressKind: "failed",
          state: "failed",
          timestampMs
        });
      }
    } catch {
      // Ignore incomplete status files while Claude Code is writing them.
    }
  }

  return events;
}

let agentActivity: AgentActivity | null = null;
let agentActivityExpiryTimer: NodeJS.Timeout | null = null;

function agentStatusFor(
  event: Pick<AgentMonitorEvent, "kind" | "message" | "progressKind">,
  working: boolean
): AgentStatus {
  const progressKind = event.progressKind ?? (working ? classifyAgentProgressKind(event.message) : undefined);
  if (progressKind === "permission") return "permission";
  if (progressKind === "choice") return "choice";
  if (!working) {
    if (event.kind === "failed") return "failed";
    if (event.kind === "needs-review" || progressKind === "review") return "needs-review";
    return "complete";
  }
  if (progressKind === "script") return "script";
  if (progressKind === "tool") return "tool";
  if (progressKind === "thinking") return "thinking";
  if (progressKind === "review") return "needs-review";
  return "working";
}

/** Publishes the live agent status pill; it fades out after `ttlMs` of silence. */
function setAgentActivity(source: AgentSource, status: AgentStatus, ttlMs: number): AgentActivity {
  agentActivity = { source, status, updatedAt: Date.now() };
  if (agentActivityExpiryTimer) clearTimeout(agentActivityExpiryTimer);
  agentActivityExpiryTimer = setTimeout(() => {
    agentActivity = null;
    agentActivityExpiryTimer = null;
    publishSnapshot();
  }, ttlMs);
  publishSnapshot();
  return agentActivity;
}

function clearAgentPose(restoreState: boolean): void {
  if (agentPoseTimer) {
    clearTimeout(agentPoseTimer);
    agentPoseTimer = null;
  }
  if (restoreState && agentPoseActiveState && petState === agentPoseActiveState) {
    setPetState(focusActive ? "focusGuard" : "idle");
  }
  agentPoseActiveState = null;
}

function showAgentWorkingPose(
  event: Pick<AgentMonitorEvent, "source" | "sessionKey" | "message" | "progressKind" | "timestampMs">
): void {
  rememberAgentSession(event);
  const status = agentStatusFor({ kind: "working", message: event.message, progressKind: event.progressKind }, true);
  // Ordinary progress (thinking, tools, commands) stays silent: the pet only
  // speaks up when the agent is blocked on you.
  if (status !== "permission" && status !== "choice") return;
  pokeUser({
    source: event.source,
    status,
    message: agentProgressMessage(event),
    clickActionId: registerAgentBubbleAction(event),
    bubbleId: `agent-${status}-${event.timestampMs}`
  });
}

const POKE_REPEAT_MS = 15_000;
const lastPokeAt = new Map<string, number>();

/*
 * Gets the user's attention for an agent: a quick hop, a branded card bubble,
 * a chime, and a Windows notification when the agent's own window isn't the
 * one in front.
 */
function pokeUser(poke: {
  source: AgentSource;
  status: AgentStatus;
  message: string;
  clickActionId?: string;
  bubbleId: string;
}): boolean {
  if (blockingMode || currentBubble?.actions?.length) return false;
  const now = Date.now();
  const key = `${poke.source}|${poke.status}`;
  if (now - (lastPokeAt.get(key) ?? 0) < POKE_REPEAT_MS) return false;
  lastPokeAt.set(key, now);

  const failed = poke.status === "failed";
  const activity = setAgentActivity(poke.source, poke.status, 45_000);
  if (getSettings().agentCompletionSoundEnabled) shell.beep();

  if (now < greetingUntil) return true;
  ensurePetWindowVisible();
  stopAmbientRoam(false);
  stopAmbientPose(true);
  clearAgentPose(false);
  // A short hop first (the "poke"), then settle into the reaction pose.
  setPetState(failed ? "failed" : "jumping");
  agentPoseActiveState = failed ? "failed" : "jumping";
  if (!failed) {
    agentPoseTimer = setTimeout(() => {
      agentPoseTimer = null;
      if (petState === "jumping") {
        setPetState("waving");
        agentPoseActiveState = "waving";
      }
    }, 1300);
  }

  const displayMs = Math.max(bubbleDisplayMs(), 8000);
  showBubble({
    id: poke.bubbleId,
    message: poke.message,
    agent: activity,
    clickActionId: poke.clickActionId,
    autoDismissMs: displayMs
  });
  setTimeout(() => {
    if (currentBubble?.id === poke.bubbleId) hideBubble();
    if (petState === "waving" || petState === "jumping" || petState === "failed") {
      setPetState(focusActive ? "focusGuard" : "idle");
    }
    agentPoseActiveState = null;
    if (!focusActive && !blockingMode) {
      scheduleAmbientRoam(5000);
      scheduleAmbientPose();
    }
  }, displayMs + 200);
  return true;
}

function agentPokeHeadline(status: AgentStatus): string {
  if (status === "permission") return "needs your approval";
  if (status === "choice") return "is waiting for your choice";
  if (status === "needs-review") return "is ready for your review";
  if (status === "failed") return "ran into a problem";
  return "is done — waiting for your prompt";
}

function notifyAgentEvent(event: AgentMonitorEvent): boolean {
  rememberAgentSession(event);
  const poked = pokeUser({
    source: event.source,
    status: agentStatusFor(event, false),
    message: agentEventMessage(event),
    clickActionId: registerAgentBubbleAction(event),
    bubbleId: `agent-${event.kind}-${event.timestampMs}`
  });
  if (poked) agentLastNotificationAt = Date.now();
  return poked;
}

async function checkAgentActivityNow(): Promise<void> {
  if (!getSettings().agentActivityEnabled) return;
  try {
    const now = Date.now();
    const newestAllowedAt = now - AGENT_EVENT_MAX_AGE_MS;
    const events = [
      ...collectCodexSessionEvents(),
      ...collectClaudeSessionEvents(),
      ...collectClaudeStatusEvents(),
      ...collectOpenCodeHookEvents(),
      ...(await collectOpenCodeDatabaseEvents()),
      ...collectDeepSeekSessionEvents(),
      ...collectDeepSeekAuditEvents(),
      ...collectHermesSessionEvents(),
      ...collectHermesHookEvents()
    ]
      .filter((event) => event.timestampMs >= newestAllowedAt && event.timestampMs <= now + 30_000)
      .sort((left, right) => left.timestampMs - right.timestampMs);
    const active = await readActiveWindow().catch(() => null);

    if (!agentMonitorPrimed) {
      const latestWorking = events.filter((event) => event.kind === "working").at(-1);
      for (const event of events) {
        rememberAgentSession(event);
        rememberAgentEvent(event.id);
      }
      agentMonitorPrimed = true;
      if (
        latestWorking &&
        now - latestWorking.timestampMs < 30_000 &&
        shouldTrustAgentSessionEvent(latestWorking, active)
      ) {
        rememberAgentWindowTargetForEvent(latestWorking, active);
        markAgentSessionWorking(latestWorking);
        if (latestWorking.showProgress !== false) showAgentWorkingPose(latestWorking);
      }
      return;
    }

    for (const event of events) {
      rememberAgentSession(event);
      if (agentSeenEventIds.has(event.id)) continue;
      if (event.kind === "working") {
        rememberAgentEvent(event.id);
        if (!shouldTrustAgentSessionEvent(event, active)) continue;
        rememberAgentWindowTargetForEvent(event, active);
        markAgentSessionWorking(event);
        if (event.showProgress !== false) showAgentWorkingPose(event);
        continue;
      }
      if (!hasRecentAgentWork(event)) {
        rememberAgentEvent(event.id);
        continue;
      }
      rememberAgentWindowTargetForEvent(event, active);
      if (notifyAgentEvent(event)) rememberAgentEvent(event.id);
    }

    if (!active) return;
    const activeSource = sourceFromAgentWindow(active.appName, active.windowTitle);
    if (!activeSource) return;
    const activeSessionKey = activeWindowAgentSessionKey(activeSource, active.appName);
    if (titleLooksBusy(active.windowTitle)) {
      const event: AgentMonitorEvent = {
        id: `${activeSessionKey}:${hashText(active.windowTitle)}:window-working`,
        source: activeSource,
        sessionKey: activeSessionKey,
        kind: "working",
        message: "Agent is working",
        progressKind: "working",
        state: "thinking",
        timestampMs: Date.now()
      };
      rememberAgentWindowTarget(event, active);
      markAgentSessionWorking(event);
      showAgentWorkingPose(event);
    }
    if (
      (titleLooksDone(active.windowTitle) || titleLooksFailed(active.windowTitle)) &&
      hasRecentAgentWork({ sessionKey: activeSessionKey })
    ) {
      const isFailed = titleLooksFailed(active.windowTitle);
      const needsReview = /waiting for input|needs review|等待输入|需要处理|需要确认/i.test(active.windowTitle);
      const event: AgentMonitorEvent = {
        id: `${activeSessionKey}:${hashText(active.windowTitle)}:window-${isFailed ? "failed" : "done"}`,
        source: activeSource,
        sessionKey: activeSessionKey,
        kind: isFailed ? "failed" : needsReview ? "needs-review" : "complete",
        message: isFailed ? "Agent failed" : needsReview ? "Agent may need review" : "Agent completed",
        progressKind: isFailed ? "failed" : needsReview ? "review" : "complete",
        state: isFailed ? "failed" : needsReview ? "reviewing" : "waving",
        timestampMs: Date.now()
      };
      rememberAgentWindowTarget(event, active);
      if (!agentSeenEventIds.has(event.id) && notifyAgentEvent(event)) rememberAgentEvent(event.id);
    }
  } catch {
    // Local agent state is best-effort; missing logs or permissions should stay quiet.
  }
}

function scheduleAgentActivityMonitor(): void {
  if (agentActivityTimer) {
    clearInterval(agentActivityTimer);
    agentActivityTimer = null;
  }
  if (!getSettings().agentActivityEnabled) return;
  agentActivityTimer = setInterval(
    () => void checkAgentActivityNow(),
    AGENT_ACTIVITY_CHECK_INTERVAL_MS
  );
  void checkAgentActivityNow();
}

function petLibrarySignature(): string {
  return getSettings()
    .installedPets.map((pet) => `${pet.slug}:${pet.importedAt}`)
    .sort()
    .join("|");
}

function schedulePetLibraryMonitor(): void {
  if (petLibraryTimer) clearInterval(petLibraryTimer);
  lastPetLibrarySignature = petLibrarySignature();
  petLibraryTimer = setInterval(() => {
    const next = petLibrarySignature();
    if (next === lastPetLibrarySignature) return;
    lastPetLibrarySignature = next;
    sendToAll("settings:updated", getSettings());
    publishSnapshot();
  }, PET_LIBRARY_CHECK_INTERVAL_MS);
}

function parseMacBatteryStatus(output: string): BatteryStatus | null {
  const percentMatch = output.match(/(\d+)%/);
  if (!percentMatch) return null;
  const percent = Number(percentMatch[1]);
  if (!Number.isFinite(percent)) return null;
  const isCharging =
    /AC Power/i.test(output) || /;\s*(charging|charged|finishing charge)\s*;/i.test(output);
  return { percent, isCharging };
}

function parseWindowsBatteryStatus(output: string): BatteryStatus | null {
  const trimmed = output.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as {
      EstimatedChargeRemaining?: unknown;
      BatteryStatus?: unknown;
    };
    const percent =
      typeof parsed.EstimatedChargeRemaining === "number"
        ? parsed.EstimatedChargeRemaining
        : Number(parsed.EstimatedChargeRemaining);
    if (!Number.isFinite(percent)) return null;
    const status = Number(parsed.BatteryStatus);
    const isCharging = status !== 1;
    return { percent, isCharging };
  } catch {
    return null;
  }
}

async function readBatteryStatus(): Promise<BatteryStatus | null> {
  if (process.platform === "darwin") {
    const output = await execFileText("/usr/bin/pmset", ["-g", "batt"], 2000).catch(() => "");
    return parseMacBatteryStatus(output);
  }

  if (process.platform === "win32") {
    const output = await execFileText(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Battery | Select-Object -First 1 EstimatedChargeRemaining,BatteryStatus | ConvertTo-Json -Compress"
      ],
      3000
    ).catch(() => "");
    return parseWindowsBatteryStatus(output);
  }

  return null;
}

function showLowBatteryAlert(percent: number): void {
  ensurePetWindowVisible();
  stopAmbientRoam(false);
  stopAmbientPose(true);
  clearAgentPose(true);
  setPetState("sad");
  showBubble({
    id: `low-battery-${Date.now()}`,
    message: pick(text().bubble.lowBattery)(percent),
    autoDismissMs: 5000
  });
  setTimeout(() => {
    if (!blockingMode && !focusActive && petState === "sad") {
      setPetState("idle");
      scheduleAmbientRoam();
      scheduleAmbientPose();
    }
  }, bubbleSettleMs());
}

async function checkBatteryNow(): Promise<void> {
  const status = await readBatteryStatus();
  if (!status) return;
  if (status.isCharging || status.percent > LOW_BATTERY_THRESHOLD_PERCENT) {
    lowBatteryAlertArmed = true;
    return;
  }

  const now = Date.now();
  if (!lowBatteryAlertArmed && now - lastLowBatteryAlertAt < LOW_BATTERY_ALERT_COOLDOWN_MS) return;
  lowBatteryAlertArmed = false;
  lastLowBatteryAlertAt = now;
  showLowBatteryAlert(Math.round(status.percent));
}

function scheduleBatteryMonitor(): void {
  if (batteryMonitorTimer) clearInterval(batteryMonitorTimer);
  batteryMonitorTimer = setInterval(() => void checkBatteryNow(), BATTERY_CHECK_INTERVAL_MS);
  void checkBatteryNow();
}

function resumeLongTermState(): void {
  blockingMode = null;
  hideBubble();
  if (focusActive) {
    setPetState("focusGuard");
    sendToAll("app:snapshot", snapshot());
    return;
  }
  setPetState("idle");
  sendToAll("app:snapshot", snapshot());
  scheduleAmbientRoam();
  scheduleAmbientPose();
}

function happyFeedback(message: string | null = pick(text().bubble.woof), after?: () => void): void {
  if (blockingMode) return;
  stopAmbientRoam(false);
  stopAmbientPose(true);
  const returnState = focusActive ? "focusGuard" : "idle";
  setPetState("happy");
  if (message) {
    showBubble({ id: "happy", message, autoDismissMs: 1800 });
  }
  setTimeout(() => {
    hideBubble();
    setPetState(returnState);
    if (returnState === "idle") {
      scheduleAmbientRoam();
      scheduleAmbientPose();
    }
    after?.();
  }, message ? bubbleSettleMs() : 1900);
}

function simplePetReaction(state: PetState, durationMs: number, message: string | null = null): void {
  if (blockingMode) return;
  stopAmbientRoam(false);
  stopAmbientPose(true);
  clearAgentPose(true);
  const returnState = focusActive ? "focusGuard" : "idle";
  setPetState(state);
  if (message) showBubble({ id: `click-${state}-${Date.now()}`, message, autoDismissMs: durationMs - 100 });
  setTimeout(() => {
    if (message) hideBubble();
    if (petState === state) setPetState(returnState);
    if (returnState === "idle") {
      scheduleAmbientRoam(1200);
      scheduleAmbientPose();
    }
  }, durationMs);
}

function randomPetClickReaction(): void {
  const reaction = pick([
    "happy",
    "sad",
    "waving",
    "jumping",
    "thinking",
    "run-left",
    "run-right"
  ] as const);
  if (reaction === "run-left" || reaction === "run-right") {
    startClickRunReaction(reaction === "run-left" ? "left" : "right");
    return;
  }
  if (reaction === "happy") {
    happyFeedback(Math.random() > 0.5 ? pick(text().bubble.woof) : null);
    return;
  }
  simplePetReaction(reaction, reaction === "sad" ? 1500 : 1300);
}

function triggerBreakReminder(fromDemo: boolean): void {
  if (blockingMode === "focusWarning" || blockingMode === "breakRun") return;
  if (!fromDemo && (focusActive || breakMutedToday)) {
    scheduleReminderTimers();
    return;
  }
  if (!fromDemo && getSettings().screenBlockReminderEnabled) {
    startBreakRun();
    return;
  }
  ensurePetWindowVisible();
  stopAmbientRoam(false);
  stopAmbientPose(true);
  blockingMode = "break";
  breakDueAt = null;
  breakSnoozeDueAt = null;
  publishSnapshot();
  setPetState("breakPrompt");
  const labels = text();
  showBubble({
    id: "break",
    message: pick(labels.bubble.breakReminder),
    actions: [
      { id: "break:done", label: labels.actions.breakDone, kind: "primary" },
      { id: "break:snooze", label: labels.actions.breakSnooze },
      { id: "break:mute", label: labels.actions.breakMute, kind: "danger" }
    ]
  });
}

function triggerHydrationReminder(fromDemo: boolean): void {
  if (blockingMode || (!fromDemo && focusActive)) {
    scheduleReminderTimers();
    return;
  }
  ensurePetWindowVisible();
  stopAmbientRoam(false);
  stopAmbientPose(true);
  blockingMode = "hydration";
  hydrationDueAt = null;
  publishSnapshot();
  setPetState("hydrationPrompt");
  const labels = text();
  showBubble({
    id: "hydration",
    message: pick(labels.bubble.hydrationReminder),
    actions: [
      { id: "hydration:done", label: labels.actions.hydrationDone, kind: "primary" },
      { id: "hydration:snooze", label: labels.actions.hydrationSnooze }
    ]
  });
}

function nextCustomReminderDueAt(time: string, from = Date.now()): number {
  const [hours, minutes] = time.split(":").map(Number);
  const due = new Date(from);
  due.setHours(hours, minutes, 0, 0);
  if (due.getTime() <= from) due.setDate(due.getDate() + 1);
  return due.getTime();
}

function clearCustomReminderTimers(): void {
  for (const timer of customReminderTimers.values()) {
    clearTimeout(timer);
  }
  customReminderTimers.clear();
}

function scheduleCustomReminderTimers(): void {
  clearCustomReminderTimers();
  for (const reminder of getSettings().customReminders) {
    if (!reminder.enabled || !isValidReminderTime(reminder.time)) continue;
    const dueAt = nextCustomReminderDueAt(reminder.time);
    const delay = Math.max(500, dueAt - Date.now());
    customReminderTimers.set(
      reminder.id,
      setTimeout(() => triggerCustomReminder(reminder.id), delay)
    );
  }
}

function triggerCustomReminder(reminderId: string): void {
  const settings = getSettings();
  const reminder = settings.customReminders.find((entry) => entry.id === reminderId);
  if (!reminder || !reminder.enabled) {
    scheduleCustomReminderTimers();
    return;
  }

  if (blockingMode) {
    customReminderTimers.set(
      reminder.id,
      setTimeout(() => triggerCustomReminder(reminder.id), 60_000)
    );
    return;
  }

  ensurePetWindowVisible();
  stopAmbientRoam(false);
  stopAmbientPose(true);
  clearAgentPose(true);
  if (reminder.enlargePetOnDue) {
    setPetScaleOverride(
      Math.min(MAX_CUSTOM_REMINDER_PET_SCALE, settings.petScale * reminder.duePetScaleMultiplier)
    );
  } else if (petScaleOverride) {
    setPetScaleOverride(null);
  }
  setPetState("waving");
  showBubble({
    id: `custom-reminder-${reminder.id}-${Date.now()}`,
    message: pick(text().bubble.customReminder)(reminder.title),
    actions: [
      {
        id: `custom-reminder:dismiss:${reminder.id}`,
        label: text().actions.customReminderDone,
        kind: "primary"
      }
    ]
  });
  scheduleCustomReminderTimers();
  publishSnapshot();
}

function finishFocusWarning(): void {
  if (focusWarningTimer) {
    clearTimeout(focusWarningTimer);
    focusWarningTimer = null;
  }
  if (blockingMode !== "focusWarning") return;
  blockingMode = null;
  restorePetWindowAfterScreenBlock();
  hideBubble();
  setPetState(focusActive ? "focusGuard" : "idle");
  publishSnapshot();
}

function triggerFocusWarning(rule?: string): void {
  if (blockingMode === "breakRun") return;
  ensurePetWindowVisible();
  stopAmbientRoam(false);
  stopAmbientPose(true);
  if (!focusActive) startFocusMode();
  blockingMode = "focusWarning";
  expandPetWindowForScreenBlock(1);
  updateStats((stats) => ({ ...stats, focusWarnings: stats.focusWarnings + 1 }));
  setPetState("focusAlert");
  sendToAll("app:snapshot", snapshot());
  const labels = text();
  const warningMs = bubbleDisplayMs();
  showBubble({
    id: "focus-warning",
    message: pick(labels.bubble.focusWarning)(rule ?? "?"),
    actions: [
      { id: "focus:back", label: labels.actions.focusBack, kind: "primary" },
      { id: "focus:end", label: labels.actions.focusEnd }
    ],
    autoDismissMs: 5000
  });
  if (focusWarningTimer) clearTimeout(focusWarningTimer);
  focusWarningTimer = setTimeout(finishFocusWarning, warningMs);
}

function startFocusMode(): void {
  if (focusActive || blockingMode) return;
  ensurePetWindowVisible();
  stopAmbientRoam(false);
  stopAmbientPose(true);
  const settings = getSettings();
  focusActive = true;
  focusStartedAt = Date.now();
  blockingMode = null;
  setPetState("focusGuard");
  focusEndsAt = Date.now() + settings.focusDurationMinutes * 60 * 1000;
  saveFocusSession(focusStartedAt, focusEndsAt);
  sendToAll("app:snapshot", snapshot());
  showBubble({
    id: "focus-start",
    message: pick(text().bubble.focusStart)(settings.focusDurationMinutes),
    autoDismissMs: 4500
  });
  if (focusTimer) clearTimeout(focusTimer);
  focusTimer = setTimeout(
    () => stopFocusMode(true),
    settings.focusDurationMinutes * 60 * 1000
  );
  scheduleDistractionDetection();
  updateTrayMenu();
}

function stopFocusMode(completed: boolean): void {
  if (!focusActive) return;
  const startedAt = focusStartedAt ?? Date.now();
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
  if (blockingMode === "focusWarning") {
    if (focusWarningTimer) {
      clearTimeout(focusWarningTimer);
      focusWarningTimer = null;
    }
    restorePetWindowAfterScreenBlock();
    hideBubble();
  }
  focusActive = false;
  focusStartedAt = null;
  blockingMode = null;
  clearFocusSession();
  if (focusTimer) {
    clearTimeout(focusTimer);
    focusTimer = null;
  }
  focusEndsAt = null;
  scheduleDistractionDetection();
  updateStats((stats) => ({
    ...stats,
    focusMinutes: stats.focusMinutes + elapsedMinutes
  }));
  sendToAll("app:snapshot", snapshot());
  setPetState("focusDone");
  showBubble({
    id: "focus-complete",
    message: completed ? pick(text().bubble.focusComplete) : pick(text().bubble.focusCancelled),
    autoDismissMs: 2800
  });
  setTimeout(() => {
    if (!focusActive && !blockingMode) {
      hideBubble();
      setPetState("idle");
      scheduleAmbientRoam();
      scheduleAmbientPose();
    }
  }, bubbleSettleMs());
  updateTrayMenu();
}

function triggerDemo(trigger: DemoTrigger): void {
  ensurePetWindowVisible();
  if (trigger === "break") triggerBreakReminder(true);
  if (trigger === "hydration") triggerHydrationReminder(true);
  if (trigger === "focusWarning") triggerFocusWarning("Twitter");
  if (trigger === "happy") happyFeedback(pick(text().bubble.woof));
  if (trigger === "agentDone") {
    lastPokeAt.clear();
    pokeUser({
      source: "Claude Code",
      status: "complete",
      message: "Claude Code finished the task. It's your turn.",
      bubbleId: `demo-agent-${Date.now()}`
    });
  }
  if (trigger === "agentApproval") {
    lastPokeAt.clear();
    pokeUser({
      source: "Codex",
      status: "permission",
      message: "Codex wants to run a command and needs your approval.",
      bubbleId: `demo-agent-${Date.now()}`
    });
  }
}

function handleBubbleAction(actionId: string): void {
  const noteAction = noteActions.get(actionId);
  if (noteAction) {
    noteActions.delete(actionId);
    hideBubble();
    noteAction();
    return;
  }
  if (actionId === "pets:open") {
    hideBubble();
    createSettingsWindow();
    return;
  }
  if (actionId === "bubble:dismiss") {
    hideBubble();
    return;
  }
  if (getSettings().lyricsModeEnabled) return;
  if (actionId.startsWith("agent:open:")) {
    void focusAgentWindowForAction(actionId);
    return;
  }
  if (actionId.startsWith("custom-reminder:dismiss:")) {
    setPetScaleOverride(null);
    hideBubble();
    if (!blockingMode) {
      setPetState(focusActive ? "focusGuard" : "idle");
      if (!focusActive) {
        scheduleAmbientRoam();
        scheduleAmbientPose();
      }
    }
    publishSnapshot();
    return;
  }
  if (actionId === "break-run:done") {
    finishBreakRun();
    return;
  }
  if (actionId === "break-run:snooze") {
    clearBreakRunTimers();
    breakRunFormatter = null;
    blockingMode = null;
    screenBlockEndsAt = null;
    restorePetWindowAfterScreenBlock();
    resumeLongTermState();
    if (breakTimer) clearTimeout(breakTimer);
    breakDueAt = Date.now() + 10 * 60 * 1000;
    breakSnoozeDueAt = breakDueAt;
    breakTimer = setTimeout(() => triggerBreakReminder(false), 10 * 60 * 1000);
    publishSnapshot();
    return;
  }
  if (actionId === "break:done") {
    if (getSettings().screenBlockReminderEnabled) {
      startBreakRun();
    } else {
      updateStats((stats) => ({ ...stats, breaksTaken: stats.breaksTaken + 1 }));
      resumeLongTermState();
      scheduleReminderTimers();
    }
    return;
  }
  if (actionId === "break:snooze") {
    resumeLongTermState();
    if (breakTimer) clearTimeout(breakTimer);
    breakDueAt = Date.now() + 10 * 60 * 1000;
    breakSnoozeDueAt = breakDueAt;
    breakTimer = setTimeout(() => triggerBreakReminder(false), 10 * 60 * 1000);
    publishSnapshot();
    return;
  }
  if (actionId === "break:mute") {
    breakMutedToday = true;
    breakDueAt = null;
    breakSnoozeDueAt = null;
    blockingMode = null;
    sendToAll("app:snapshot", snapshot());
    setPetState("sad");
    showBubble({ id: "break-muted", message: pick(text().bubble.breakIgnore), autoDismissMs: 2600 });
    setTimeout(resumeLongTermState, bubbleSettleMs());
    return;
  }
  if (actionId === "hydration:done") {
    updateStats((stats) => ({ ...stats, watersLogged: stats.watersLogged + 1 }));
    blockingMode = null;
    sendToAll("app:snapshot", snapshot());
    setPetState("drinking");
    hideBubble();
    setTimeout(() => {
      if (blockingMode) return;
      setPetState("hydrationDone");
      showBubble({ id: "hydration-complete", message: pick(text().bubble.hydrationDone), autoDismissMs: 1800 });
      setTimeout(() => {
        hideBubble();
        setPetState(focusActive ? "focusGuard" : "idle");
        scheduleReminderTimers();
      }, bubbleSettleMs());
    }, 2400);
    return;
  }
  if (actionId === "hydration:snooze") {
    resumeLongTermState();
    if (hydrationTimer) clearTimeout(hydrationTimer);
    hydrationDueAt = Date.now() + 15 * 60 * 1000;
    hydrationTimer = setTimeout(() => triggerHydrationReminder(false), 15 * 60 * 1000);
    publishSnapshot();
    return;
  }
  if (actionId === "focus:back") {
    if (blockingMode === "focusWarning") {
      finishFocusWarning();
      showBubble({ id: "focus-back", message: pick(text().bubble.focusBack), autoDismissMs: 1800 });
      return;
    }
    blockingMode = null;
    sendToAll("app:snapshot", snapshot());
    setPetState("focusGuard");
    showBubble({ id: "focus-back", message: pick(text().bubble.focusBack), autoDismissMs: 1800 });
    setTimeout(() => {
      if (focusActive && !blockingMode) hideBubble();
    }, bubbleSettleMs());
    return;
  }
  if (actionId === "focus:end") {
    if (blockingMode === "focusWarning") {
      finishFocusWarning();
    }
    stopFocusMode(false);
  }
}

function registerIpc(): void {
  ipcMain.handle("app:get-snapshot", () => snapshot());
  ipcMain.handle("pet:import-package", async () => {
    const result = await chooseAndImportPet();
    if (!result.ok) return result;
    const settings = getSettings();
    const installedPets = [
      ...settings.installedPets.filter((pet) => pet.slug !== result.pet.slug),
      result.pet
    ];
    setSettings({
      ...settings,
      installedPets,
      selectedPetId: result.pet.slug
    });
    sendToAll("pet:imported", result.pet);
    return result;
  });
  ipcMain.handle("pet:list-installed", () => getSettings().installedPets);
  ipcMain.handle("pet:delete", async (_event, petId: string) => {
    const result = await deleteInstalledPet(petId);
    if (!result.ok) return result;
    setSettings(getSettings());
    publishSnapshot();
    return result;
  });
  ipcMain.on("pet:select", (_event, petId: string) => {
    setSettings({ ...getSettings(), selectedPetId: petId });
  });
  ipcMain.on("break:start-screen-block", startBreakRun);
  ipcMain.on("break:end-screen-block", finishBreakRun);
  ipcMain.on("pet:clicked", () => {
    notePetInteraction();
    if (blockingMode || getSettings().lyricsModeEnabled) return;
    if (getSettings().clipboardPouchEnabled) {
      togglePouchWindow();
      return;
    }
    randomPetClickReaction();
  });
  ipcMain.on("pet:context-menu", showPetContextMenu);
  ipcMain.on("pet:drag-start", (_event, offset: { offsetX: number; offsetY: number }) => {
    notePetInteraction();
    startPetDrag(offset);
  });
  ipcMain.on("pet:drag-stop", () => {
    stopPetDrag();
    updatePetWindowMouseEvents();
  });
  ipcMain.on("pet:pointer-interactive", (_event, interactive: unknown) => {
    petPointerInteractive = interactive === true;
    updatePetWindowMouseEvents();
  });
  ipcMain.on("bubble:action", (_event, actionId: string) => {
    notePetInteraction();
    handleBubbleAction(actionId);
  });
  ipcMain.on("app:open-external", (_event, url: string) => openExternalUrl(url));
  ipcMain.on("settings:update", (_event, partial: Partial<Settings>) => {
    const before = getSettings();
    setSettings({ ...before, ...partial });
    const after = getSettings();
    if (after.launchAtLogin !== before.launchAtLogin) applyLaunchAtLogin();
    if (after.clipboardPouchEnabled !== before.clipboardPouchEnabled) applyPouchSetting();
    if (
      after.petCheckInsEnabled !== before.petCheckInsEnabled ||
      after.petCheckInMinutes !== before.petCheckInMinutes
    ) {
      scheduleCheckIn();
    }
    // First run: say hello as soon as onboarding is finished.
    if (!before.onboardingDismissed && after.onboardingDismissed) setTimeout(() => greetOnStartup(), 600);
  });
  ipcMain.on("demo:trigger", (_event, trigger: DemoTrigger) => triggerDemo(trigger));
  ipcMain.on("focus:start", startFocusMode);
  ipcMain.on("focus:stop", () => stopFocusMode(false));
  ipcMain.on("stats:reset-today", resetTodayStats);
  ipcMain.handle("profile:choose-avatar", async () => {
    const options: Electron.OpenDialogOptions = {
      title: "Choose a profile photo",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"] }]
    };
    const result =
      settingsWindow && !settingsWindow.isDestroyed()
        ? await dialog.showOpenDialog(settingsWindow, options)
        : await dialog.showOpenDialog(options);
    const filePath = result.filePaths[0];
    if (result.canceled || !filePath) return { ok: false, error: "cancelled" };
    const image = nativeImage.createFromPath(filePath);
    if (image.isEmpty()) return { ok: false, error: "That image format isn't supported. Try a PNG or JPG." };
    // Center-crop to a square and keep it small: it lives in the settings file.
    const { width, height } = image.getSize();
    const side = Math.min(width, height);
    const square = image
      .crop({ x: Math.floor((width - side) / 2), y: Math.floor((height - side) / 2), width: side, height: side })
      .resize({ width: 256, height: 256, quality: "best" });
    const avatarImage = `data:image/jpeg;base64,${square.toJPEG(88).toString("base64")}`;
    setSettings({ ...getSettings(), avatarImage });
    return { ok: true };
  });
  ipcMain.handle("auth:create", (_event, input: { name: string; email: string; password: string }) => {
    if (typeof input?.email !== "string" || typeof input?.password !== "string" || typeof input?.name !== "string") {
      return { ok: false, error: "Please fill in every field." };
    }
    const result = createAccount(input, STORE_NAME);
    if (!result.ok) return result;
    store = storeForSession();
    // A new account always starts with onboarding (pick and name a companion).
    setSettings({ ...getSettings(), userName: result.account.name, onboardingDismissed: false });
    startSession();
    publishSnapshot();
    return result;
  });
  // Development only: one-click sign-in to a demo account to try the app.
  ipcMain.handle("auth:demo", () => {
    if (app.isPackaged) return { ok: false, error: "Demo sign-in is only available in development." };
    const demo = { name: "Demo User", email: "demo@companion.local", password: "companion-demo" };
    let result = signIn(demo);
    if (!result.ok) result = createAccount(demo, STORE_NAME);
    if (!result.ok) return result;
    store = storeForSession();
    if (!getSettings().userName) setSettings({ ...getSettings(), userName: result.account.name });
    startSession();
    publishSnapshot();
    return result;
  });
  ipcMain.handle("auth:sign-in", (_event, input: { email: string; password: string }) => {
    if (typeof input?.email !== "string" || typeof input?.password !== "string") {
      return { ok: false, error: "Please enter your email and password." };
    }
    const result = signIn(input);
    if (!result.ok) return result;
    store = storeForSession();
    if (!getSettings().userName) setSettings({ ...getSettings(), userName: result.account.name });
    startSession();
    publishSnapshot();
    return result;
  });
  ipcMain.handle("auth:sign-out", () => {
    endSession();
    signOut();
    store = storeForSession();
    publishSnapshot();
    return { ok: true };
  });
  ipcMain.handle("auth:update-profile", (_event, changes: { name?: string }) => {
    const account = currentAccount();
    if (!account) return { ok: false, error: "You're signed out." };
    // The sign-in email is fixed once the account exists; only the name changes.
    const result = updateProfile(account.id, {
      name: typeof changes?.name === "string" ? changes.name : undefined
    });
    if (result.ok) setSettings({ ...getSettings(), userName: result.account.name });
    publishSnapshot();
    return result;
  });
  ipcMain.handle("auth:change-password", (_event, input: { current: string; next: string }) => {
    const account = currentAccount();
    if (!account) return { ok: false, error: "You're signed out." };
    if (typeof input?.current !== "string" || typeof input?.next !== "string") {
      return { ok: false, error: "Please fill in both password fields." };
    }
    return changePassword(account.id, input.current, input.next);
  });
  ipcMain.handle("pouch:list", () => listPouch());
  ipcMain.handle("pouch:copy", (_event, id: unknown) => (typeof id === "string" ? copyPouchItem(id) : false));
  ipcMain.on("pouch:remove", (_event, id: unknown) => {
    if (typeof id === "string") removePouchItem(id);
  });
  ipcMain.on("pouch:clear", () => clearPouch());
  ipcMain.on("pouch:close", () => closePouchWindow());
  ipcMain.on("helpboard:break", () => {
    closePouchWindow();
    if (!blockingMode) triggerBreakReminder(true);
  });
  ipcMain.on("helpboard:dashboard", () => {
    closePouchWindow();
    createSettingsWindow();
  });
  ipcMain.on("update:check", () => void checkForUpdates(false));
  ipcMain.on("update:install", installDownloadedUpdate);
  ipcMain.on("pets:mark-seen", (_event, petIds: unknown) => {
    if (!Array.isArray(petIds)) return;
    const ids = petIds.filter((id): id is string => typeof id === "string");
    const settings = getSettings();
    const seen = new Set([...settings.seenPetIds, ...ids]);
    setSettings({ ...settings, seenPetIds: [...seen] });
  });
  ipcMain.on("hydration:log", () => {
    if (blockingMode && blockingMode !== "hydration") return;
    handleBubbleAction("hydration:done");
  });
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "companion-asset",
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
  }
]);

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  registerWindowsNotificationIdentity();
  const handleAssetRequest = (request: Request) => {
    let requestedPath = "";
    try {
      const url = new URL(request.url);
      requestedPath = decodeURIComponent(url.pathname.replace(/^\//, ""));
    } catch {
      return new Response("Invalid asset URL", { status: 404 });
    }

    const base = app.isPackaged ? process.resourcesPath : process.cwd();
    const bundledPetRoot = resolve(base, "pets");
    const petRoot = userPetsRoot();
    const legacyPetRoot = legacyUserPetsRoot();
    const assetPath = isAbsolute(requestedPath)
      ? resolve(requestedPath)
      : resolve(base, requestedPath);
    const isInsideBundledPetRoot =
      assetPath === bundledPetRoot || assetPath.startsWith(`${bundledPetRoot}${sep}`);
    const isInsidePetRoot = assetPath === petRoot || assetPath.startsWith(`${petRoot}${sep}`);
    const isInsideLegacyPetRoot =
      assetPath === legacyPetRoot || assetPath.startsWith(`${legacyPetRoot}${sep}`);

    if (!isInsideBundledPetRoot && !isInsidePetRoot && !isInsideLegacyPetRoot) {
      return new Response("Asset not found", { status: 404 });
    }

    return net.fetch(pathToFileURL(assetPath).href);
  };

  protocol.handle("companion-asset", handleAssetRequest);

  registerIpc();
  createTray();
  scheduleUpdateChecks();
  applyLaunchAtLogin();
  if (currentAccount()) {
    startSession();
  } else {
    // Signed out: only the welcome / sign-in window.
    createSettingsWindow();
  }

  app.on("activate", () => {
    if (sessionActive && !petWindow) createPetWindow();
    if (!sessionActive) createSettingsWindow();
  });
});

function applyPouchSetting(): void {
  if (sessionActive && getSettings().clipboardPouchEnabled) {
    startPouch(sendPouch);
    // Warm the Compboard window in the background so the first click opens instantly.
    setTimeout(() => {
      if (sessionActive && getSettings().clipboardPouchEnabled && !pouchWindow) ensurePouchWindow();
    }, 2500);
  } else {
    stopPouch();
    clearPouch();
    destroyPouchWindow();
  }
}

// ── Check-ins: the pet keeps you company ─────────────────────
const CHECK_IN_LINES = [
  "Hey, you doing okay?",
  "Quick check-in: how's the vibe?",
  "You're doing great. No cap.",
  "Shoulders down, jaw unclenched. Better?",
  "Proud of you for showing up today.",
  "Remember to blink. Lowkey important.",
  "You've got this, fr fr.",
  "Just checking in. That's it, that's the message.",
  "Sip some water? Hydration is the main character.",
  "Stretch for a sec? Your back will thank you.",
  "Main character energy today. Keep going.",
  "Breathe in... and out. Nice.",
  "Little reminder: you're doing better than you think.",
  "Still here, still rooting for you."
];
const MISS_YOU_LINES = [
  "I miss you. Come say hi?",
  "Hellooo? Your little buddy is right here.",
  "Not me waiting for you to click me...",
  "It's giving... ignored. Pat me?",
  "Psst. Over here.",
  "I've been so patient. One click?",
  "Did you forget about me? Rude, but I still like you.",
  "Come back, I saved you a spot on the desktop."
];
const MISS_YOU_AFTER_MS = 20 * 60 * 1000;
let lastPetInteractionAt = Date.now();
let checkInTimer: NodeJS.Timeout | null = null;
let lastCheckInLine = "";

function notePetInteraction(): void {
  lastPetInteractionAt = Date.now();
}

function pickFresh(lines: string[]): string {
  const options = lines.filter((line) => line !== lastCheckInLine);
  lastCheckInLine = pick(options.length ? options : lines);
  return lastCheckInLine;
}

function scheduleCheckIn(): void {
  if (checkInTimer) clearTimeout(checkInTimer);
  checkInTimer = null;
  const settings = getSettings();
  if (!sessionActive || !settings.petCheckInsEnabled) return;
  const base = Math.max(2, Math.min(60, settings.petCheckInMinutes)) * 60 * 1000;
  const jitter = Math.round(base * (Math.random() * 0.3 - 0.15));
  checkInTimer = setTimeout(runCheckIn, base + jitter);
}

function runCheckIn(): void {
  checkInTimer = null;
  const quiet =
    !sessionActive ||
    blockingMode ||
    focusActive ||
    currentBubble ||
    dragTimer ||
    isPouchOpen() ||
    !petWindow?.isVisible();
  if (!quiet) {
    const missing = Date.now() - lastPetInteractionAt > MISS_YOU_AFTER_MS;
    stopAmbientPose(true);
    if (missing) {
      // Get your attention: a hop, then a little scurry.
      stopAmbientRoam(false);
      setPetState("jumping");
      setTimeout(() => {
        if (petState === "jumping" && !blockingMode) startClickRunReaction(Math.random() < 0.5 ? "left" : "right");
      }, 900);
      showBubble({ id: `check-in-${Date.now()}`, message: pickFresh(MISS_YOU_LINES), autoDismissMs: 7000 });
    } else {
      stopAmbientRoam(false);
      setPetState("waving");
      showBubble({ id: `check-in-${Date.now()}`, message: pickFresh(CHECK_IN_LINES), autoDismissMs: 6000 });
      setTimeout(() => {
        if (petState === "waving") setPetState("idle");
        scheduleAmbientRoam();
        scheduleAmbientPose();
      }, 2600);
    }
  }
  scheduleCheckIn();
}

/** Starts the pet, reminders and monitors for the signed-in account. */
function startSession(): void {
  if (sessionActive) return;
  sessionActive = true;
  getStats();
  restoreFocusSession();
  createPetWindow();
  scheduleReminderTimers();
  scheduleDistractionDetection();
  scheduleAgentActivityMonitor();
  scheduleBatteryMonitor();
  schedulePetLibraryMonitor();
  scheduleAmbientRoam();
  scheduleAmbientPose();
  applyPouchSetting();
  lastPetInteractionAt = Date.now();
  scheduleCheckIn();
  updateTrayMenu();
  // Open the Companion window on every launch, including when Windows starts it at sign-in.
  createSettingsWindow({ background: LAUNCHED_AT_LOGIN });
  setTimeout(() => greetOnStartup(), 1500);
  setTimeout(announceNewPets, 9000);
  publishSnapshot();
}

/** Stops everything that belongs to the signed-in account (used on sign-out). */
function endSession(): void {
  if (!sessionActive) return;
  sessionActive = false;
  stopPouch();
  clearPouch();
  destroyPouchWindow();
  if (checkInTimer) clearTimeout(checkInTimer);
  checkInTimer = null;
  clearSessionTimers();
  if (distractionTimer) clearInterval(distractionTimer);
  if (agentActivityTimer) clearInterval(agentActivityTimer);
  if (batteryMonitorTimer) clearInterval(batteryMonitorTimer);
  if (petLibraryTimer) clearInterval(petLibraryTimer);
  distractionTimer = null;
  agentActivityTimer = null;
  batteryMonitorTimer = null;
  petLibraryTimer = null;
  focusActive = false;
  focusEndsAt = null;
  blockingMode = null;
  currentBubble = null;
  agentActivity = null;
  if (petWindow && !petWindow.isDestroyed()) petWindow.destroy();
  petWindow = null;
  updateTrayMenu();
}

function clearSessionTimers(): void {
  clearCustomReminderTimers();
  for (const timer of [
    breakRunTimer,
    breakRunCountdownTimer,
    breakRunMovementTimer,
    screenBlockTimer,
    screenBlockCountdownTimer,
    focusWarningTimer,
    breakTimer,
    hydrationTimer,
    focusTimer,
    distractionTimer,
    distractionStartupTimer,
    agentActivityTimer,
    batteryMonitorTimer,
    petLibraryTimer,
    bubbleTimer,
    bubbleResizeSettleTimer,
    dragTimer,
    dragSafetyTimer,
    ambientRoamTimer,
    ambientRoamMoveTimer,
    ambientRoamStopTimer,
    ambientPoseTimer,
    ambientPoseStopTimer,
    agentPoseTimer,
  ]) {
    if (timer) clearTimeout(timer);
  }
}

app.on("before-quit", () => {
  stopPouch();
  clearPouch();
  shutdownWindowsFocusHelper();
  clearSessionTimers();
  if (updateCheckTimer) clearTimeout(updateCheckTimer);
  if (updateCheckInterval) clearInterval(updateCheckInterval);
});

app.on("window-all-closed", () => {
  // Keep the menu-bar utility alive after the settings window is closed.
});
