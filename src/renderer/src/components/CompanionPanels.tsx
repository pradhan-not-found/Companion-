import { useEffect, useMemo, useRef, useState } from "react";
import { PlayIcon, PlusIcon, SparklesIcon, StopIcon } from "./Icons";
import type { CSSProperties, JSX, ReactNode } from "react";
import { DAILY_WATER_GOAL } from "../../../shared/constants";
import type { InstalledPet, PetState, UpdateStatus } from "../../../shared/types";
import { getSelectedPetAsset } from "../assets";
import { AvatarArt } from "./AvatarArt";
import { WaterGlass } from "./WaterGlass";
import type { AvatarArtId } from "./AvatarArt";
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

const ONBOARDING_STEPS = ["Companion", "Name", "Ready"] as const;
const NAME_SUGGESTIONS = ["Mochi", "Biscuit", "Pixel", "Nugget", "Pebble"];

function Stepper({ step }: { step: number }): JSX.Element {
  return (
    <ol className="stepper" aria-label="Setup progress">
      {ONBOARDING_STEPS.map((label, index) => {
        const state = index < step ? "done" : index === step ? "current" : "todo";
        return (
          <li key={label} className={`stepper__item is-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="stepper__dot">
              {state === "done" ? (
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span className="stepper__label">{label}</span>
            {index < ONBOARDING_STEPS.length - 1 ? <span className="stepper__bar" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** After creating an account: pick a companion, name it, and get started. */
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
  const [step, setStep] = useState(0);
  const [petId, setPetId] = useState(initialPetId);
  const [nickname, setNickname] = useState(initialNickname);
  const selected = pets.find((pet) => pet.slug === petId);
  const firstName = userName.trim().split(/\s+/)[0] ?? "";
  const petName = nickname.trim() || selected?.manifest.displayName || "your companion";

  function choose(nextPetId: string): void {
    setPetId(nextPetId);
    onPetChange(nextPetId);
  }

  function next(): void {
    if (step < ONBOARDING_STEPS.length - 1) setStep(step + 1);
    else onComplete(petId, nickname.trim());
  }

  const heading = [
    { title: firstName ? `Welcome, ${firstName}` : "Welcome", subtitle: "Choose the companion that will live on your desktop." },
    { title: "Give it a name", subtitle: `What should we call your ${selected?.manifest.displayName ?? "companion"}?` },
    { title: `Meet ${petName}`, subtitle: "You're all set. Here's what your companion will do for you." }
  ][step];

  return (
    <main className="ob">
      <header className="ob__top">
        <Stepper step={step} />
      </header>

      <div className="ob__body" key={step}>
        <h1 className="ob__title">{heading.title}</h1>
        <p className="ob__subtitle">{heading.subtitle}</p>

        {step === 0 ? (
          <div className="pet-picker" role="radiogroup" aria-label="Choose your companion">
            {pets.map((pet) => renderPet(pet, pet.slug === petId, () => choose(pet.slug)))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="ob-name">
            <span className="ob-name__stage">{selected ? <SpriteView pet={selected} state="waving" scale={0.62} /> : null}</span>
            <div className="ob-name__form">
              <label className="ob-name__field">
                <span>Companion name</span>
                <input
                  className="c-input"
                  type="text"
                  maxLength={24}
                  placeholder={selected?.manifest.displayName ?? "e.g. Mochi"}
                  value={nickname}
                  autoFocus
                  onChange={(event) => setNickname(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") next();
                  }}
                />
              </label>
              <div className="ob-name__chips" aria-label="Suggestions">
                {NAME_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={`ob-chip${nickname === suggestion ? " is-selected" : ""}`}
                    onClick={() => setNickname(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <p className="ob-name__hint">Leave it empty to keep “{selected?.manifest.displayName}”. You can rename it any time.</p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="ob-ready">
            <span className="ob-ready__stage">{selected ? <SpriteView pet={selected} state="waving" scale={0.7} /> : null}</span>
            <ul className="ob-ready__list">
              <li>
                <span className="ob-ready__icon">
                  <DropIcon />
                </span>
                <span>
                  <strong>Hydration reminders</strong>
                  Gentle nudges to drink water through the day.
                </span>
              </li>
              <li>
                <span className="ob-ready__icon">
                  <FocusIcon />
                </span>
                <span>
                  <strong>Breaks and focus</strong>
                  Timely breaks, and focus sessions that close distractions.
                </span>
              </li>
              <li>
                <span className="ob-ready__icon">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </span>
                <span>
                  <strong>Coding agent alerts</strong>
                  A poke when Claude Code or Codex needs you.
                </span>
              </li>
            </ul>
          </div>
        ) : null}
      </div>

      <footer className="ob__footer">
        {step > 0 ? (
          <button type="button" className="c-btn c-btn--ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
        ) : (
          <span />
        )}
        <span className="ob__count">
          Step {step + 1} of {ONBOARDING_STEPS.length}
        </span>
        <button type="button" className="c-btn c-btn--primary c-btn--arrow ob__next" onClick={next}>
          {step === ONBOARDING_STEPS.length - 1 ? "Start using Companion" : "Continue"}
          <ArrowIcon />
        </button>
      </footer>
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
  avatar,
  watersLogged,
  focusActive,
  focusMinutesLeft,
  focusDurationMinutes,
  pet,
  petNickname,
  companionDays,
  onDrink,
  onToggleFocus,
  focusLabel,
  stopFocusLabel
}: {
  userName: string;
  avatar: AvatarLook;
  watersLogged: number;
  focusActive: boolean;
  focusMinutesLeft: number;
  focusDurationMinutes: number;
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
        <Avatar {...avatar} size={44} />
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
        <section className="mcard">
          <div className="mcard__head">
            <span className="mcard__label">Hydration</span>
            <button type="button" className="mcard__btn" onClick={onDrink}>
              <PlusIcon size={12} />
              Log
            </button>
          </div>
          <div className="mcard__split">
            <div>
              <p className="mcard__value">
                {watersLogged}
                <span>/{DAILY_WATER_GOAL}</span>
              </p>
              <p className="mcard__sub">{remaining > 0 ? "glasses today" : "Goal reached"}</p>
            </div>
            <WaterGlass filled={watersLogged} goal={DAILY_WATER_GOAL} size={52} />
          </div>
        </section>

        <section className="mcard">
          <div className="mcard__head">
            <span className="mcard__label">Focus</span>
            <button type="button" className="mcard__btn" onClick={onToggleFocus}>
              {focusActive ? <StopIcon size={11} /> : <PlayIcon size={11} />}
              {focusActive ? "End" : "Start"}
            </button>
          </div>
          <p className="mcard__value mcard__value--timer">
            {String(focusActive ? focusMinutesLeft : focusDurationMinutes).padStart(2, "0")}:00
          </p>
          <p className="mcard__sub">{focusActive ? "Remaining" : "Ready"}</p>
          {focusActive ? (
            <div className="mcard__progress">
              <div className="mcard__bar" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.max(2, 100 - (focusMinutesLeft / Math.max(1, focusDurationMinutes)) * 100)}%`
                  }}
                />
              </div>
            </div>
          ) : null}
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
  scale,
  still = false
}: {
  pet: InstalledPet;
  state?: PetState;
  scale: number;
  /** Show the first frame only, with no animation. */
  still?: boolean;
}): JSX.Element | null {
  const asset = useMemo(() => getSelectedPetAsset(pet.slug, [pet], state), [pet, state]);
  if (asset.kind !== "sprite") return null;
  return (
    <span
      key={`${asset.src}:${asset.animation.row}`}
      className={`sprite-pet${still ? " is-still" : ""}`}
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
  updates: icon(
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
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
          <SparklesIcon size={13} className="spotlight__spark" />
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

/** The user's avatar: their photo, or a still pet portrait on a chosen colour. */
/** Everything needed to draw the user's avatar. */
export type AvatarLook = {
  image: string;
  pet: InstalledPet | undefined;
  color: string;
  art?: AvatarArtId;
};

export function Avatar({
  image,
  pet,
  size,
  color = "#E9E3D8",
  art,
  shape = "circle",
  ring = false
}: {
  image: string;
  pet: InstalledPet | undefined;
  size: number;
  color?: string;
  art?: AvatarArtId;
  shape?: "circle" | "rounded";
  ring?: boolean;
}): JSX.Element {
  return (
    <span
      className={`avatar is-${shape}${ring ? " avatar--ring" : ""}${image ? " avatar--photo" : ""}`}
      style={{ width: size, height: size, background: image ? undefined : color } as CSSProperties}
    >
      {image ? (
        <img src={image} alt="Profile" />
      ) : art ? (
        <AvatarArt id={art} color={color} size={size} />
      ) : pet ? (
        <span className="avatar__pet">
          <SpriteView pet={pet} scale={(size * 0.86) / 208} still />
        </span>
      ) : null}
    </span>
  );
}

const menuIcon = (paths: ReactNode): JSX.Element => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
);

/** Compact account row pinned to the bottom of the sidebar, with a dropdown menu. */
export function AccountMenu({
  avatar,
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
  avatar: AvatarLook;
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
            <Avatar {...avatar} size={40} />
            <div className="account__header-text">
              <p className="account__header-name">{name}</p>
              <p className="account__greeting">{greeting}</p>
            </div>
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
          <Avatar {...avatar} size={34} />
          <span className="account__who">
            <span className="account__name">{name}</span>
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
