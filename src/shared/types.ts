export type Language = "zh-CN" | "en" | "ja" | "ko" | "es" | "fr" | "ar" | "de" | "ru";

export type PetAppearanceId = string;

export type PetFacing = "left" | "right";
export type PetRoamDirection = "both" | "vertical" | "diagonal" | "all" | "left" | "right";

export type PetState =
  | "idle"
  | "sitting"
  | "happy"
  | "breakPrompt"
  | "breakRunning"
  | "breakDone"
  | "hydrationPrompt"
  | "drinking"
  | "hydrationDone"
  | "focusGuard"
  | "focusAlert"
  | "focusDone"
  | "sad"
  | "sleeping"
  | "runningLeft"
  | "runningRight"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "reviewing"
  | "thinking";

export type PetdexStateId =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

export type SpriteAnimationState = {
  row: number;
  frames: number;
  durationMs: number;
};

export type PetPackageManifest = {
  id: string;
  displayName: string;
  description?: string;
  author?: string;
  spritesheet: string;
  source: "builtin" | "imported" | "petdex";
};

export type InstalledPet = {
  slug: string;
  manifest: PetPackageManifest;
  spritesheetPath: string;
  spritesheetExt: "webp" | "png";
  importedAt: string;
};

export type BubbleAction = {
  id: string;
  label: string;
  kind?: "primary" | "secondary" | "danger";
};

export type AccountProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
};

export type AccountResult =
  | { ok: true; account: AccountProfile; created: boolean }
  | { ok: false; error: string };

export type AgentSource = "Codex" | "Claude Code" | "OpenCode" | "DeepSeek TUI" | "Hermes";

export type AgentStatus =
  | "working"
  | "thinking"
  | "tool"
  | "script"
  | "permission"
  | "choice"
  | "complete"
  | "failed"
  | "needs-review";

/** What a coding agent (Claude Code, Codex, …) is doing right now. */
export type AgentActivity = {
  source: AgentSource;
  status: AgentStatus;
  updatedAt: number;
};

export type SpeechBubble = {
  id: string;
  message: string;
  /** When set, the bubble is rendered as a branded agent status card. */
  agent?: AgentActivity;
  /** When set, the bubble is the animated startup greeting. */
  greeting?: { salutation: string; name: string };
  /** When set, the bubble introduces a newly added companion. */
  newPet?: { slug: string; name: string; count: number };
  actions?: BubbleAction[];
  clickActionId?: string;
  autoDismissMs?: number;
};

export type CustomReminder = {
  id: string;
  title: string;
  time: string;
  enabled: boolean;
  showCountdownOnPet: boolean;
  countdownLeadMinutes: number;
  enlargePetOnDue: boolean;
  duePetScaleMultiplier: number;
  createdAt: number;
};

export type PetLayout = {
  petOffsetX: number;
  bubbleAnchorX: number;
  bubbleLeftX: number;
  bubbleArrowX: number;
};

export type BlockingMode = "break" | "breakRun" | "hydration" | "focusWarning" | null;

export type Settings = {
  language: Language;
  petAppearanceId: PetAppearanceId;
  petScale: number;
  petRoamEnabled: boolean;
  petRoamDirection: PetRoamDirection;
  petRoamFrequencySeconds: number;
  petRoamDurationSeconds: number;
  petIdleMotionSeconds: number;
  petBubbleDurationSeconds: number;
  lyricsModeEnabled: boolean;
  selectedPetId: string;
  installedPets: InstalledPet[];
  onboardingDismissed: boolean;
  userName: string;
  /** Profile photo as a data URL; empty means "show my companion". */
  avatarImage: string;
  /** The name the user gave their companion. */
  petNickname: string;
  /** Start Companion automatically when the user signs in to Windows. */
  launchAtLogin: boolean;
  /** Pet ids the user has already been introduced to. */
  seenPetIds: string[];
  /** Pet ids the desktop pet has already announced (each new pet is announced once). */
  announcedPetIds: string[];
  breakReminderEnabled: boolean;
  breakIntervalMinutes: number;
  screenBlockReminderEnabled: boolean;
  screenBlockDurationSeconds: number;
  screenBlockCoverageRatio: number;
  hydrationReminderEnabled: boolean;
  hydrationIntervalMinutes: number;
  focusDurationMinutes: number;
  customReminders: CustomReminder[];
  agentActivityEnabled: boolean;
  agentCompletionSoundEnabled: boolean;
  distractionDetectionEnabled: boolean;
  distractionGraceSeconds: number;
  distractionAutoClose: boolean;
  distractionBlockedApps: string[];
  distractionBlockedKeywords: string[];
};

export type TodayStats = {
  date: string;
  breaksTaken: number;
  watersLogged: number;
  focusMinutes: number;
  focusWarnings: number;
};

export type StatsHistory = Record<string, TodayStats>;

export type TimerStatus = {
  breakDueAt: number | null;
  breakSnoozeDueAt: number | null;
  hydrationDueAt: number | null;
  focusEndsAt: number | null;
};

export type DistractionStatus = {
  state: "idle" | "watching" | "permission-needed" | "unsupported" | "error";
  activeApp: string;
  activeWindowTitle: string;
  matchedRule: string | null;
  lastCheckedAt: number | null;
  lastWarningAt: number | null;
  error: string | null;
};

export type UpdateState =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "not-available"
  | "error"
  | "unsupported";

export type UpdateStatus = {
  state: UpdateState;
  currentVersion: string;
  /** False for the portable build, which links to the release page instead. */
  canInstall: boolean;
  version?: string;
  progress?: number;
  releaseNotes?: string;
  checkedAt?: number;
  error?: string;
};

export type AppSnapshot = {
  settings: Settings;
  stats: TodayStats;
  statsHistory: StatsHistory;
  timers: TimerStatus;
  distraction: DistractionStatus;
  petState: PetState;
  petFacing: PetFacing;
  petDisplayScale: number;
  blockingMode: BlockingMode;
  focusActive: boolean;
  dogVisible: boolean;
  screenBlockActive: boolean;
  screenBlockEndsAt: number | null;
  update: UpdateStatus;
  agentActivity: AgentActivity | null;
  account: AccountProfile | null;
};

export type PetImportResult =
  | { ok: true; pet: InstalledPet }
  | { ok: false; error: string };

export type PetDeleteResult =
  | { ok: true }
  | { ok: false; error: string };

export type DemoTrigger =
  | "break"
  | "hydration"
  | "focusWarning"
  | "happy"
  | "agentDone"
  | "agentApproval";

export type RendererEventMap = {
  "pet:set-state": PetState;
  "pet:layout": PetLayout;
  "pet:show-bubble": SpeechBubble;
  "pet:hide-bubble": void;
  "pet:imported": InstalledPet;
  "settings:updated": Settings;
  "stats:updated": TodayStats;
  "app:snapshot": AppSnapshot;
};
