import { BUNDLED_PETS, DEFAULT_PET_ID } from "./bundledPets";
import type { Settings, TodayStats } from "./types";

export const DAILY_WATER_GOAL = 8;
export const DEFAULT_CUSTOM_REMINDER_COUNTDOWN_LEAD_MINUTES = 10;
export const DEFAULT_CUSTOM_REMINDER_DUE_SCALE_MULTIPLIER = 1.6;

export const DEFAULT_SETTINGS: Settings = {
  language: "en",
  petAppearanceId: DEFAULT_PET_ID,
  petScale: 1,
  petRoamEnabled: true,
  petRoamDirection: "both",
  petRoamFrequencySeconds: 18,
  petRoamDurationSeconds: 5,
  petIdleMotionSeconds: 3.2,
  petBubbleDurationSeconds: 3,
  lyricsModeEnabled: false,
  selectedPetId: DEFAULT_PET_ID,
  installedPets: [],
  onboardingDismissed: false,
  userName: "",
  avatarImage: "",
  launchAtLogin: true,
  // Pets bundled with this build count as already introduced on a fresh install;
  // pets added by later updates are then announced as new.
  seenPetIds: BUNDLED_PETS.map((pet) => pet.slug),
  announcedPetIds: BUNDLED_PETS.map((pet) => pet.slug),
  breakReminderEnabled: true,
  breakIntervalMinutes: 45,
  screenBlockReminderEnabled: true,
  screenBlockDurationSeconds: 120,
  screenBlockCoverageRatio: 0.4,
  hydrationReminderEnabled: true,
  hydrationIntervalMinutes: 90,
  focusDurationMinutes: 25,
  customReminders: [],
  agentActivityEnabled: true,
  agentCompletionSoundEnabled: true,
  distractionDetectionEnabled: false,
  distractionGraceSeconds: 3,
  distractionAutoClose: true,
  distractionBlockedApps: [
    "Steam",
    "EpicGamesLauncher",
    "RiotClientServices",
    "VALORANT",
    "Battle.net",
    "Minecraft",
    "RobloxPlayerBeta",
    "Discord",
    "Telegram",
    "WeChat",
    "QQ"
  ],
  distractionBlockedKeywords: [
    "youtube",
    "youtu.be",
    "twitter",
    "x.com",
    "instagram",
    "reddit",
    "tiktok",
    "netflix",
    "twitch",
    "facebook",
    "bilibili",
    "weibo",
    "douyin",
    "xiaohongshu",
    "zhihu",
    "douban",
    "taobao",
    "jd.com",
    "小红书",
    "微博",
    "抖音",
    "知乎",
    "豆瓣",
    "淘宝",
    "京东",
    "哔哩哔哩",
    "虎扑",
    "贴吧"
  ]
};

export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createEmptyStats(date = todayKey()): TodayStats {
  return {
    date,
    breaksTaken: 0,
    watersLogged: 0,
    focusMinutes: 0,
    focusWarnings: 0
  };
}
