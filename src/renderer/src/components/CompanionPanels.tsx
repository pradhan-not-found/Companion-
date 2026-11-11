import { useMemo, useState } from "react";
import type { CSSProperties, JSX, ReactNode } from "react";
import { DAILY_WATER_GOAL } from "../../../shared/constants";
import type { InstalledPet, PetState, UpdateStatus } from "../../../shared/types";
import { getSelectedPetAsset } from "../assets";
import appLogo from "../assets/applogo.png";

const ArrowIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

const DropIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
  </svg>
);

const FocusIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/** First-run welcome: pick a name and a companion. */
export function Onboarding({
  title,
  pets,
  initialName,
  initialPetId,
  renderPet,
  onPetChange,
  onComplete
}: {
  title: string;
  pets: InstalledPet[];
  initialName: string;
  initialPetId: string;
  renderPet: (pet: InstalledPet, selected: boolean, onSelect: () => void) => ReactNode;
  onPetChange: (petId: string) => void;
  onComplete: (name: string, petId: string) => void;
}): JSX.Element {
  const [name, setName] = useState(initialName);
  const [petId, setPetId] = useState(initialPetId);

  function choose(nextPetId: string): void {
    setPetId(nextPetId);
    onPetChange(nextPetId);
  }

  function submit(): void {
    onComplete(name.trim(), petId);
  }

  return (
    <main className="onboarding">
      <div className="onboarding__content">
        <img className="onboarding__logo" src={appLogo} alt="" />
        <h1 className="onboarding__title">{title}</h1>
        <p className="onboarding__subtitle">
          Choose a name and a companion to personalize your workspace. It will keep you company,
          remind you to drink water, and nudge you to take breaks.
        </p>

        <input
          className="c-input"
          type="text"
          placeholder="What should we call you?"
          autoComplete="off"
          autoFocus
          maxLength={40}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />

        <p className="onboarding__label">Choose your companion</p>
        <div className="pet-picker" role="radiogroup" aria-label="Choose your companion">
          {pets.map((pet) => renderPet(pet, pet.slug === petId, () => choose(pet.slug)))}
        </div>

        <button type="button" className="c-btn c-btn--primary c-btn--block c-btn--arrow" onClick={submit}>
          Let&apos;s Go
          <ArrowIcon />
        </button>
        <p className="onboarding__footnote">You can change your companion any time from the Pet tab.</p>
      </div>
    </main>
  );
}

/** "Hey, name!" — today's hydration ring with quick actions. */
export function TodayCard({
  userName,
  watersLogged,
  focusActive,
  onDrink,
  onToggleFocus,
  focusLabel,
  stopFocusLabel
}: {
  userName: string;
  watersLogged: number;
  focusActive: boolean;
  onDrink: () => void;
  onToggleFocus: () => void;
  focusLabel: string;
  stopFocusLabel: string;
}): JSX.Element {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(watersLogged / DAILY_WATER_GOAL, 1);
  const filled = circumference * ratio;
  const remaining = Math.max(DAILY_WATER_GOAL - watersLogged, 0);
  const name = userName.trim();
  const greeting = name ? `Hey, ${name}!` : "Hey there!";
  const status =
    remaining > 0
      ? `${remaining} more ${remaining === 1 ? "glass" : "glasses"} to reach today's goal`
      : "Daily hydration goal reached — nice work!";

  return (
    <section className="today-card" aria-label="Today">
      <div className="today-card__ring-wrap">
        <svg className="today-card__ring" viewBox="0 0 84 84" aria-hidden="true">
          <circle className="today-card__ring-track" cx="42" cy="42" r={radius} fill="none" strokeWidth="7" />
          {watersLogged > 0 ? (
            <circle
              className="today-card__ring-fill"
              cx="42"
              cy="42"
              r={radius}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference - filled}`}
              strokeDashoffset={circumference * 0.25}
            />
          ) : null}
        </svg>
        <div className="today-card__ring-label" role="img" aria-label={`${watersLogged} of ${DAILY_WATER_GOAL} glasses`}>
          <strong>{watersLogged}</strong>
          <span>of {DAILY_WATER_GOAL}</span>
        </div>
      </div>

      <div className="today-card__text">
        <p className="today-card__eyebrow">Today</p>
        <p className="today-card__name">{greeting}</p>
        <p className="today-card__status">{status}</p>
        <div className="today-card__bar" aria-hidden="true">
          <span style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>

      <div className="today-card__actions">
        <button type="button" className="c-btn c-btn--water" onClick={onDrink}>
          <DropIcon />
          I drank water
        </button>
        <button type="button" className="c-btn c-btn--ghost" onClick={onToggleFocus}>
          <FocusIcon />
          {focusActive ? stopFocusLabel : focusLabel}
        </button>
      </div>
    </section>
  );
}

/* ── Shared bits ─────────────────────────────────────────────── */

/** An animated pet sprite at any size. */
export function SpriteView({
  pet,
  state = "idle",
  scale
}: {
  pet: InstalledPet;
  state?: PetState;
  scale: number;
}): JSX.Element | null {
  const asset = useMemo(() => getSelectedPetAsset(pet.slug, [pet], state), [pet, state]);
  if (asset.kind !== "sprite") return null;
  return (
    <span
      key={`${asset.src}:${asset.animation.row}`}
      className="sprite-pet"
      role="img"
      aria-label={pet.manifest.displayName}
      style={
        {
          "--pet-render-scale": scale,
          "--sprite-url": `url(${asset.src})`,
          "--sprite-row": asset.animation.row,
          "--sprite-frames": asset.animation.frames,
          "--sprite-duration": `${asset.animation.durationMs}ms`,
          "--sprite-frame-width": `${asset.frameWidth}px`,
          "--sprite-frame-height": `${asset.frameHeight}px`,
          "--sprite-sheet-width": `${asset.sheetWidth}px`
        } as CSSProperties
      }
    />
  );
}

const icon = (paths: ReactNode): JSX.Element => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
);

export const NavIcons = {
  overview: icon(
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  pets: icon(
    <>
      <circle cx="11" cy="4" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="4" cy="8" r="2" />
      <path d="M8 14.5C8 12 9.8 10 12 10s4 2 4 4.5c0 2-1.5 3-3 3.5-.7.2-1.3.2-2 0-1.5-.5-3-1.5-3-3.5Z" />
    </>
  ),
  reminders: icon(
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  profile: icon(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  settings: icon(
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  )
};

export type NavItem<T extends string> = {
  id: T;
  label: string;
  icon: JSX.Element;
  badge?: string;
  dot?: boolean;
};

/** Left navigation for the dashboard window. */
export function Sidebar<T extends string>({
  items,
  active,
  onSelect,
  footer
}: {
  items: NavItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  footer?: ReactNode;
}): JSX.Element {
  return (
    <nav className="sidebar" aria-label="Main">
      <div className="sidebar__brand">
        <img src={appLogo} alt="" className="sidebar__logo" />
        <p className="sidebar__name">Companion</p>
      </div>
      <ul className="sidebar__nav">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`sidebar__item${item.id === active ? " is-active" : ""}`}
              aria-current={item.id === active ? "page" : undefined}
              onClick={() => onSelect(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge ? <span className="sidebar__badge">{item.badge}</span> : null}
              {item.dot ? <span className="sidebar__dot" aria-label="Update available" /> : null}
            </button>
          </li>
        ))}
      </ul>
      {footer ? <div className="sidebar__footer">{footer}</div> : null}
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }): JSX.Element {
  return (
    <header className="page-head">
      <div>
        <h1 className="page-head__title">{title}</h1>
        {subtitle ? <p className="page-head__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </header>
  );
}

/* ── New pet spotlight ───────────────────────────────────────── */

export function NewPetSpotlight({
  pets,
  onTry,
  onDismiss
}: {
  pets: InstalledPet[];
  onTry: (pet: InstalledPet) => void;
  onDismiss: () => void;
}): JSX.Element | null {
  const [index, setIndex] = useState(0);
  const pet = pets[Math.min(index, pets.length - 1)];
  if (!pet) return null;
  return (
    <section className="spotlight" aria-label="New companion">
      <div className="spotlight__stage">
        <span className="spotlight__glow" aria-hidden="true" />
        <SpriteView pet={pet} state="waving" scale={0.7} />
      </div>
      <div className="spotlight__body">
        <p className="spotlight__eyebrow">
          <span className="spotlight__spark" aria-hidden="true">✦</span>
          New companion{pets.length > 1 ? ` · ${index + 1} of ${pets.length}` : ""}
        </p>
        <h2 className="spotlight__title">Meet {pet.manifest.displayName}</h2>
        {pet.manifest.description ? <p className="spotlight__desc">{pet.manifest.description}</p> : null}
        <div className="spotlight__actions">
          <button type="button" className="c-btn c-btn--primary" onClick={() => onTry(pet)}>
            Try {pet.manifest.displayName}
          </button>
          {pets.length > 1 ? (
            <button type="button" className="c-btn c-btn--ghost" onClick={() => setIndex((index + 1) % pets.length)}>
              Next
            </button>
          ) : null}
          <button type="button" className="c-btn c-btn--ghost" onClick={onDismiss}>
            Maybe later
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Profile ─────────────────────────────────────────────────── */

export function ProfileCard({
  pet,
  userName,
  avatarImage,
  onNameChange,
  onChoosePhoto,
  onRemovePhoto,
  photoError,
  companionDays,
  totals
}: {
  pet: InstalledPet | undefined;
  userName: string;
  avatarImage: string;
  onNameChange: (name: string) => void;
  onChoosePhoto: () => void;
  onRemovePhoto: () => void;
  photoError?: string | null;
  companionDays: number;
  totals: { waters: number; breaks: number; focusMinutes: number };
}): JSX.Element {
  const hours = totals.focusMinutes >= 60;
  return (
    <section className="profile-card">
      <div className="profile-card__banner" aria-hidden="true" />
      <div className="profile-card__body">
        <div className="profile-card__identity">
          <button type="button" className="profile-card__avatar" onClick={onChoosePhoto} aria-label="Change profile photo">
            <Avatar image={avatarImage} pet={pet} size={96} />
            <span className="profile-card__avatar-edit" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </span>
          </button>
          <div className="profile-card__photo-actions">
            <button type="button" className="c-btn c-btn--ghost" onClick={onChoosePhoto}>
              {avatarImage ? "Change photo" : "Upload photo"}
            </button>
            {avatarImage ? (
              <button type="button" className="c-btn c-btn--ghost" onClick={onRemovePhoto}>
                Use {pet?.manifest.displayName ?? "companion"}
              </button>
            ) : null}
          </div>
        </div>
        {photoError ? <p className="profile-card__error">{photoError}</p> : null}
        <label className="profile-card__field">
          <span>Display name</span>
          <input
            className="c-input"
            type="text"
            maxLength={40}
            placeholder="What should we call you?"
            value={userName}
            onChange={(event) => onNameChange(event.target.value)}
          />
          <small>Your companion uses this to greet you.</small>
        </label>
        <dl className="profile-card__stats">
          <div>
            <dt>Together</dt>
            <dd>
              {companionDays}
              <small>{companionDays === 1 ? "day" : "days"}</small>
            </dd>
          </div>
          <div>
            <dt>Water logged</dt>
            <dd>
              {totals.waters}
              <small>glasses</small>
            </dd>
          </div>
          <div>
            <dt>Breaks taken</dt>
            <dd>{totals.breaks}</dd>
          </div>
          <div>
            <dt>Focused</dt>
            <dd>
              {hours ? (totals.focusMinutes / 60).toFixed(1) : totals.focusMinutes}
              <small>{hours ? "hrs" : "min"}</small>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function relativeTime(timestamp?: number): string {
  if (!timestamp) return "";
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} hr ago` : new Date(timestamp).toLocaleDateString();
}

export function UpdatesCard({
  status,
  onCheck,
  onInstall
}: {
  status: UpdateStatus;
  onCheck: () => void;
  onInstall: () => void;
}): JSX.Element {
  const busy = status.state === "checking" || status.state === "downloading";
  let tone: "ok" | "new" | "busy" | "warn" | "muted" = "muted";
  let headline = "Automatic updates are on";
  let detail = "Companion checks GitHub for new versions every few hours and lets you know.";

  switch (status.state) {
    case "checking":
      tone = "busy";
      headline = "Checking for updates…";
      detail = "Contacting GitHub Releases.";
      break;
    case "downloading":
      tone = "busy";
      headline = `Downloading version ${status.version ?? ""}…`;
      detail = "This happens in the background. You can keep working.";
      break;
    case "available":
      tone = "new";
      headline = `Version ${status.version} is available`;
      detail = "This portable copy can't update itself. Download the new version from GitHub.";
      break;
    case "downloaded":
      tone = "new";
      headline = `Version ${status.version} is ready to install`;
      detail = "Restart Companion to finish updating. It only takes a few seconds.";
      break;
    case "not-available":
      tone = "ok";
      headline = "You're up to date";
      detail = `Last checked ${relativeTime(status.checkedAt)}.`;
      break;
    case "error":
      tone = "warn";
      headline = "Couldn't check for updates";
      detail = "Check your internet connection and try again.";
      break;
    case "unsupported":
      headline = "Updates are off in development builds";
      detail = "Installed copies of Companion update automatically from GitHub Releases.";
      break;
    default:
      break;
  }

  const showInstall = status.state === "downloaded" || status.state === "available";

  return (
    <section className={`updates-card is-${tone}`}>
      <div className="updates-card__head">
        <span className="updates-card__icon" aria-hidden="true">
          {tone === "ok" ? "✓" : tone === "new" ? "↑" : tone === "warn" ? "!" : "⟳"}
        </span>
        <div className="updates-card__text">
          <p className="updates-card__title">{headline}</p>
          <p className="updates-card__detail">{detail}</p>
        </div>
        <div className="updates-card__actions">
          {showInstall ? (
            <button type="button" className="c-btn c-btn--primary" onClick={onInstall}>
              {status.state === "downloaded" ? "Restart & update" : "Download"}
            </button>
          ) : (
            <button
              type="button"
              className="c-btn c-btn--ghost"
              onClick={onCheck}
              disabled={busy || status.state === "unsupported"}
            >
              {busy ? "Checking…" : "Check for updates"}
            </button>
          )}
        </div>
      </div>
      {status.state === "downloading" ? (
        <div className="updates-card__progress" role="progressbar" aria-valuenow={status.progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${Math.max(4, status.progress ?? 0)}%` }} />
        </div>
      ) : null}
      {status.releaseNotes && showInstall ? (
        <div className="updates-card__notes">
          <p className="updates-card__notes-title">What&apos;s new</p>
          <p className="updates-card__notes-body">{status.releaseNotes}</p>
        </div>
      ) : null}
      <p className="updates-card__meta">Version {status.currentVersion || "—"} · Updates from GitHub Releases</p>
    </section>
  );
}

/* ── Avatar & sidebar profile ───────────────────────────────── */

/** Round avatar: the user's photo, or their companion when no photo is set. */
export function Avatar({
  image,
  pet,
  size,
  ring = false
}: {
  image: string;
  pet: InstalledPet | undefined;
  size: number;
  ring?: boolean;
}): JSX.Element {
  return (
    <span
      className={`avatar${ring ? " avatar--ring" : ""}${image ? " avatar--photo" : ""}`}
      style={{ width: size, height: size } as CSSProperties}
    >
      {image ? (
        <img src={image} alt="Profile" />
      ) : pet ? (
        <span className="avatar__pet">
          <SpriteView pet={pet} scale={(size * 1.18) / 208} />
        </span>
      ) : null}
    </span>
  );
}

function greetingForHour(hour: number): string {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function SidebarProfile({
  image,
  pet,
  userName,
  watersLogged,
  focusActive,
  focusMinutesLeft,
  onOpenProfile,
  onTrack
}: {
  image: string;
  pet: InstalledPet | undefined;
  userName: string;
  watersLogged: number;
  focusActive: boolean;
  focusMinutesLeft: number;
  onOpenProfile: () => void;
  onTrack: () => void;
}): JSX.Element {
  const name = userName.trim();
  const greeting = greetingForHour(new Date().getHours());
  return (
    <div className="side-profile">
      <button type="button" className="side-profile__avatar" onClick={onOpenProfile} aria-label="Open profile">
        <Avatar image={image} pet={pet} size={64} ring />
      </button>
      <p className="side-profile__greeting">{greeting},</p>
      <p className="side-profile__name">{name || "friend"}</p>
      <div className="side-profile__chips">
        <span className="side-profile__chip">
          <span className="side-profile__dot is-water" aria-hidden="true" />
          {watersLogged}/{DAILY_WATER_GOAL} water
        </span>
        <span className="side-profile__chip">
          <span className={`side-profile__dot${focusActive ? " is-focus" : ""}`} aria-hidden="true" />
          {focusActive ? `${focusMinutesLeft}m focus` : "Focus off"}
        </span>
      </div>
      <button type="button" className="c-btn c-btn--primary c-btn--block side-profile__track" onClick={onTrack}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 3v18h18" />
          <path d="m7 15 4-4 3 3 5-6" />
        </svg>
        Track progress
      </button>
    </div>
  );
}
