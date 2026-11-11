import { useEffect, useMemo, useRef, useState } from "react";
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

/** First run after creating an account: pick a companion and give it a name. */
export function Onboarding({
  userName,
  pets,
  initialPetId,
  initialNickname,
  renderPet,
  onPetChange,
  onComplete
}: {
  userName: string;
  pets: InstalledPet[];
  initialPetId: string;
  initialNickname: string;
  renderPet: (pet: InstalledPet, selected: boolean, onSelect: () => void) => ReactNode;
  onPetChange: (petId: string) => void;
  onComplete: (petId: string, nickname: string) => void;
}): JSX.Element {
  const [petId, setPetId] = useState(initialPetId);
  const [nickname, setNickname] = useState(initialNickname);
  const selected = pets.find((pet) => pet.slug === petId);
  const firstName = userName.trim().split(/\s+/)[0] ?? "";

  function choose(nextPetId: string): void {
    setPetId(nextPetId);
    onPetChange(nextPetId);
  }

  function submit(): void {
    onComplete(petId, nickname.trim());
  }

  return (
    <main className="onboarding">
      <div className="onboarding__content">
        <p className="onboarding__step">Step 1 of 1 · Your companion</p>
        <h1 className="onboarding__title">{firstName ? `Welcome, ${firstName}!` : "Welcome!"}</h1>
        <p className="onboarding__subtitle">Pick a companion to live on your desktop, then give it a name.</p>

        <div className="pet-picker" role="radiogroup" aria-label="Choose your companion">
          {pets.map((pet) => renderPet(pet, pet.slug === petId, () => choose(pet.slug)))}
        </div>

        <div className="onboarding__name">
          <span className="onboarding__name-preview">{selected ? <SpriteView pet={selected} state="waving" scale={0.3} /> : null}</span>
          <label className="onboarding__name-field">
            <span>Name your companion</span>
            <input
              className="c-input"
              type="text"
              maxLength={24}
              placeholder={selected?.manifest.displayName ?? "e.g. Mochi"}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
            />
          </label>
        </div>

        <button type="button" className="c-btn c-btn--primary c-btn--block c-btn--arrow onboarding__go" onClick={submit}>
          Let&apos;s go
          <ArrowIcon />
        </button>
        <p className="onboarding__footnote">You can change your companion and its name any time.</p>
      </div>
    </main>
  );
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Overview header + three quick cards (hydration, focus, companion). */
export function TodayOverview({
  userName,
  avatarImage,
  watersLogged,
  focusActive,
  focusMinutesLeft,
  pet,
  petNickname,
  companionDays,
  onDrink,
  onToggleFocus,
  focusLabel,
  stopFocusLabel
}: {
  userName: string;
  avatarImage: string;
  watersLogged: number;
  focusActive: boolean;
  focusMinutesLeft: number;
  pet: InstalledPet | undefined;
  petNickname: string;
  companionDays: number;
  onDrink: () => void;
  onToggleFocus: () => void;
  focusLabel: string;
  stopFocusLabel: string;
}): JSX.Element {
  const now = new Date();
  const firstName = userName.trim().split(/\s+/)[0] ?? "";
  const ratio = Math.min(watersLogged / DAILY_WATER_GOAL, 1);
  const remaining = Math.max(DAILY_WATER_GOAL - watersLogged, 0);
  const date = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const companionName = petNickname.trim() || pet?.manifest.displayName || "Your companion";

  return (
    <>
      <header className="ov-head">
        <Avatar image={avatarImage} pet={pet} size={44} />
        <div>
          <h1 className="ov-head__title">
            {greetingForHour(now.getHours())}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="ov-head__date">{date}</p>
        </div>
      </header>

      <p className="ov-section-label">Today</p>

      <div className="ov-cards">
        <section className="ov-card">
          <div className="ov-card__top">
            <span className="ov-card__icon is-water" aria-hidden="true">
              <DropIcon />
            </span>
            <span className="ov-card__label">Hydration</span>
          </div>
          <p className="ov-card__value">
            {watersLogged}
            <small>/ {DAILY_WATER_GOAL} glasses</small>
          </p>
          <div className="ov-meter" aria-hidden="true">
            <span style={{ width: `${ratio * 100}%` }} />
          </div>
          <p className="ov-card__hint">{remaining > 0 ? `${remaining} to go today` : "Goal reached today"}</p>
          <button type="button" className="ov-card__action" onClick={onDrink}>
            + Log a glass
          </button>
        </section>

        <section className={`ov-card${focusActive ? " is-focus" : ""}`}>
          <div className="ov-card__top">
            <span className="ov-card__icon is-focus" aria-hidden="true">
              <FocusIcon />
            </span>
            <span className="ov-card__label">Focus</span>
            {focusActive ? <span className="ov-live">Live</span> : null}
          </div>
          <p className="ov-card__value">
            {focusActive ? focusMinutesLeft : "Off"}
            {focusActive ? <small>min left</small> : null}
          </p>
          <div className="ov-meter is-focus" aria-hidden="true">
            <span style={{ width: focusActive ? "100%" : "0%" }} />
          </div>
          <p className="ov-card__hint">{focusActive ? "Blocked apps and sites are closed." : "Start a session to block distractions."}</p>
          <button type="button" className="ov-card__action" onClick={onToggleFocus}>
            {focusActive ? stopFocusLabel : focusLabel}
          </button>
        </section>

        <section className="ov-card ov-card--pet">
          <span className="ov-card__pet">{pet ? <SpriteView pet={pet} scale={0.42} /> : null}</span>
          <p className="ov-card__pet-name">{companionName}</p>
          <p className="ov-card__hint">
            {companionDays} {companionDays === 1 ? "day" : "days"} together
          </p>
        </section>
      </div>
    </>
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
      <circle cx="20" cy="16" r="2" />
      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
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


const menuIcon = (paths: ReactNode): JSX.Element => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
);

/** Compact account row pinned to the bottom of the sidebar, with a dropdown menu. */
export function AccountMenu({
  image,
  pet,
  userName,
  watersLogged,
  focusActive,
  focusMinutesLeft,
  updateReady,
  onOpenProfile,
  onTrack,
  onChangePhoto,
  onCheckUpdates,
  onSignOut,
  email
}: {
  image: string;
  pet: InstalledPet | undefined;
  userName: string;
  watersLogged: number;
  focusActive: boolean;
  focusMinutesLeft: number;
  updateReady: boolean;
  onOpenProfile: () => void;
  onTrack: () => void;
  onChangePhoto: () => void;
  onCheckUpdates: () => void;
  onSignOut: () => void;
  email: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const name = userName.trim() || "Your profile";
  const greeting = greetingForHour(new Date().getHours());

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(action: () => void): void {
    setOpen(false);
    action();
  }

  return (
    <div className={`account${open ? " is-open" : ""}`} ref={rootRef}>
      {open ? (
        <div className="account__menu" role="menu">
          <div className="account__header">
            <Avatar image={image} pet={pet} size={40} />
            <div className="account__header-text">
              <p className="account__header-name">{name}</p>
              <p className="account__greeting">{email || greeting}</p>
            </div>
          </div>
          <div className="account__chips">
            <span className="account__chip">
              <span className="account__dot is-water" aria-hidden="true" />
              {watersLogged}/{DAILY_WATER_GOAL} water
            </span>
            <span className="account__chip">
              <span className={`account__dot${focusActive ? " is-focus" : ""}`} aria-hidden="true" />
              {focusActive ? `${focusMinutesLeft}m focus left` : "Focus off"}
            </span>
          </div>
          <div className="account__sep" />
          <button type="button" role="menuitem" className="account__item" onClick={() => run(onOpenProfile)}>
            {menuIcon(
              <>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </>
            )}
            View profile
          </button>
          <button type="button" role="menuitem" className="account__item" onClick={() => run(onTrack)}>
            {menuIcon(
              <>
                <path d="M3 3v18h18" />
                <path d="m7 15 4-4 3 3 5-6" />
              </>
            )}
            Track progress
          </button>
          <button type="button" role="menuitem" className="account__item" onClick={() => run(onChangePhoto)}>
            {menuIcon(
              <>
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </>
            )}
            {image ? "Change photo" : "Add a photo"}
          </button>
          <div className="account__sep" />
          <button type="button" role="menuitem" className="account__item" onClick={() => run(onCheckUpdates)}>
            {menuIcon(
              <>
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </>
            )}
            {updateReady ? "Update available" : "Check for updates"}
            {updateReady ? <span className="account__badge">New</span> : null}
          </button>
          <div className="account__sep" />
          <button type="button" role="menuitem" className="account__item is-danger" onClick={() => run(onSignOut)}>
            {menuIcon(
              <>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </>
            )}
            Sign out
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="account__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account__trigger-inner">
          <Avatar image={image} pet={pet} size={36} />
          <span className="account__who">
            <span className="account__name">{name}</span>
            <span className="account__email">{email}</span>
          </span>
          {updateReady ? <span className="account__trigger-dot" aria-label="Update available" /> : null}
          <svg className="account__chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m7 15 5-5 5 5" />
          </svg>
        </span>
      </button>
    </div>
  );
}
