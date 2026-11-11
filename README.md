<div align="center">

<img src="landing-page/public/applogo.png" alt="Companion Logo" width="120" />

# Companion

**A beautifully crafted desktop pet that lives on your screen and looks after you while you work.**

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg?style=for-the-badge&logo=github)](LICENSE)
[![Powered by Electron](https://img.shields.io/badge/Electron-191970.svg?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19-000000.svg?style=for-the-badge&logo=react&logoColor=61dafb)](https://react.dev)

</div>

<br />

> **Companion** keeps a small animated friend on your desktop. It wanders around, reacts when you click it, and nudges you to take breaks, drink water, and stay focused.

## ✨ Features

- 🐾 **14 bundled companions**: capybara, otter, cats, a droid, a whale and more. All of them use smooth PetDex sprite animation for idle, walking, waving, jumping, waiting and reviewing.
- 🚶 **Natural roaming**: the pet wanders along your screen with time-based, sub-pixel-smooth movement. You can drag it anywhere.
- ☕ **Break reminders**: regular break nudges, plus an optional screen-block break when a reminder is easy to ignore.
- 💧 **Hydration tracking**: water reminders with daily and historical stats.
- ⏰ **Custom reminders**: daily reminders that count down on the pet shortly before they are due.
- 🎯 **Focus mode**: timed focus sessions, plus distraction detection for blocked apps and sites (macOS).
- 🤖 **Agent activity alerts**: Claude Code, Codex, OpenCode, DeepSeek TUI and Hermes runs make the pet react when work finishes, fails or needs review.
- 📦 **Import your own pets**: add any `pet.json + spritesheet.webp/png` folder or zip. Pets installed with `npx petdex install <name>` are detected automatically.
- 📊 **Stats dashboard**: breaks, water, focus minutes and a focus heatmap.
- 🌍 **9 languages** with full light and dark mode.
- 🔄 **Auto-updates**: installed copies update themselves from GitHub Releases.

## ⬇️ Install (Windows)

Download from [Releases](https://github.com/pradhan-not-found/Companion-/releases/latest):

| File | What it is |
| --- | --- |
| `Companion-Setup-x.y.z-x64.exe` | **Recommended.** Installer with Start Menu and desktop shortcuts, an uninstaller and auto-updates. |
| `Companion-x.y.z-x64-portable.exe` | Runs without installing. It doesn't auto-update. |

The installer isn't code-signed yet, so Windows SmartScreen may say "Windows protected your PC". Click **More info → Run anyway**.

After launch, Companion lives in the **system tray**. Click the tray icon or right-click the pet for settings, focus mode, logging water and more.

## 🛠 Run from source

Requires Node.js 22 or newer.

```bash
git clone https://github.com/pradhan-not-found/Companion-.git
cd Companion-
npm install
npm run dev          # launches the app with hot reload
```

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Production build into `out/` |
| `npm run dist:win` | Windows installer and portable exe in `release/` |

### Releasing

1. Bump `"version"` in `package.json` (for example `1.1.1`).
2. Commit, then tag and push: `git tag v1.1.0 && git push origin v1.1.0`.
3. GitHub Actions builds both exes and publishes the release, including `latest.yml` for auto-updates.

## 🐶 Adding pets

A pet is a folder holding `pet.json` and a 1536px-wide PetDex spritesheet. The sheet is 8 columns of 192×208 frames, with 9 rows (or 11 for V2 sheets):

```json
{
  "id": "my-pet",
  "displayName": "My Pet",
  "description": "A short description.",
  "spritesheetPath": "spritesheet.webp"
}
```

- **Bundle it**: drop the folder into `pets/`, add it to `src/shared/bundledPets.ts`, and rebuild.
- **Import it**: Settings → Pet → Import, with a folder or zip.

## 🤖 Agent activity

In the **Settings** tab, turn on **Agent Completion Alerts**.

- **Claude Code / Codex / DeepSeek TUI**: work automatically. Companion watches their local session files.
- **OpenCode**: copy `integrations/opencode/companion-agent-hook.js` into `~/.config/opencode/plugins/`.
- **Hermes**: copy `integrations/hermes/companion-agent-hook` into `~/.hermes/plugins/` and enable `companion-agent-hook` in `~/.hermes/config.yaml`.

## 📁 Project structure

```text
src/main/       Electron main process: windows, tray, roaming, timers, reminders, imports
src/preload/    Secure IPC bridge between Electron and React
src/renderer/   React UI for the pet window and the settings window
src/shared/     Types, defaults, i18n, sprite state mapping, bundled pet list
pets/           Bundled companions (pet.json + spritesheet)
build/          App and tray icons
integrations/   Optional agent hooks for OpenCode and Hermes
landing-page/   Next.js marketing site
```

## 📜 License

Released under the [MIT License](LICENSE). Companion's desktop engine is adapted from the MIT-licensed [PawPause](https://github.com/angziii/PawPause) and [PawPal](https://github.com/zebangeth/PawPal) projects. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Pet artwork stays subject to its original creators' terms.

<div align="center">
  <p>Built with 🤍 by <a href="https://github.com/pradhan-not-found">pradhan-not-found</a></p>
</div>
