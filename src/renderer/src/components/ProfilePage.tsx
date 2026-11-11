import { useEffect, useRef, useState } from "react";
import type { JSX, ReactNode } from "react";
import { AVATAR_COLORS } from "../../../shared/constants";
import type { AccountProfile, AccountResult, InstalledPet, UpdateStatus } from "../../../shared/types";
import appLogo from "../assets/applogo.png";
import { AVATAR_ART, AVATAR_ART_LABELS, AvatarArt } from "./AvatarArt";
import type { AvatarArtId } from "./AvatarArt";
import { Avatar, SpriteView } from "./CompanionPanels";
import type { AvatarLook } from "./CompanionPanels";

function Section({
  title,
  description,
  children,
  aside
}: {
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
}): JSX.Element {
  return (
    <section className="pf-section">
      <header className="pf-section__head">
        <div>
          <h2 className="pf-section__title">{title}</h2>
          {description ? <p className="pf-section__desc">{description}</p> : null}
        </div>
        {aside}
      </header>
      <div className="pf-section__body">{children}</div>
    </section>
  );
}

function Notice({ tone, children }: { tone: "ok" | "error"; children: ReactNode }): JSX.Element {
  return <p className={`pf-notice is-${tone}`}>{children}</p>;
}

function memberSince(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

const statIcon = (paths: ReactNode): JSX.Element => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
);

/** Dropdown for choosing a still pet portrait, a custom mark, a colour, or a photo. */
function AvatarPicker({
  pets,
  avatar,
  selectedValue,
  onPick,
  onColor,
  onUpload,
  onRemovePhoto,
  onClose
}: {
  pets: InstalledPet[];
  avatar: AvatarLook;
  selectedValue: string;
  onPick: (value: string) => void;
  onColor: (color: string) => void;
  onUpload: () => void;
  onRemovePhoto: () => void;
  onClose: () => void;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (event: PointerEvent): void => {
      if (!ref.current?.contains(event.target as Node) && !(event.target as Element).closest?.(".pf-hero__edit")) onClose();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="avp" ref={ref} role="dialog" aria-label="Choose your avatar">
      <p className="avp__title">Companions</p>
      <div className="avp__grid">
        {pets.map((pet) => {
          const value = pet.slug;
          const active = !avatar.image && selectedValue === value;
          return (
            <button
              key={pet.slug}
              type="button"
              className={`avp__tile${active ? " is-active" : ""}`}
              title={pet.manifest.displayName}
              onClick={() => onPick(value)}
            >
              <Avatar image="" pet={pet} color={avatar.color} size={44} shape="rounded" />
            </button>
          );
        })}
      </div>

      <p className="avp__title">Marks</p>
      <div className="avp__grid">
        {AVATAR_ART.map((id: AvatarArtId) => {
          const value = `art:${id}`;
          const active = !avatar.image && selectedValue === value;
          return (
            <button
              key={id}
              type="button"
              className={`avp__tile${active ? " is-active" : ""}`}
              title={AVATAR_ART_LABELS[id]}
              onClick={() => onPick(value)}
            >
              <span className="avp__art" style={{ background: avatar.color }}>
                <AvatarArt id={id} color={avatar.color} size={44} />
              </span>
            </button>
          );
        })}
      </div>

      <p className="avp__title">Background</p>
      <div className="avp__swatches">
        {AVATAR_COLORS.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            className={`avp__swatch${avatar.color.toLowerCase() === swatch.value.toLowerCase() ? " is-active" : ""}`}
            style={{ background: swatch.value }}
            title={swatch.name}
            aria-label={swatch.name}
            onClick={() => onColor(swatch.value)}
          />
        ))}
      </div>

      <div className="avp__footer">
        <button type="button" className="c-btn c-btn--primary" onClick={onUpload}>
          Upload photo
        </button>
        {avatar.image ? (
          <button type="button" className="pf-link is-muted" onClick={onRemovePhoto}>
            Remove photo
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ProfilePage({
  account,
  avatar,
  avatarValue,
  pets,
  pet,
  petNickname,
  companionDays,
  totals,
  update,
  photoError,
  onChoosePhoto,
  onRemovePhoto,
  onPickAvatar,
  onAvatarColor,
  onSaveProfile,
  onChangePassword,
  onNicknameChange,
  onSignOut,
  onCheckUpdates,
  onInstallUpdate
}: {
  account: AccountProfile;
  avatar: AvatarLook;
  /** "" (current companion), a pet slug, or "art:<id>". */
  avatarValue: string;
  pets: InstalledPet[];
  pet: InstalledPet | undefined;
  petNickname: string;
  companionDays: number;
  totals: { waters: number; breaks: number; focusMinutes: number };
  update: UpdateStatus;
  photoError: string | null;
  onChoosePhoto: () => void;
  onRemovePhoto: () => void;
  onPickAvatar: (value: string) => void;
  onAvatarColor: (color: string) => void;
  onSaveProfile: (changes: { name: string }) => Promise<AccountResult>;
  onChangePassword: (input: { current: string; next: string }) => Promise<AccountResult>;
  onNicknameChange: (nickname: string) => void;
  onSignOut: () => void;
  onCheckUpdates: () => void;
  onInstallUpdate: () => void;
}): JSX.Element {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [name, setName] = useState(account.name);
  const [profileNotice, setProfileNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    setName(account.name);
  }, [account.id, account.name]);

  const dirty = name.trim() !== account.name;
  const selectedAvatarValue = avatarValue || pet?.slug || "";

  async function saveProfile(): Promise<void> {
    setSaving(true);
    const result = await onSaveProfile({ name });
    setSaving(false);
    setProfileNotice(result.ok ? { tone: "ok", text: "Profile saved." } : { tone: "error", text: result.error });
  }

  async function savePassword(): Promise<void> {
    const result = await onChangePassword({ current: currentPassword, next: nextPassword });
    if (result.ok) {
      setCurrentPassword("");
      setNextPassword("");
      setPasswordOpen(false);
      setPasswordNotice({ tone: "ok", text: "Password updated." });
    } else {
      setPasswordNotice({ tone: "error", text: result.error });
    }
  }

  const focusHours = totals.focusMinutes >= 60;

  return (
    <div className="pf">
      <section className="pf-hero">
        <div className="pf-hero__avatar">
          <Avatar {...avatar} size={96} shape="rounded" />
        </div>
        <div className="pf-hero__text">
          <p className="pf-hero__eyebrow">Your profile</p>
          <h1 className="pf-hero__name">{account.name}</h1>
          <p className="pf-hero__sub">Member since {memberSince(account.createdAt)}</p>
        </div>
        <div className="pf-hero__actions">
          <button
            type="button"
            className="c-btn c-btn--ghost pf-hero__edit"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z" />
            </svg>
            Edit avatar
            <svg className={`pf-hero__caret${pickerOpen ? " is-open" : ""}`} viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {pickerOpen ? (
            <AvatarPicker
              pets={pets}
              avatar={avatar}
              selectedValue={selectedAvatarValue}
              onPick={onPickAvatar}
              onColor={onAvatarColor}
              onUpload={() => {
                setPickerOpen(false);
                onChoosePhoto();
              }}
              onRemovePhoto={onRemovePhoto}
              onClose={() => setPickerOpen(false)}
            />
          ) : null}
        </div>
      </section>
      {photoError ? <Notice tone="error">{photoError}</Notice> : null}

      <div className="pf-tiles">
        <div className="pf-tile">
          <span className="pf-tile__icon">
            {statIcon(
              <>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </>
            )}
          </span>
          <span className="pf-tile__label">Days together</span>
          <span className="pf-tile__value">
            {companionDays}
            <small>{companionDays === 1 ? "day" : "days"}</small>
          </span>
        </div>
        <div className="pf-tile">
          <span className="pf-tile__icon">
            {statIcon(<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />)}
          </span>
          <span className="pf-tile__label">Water</span>
          <span className="pf-tile__value">
            {totals.waters}
            <small>glasses</small>
          </span>
        </div>
        <div className="pf-tile">
          <span className="pf-tile__icon">
            {statIcon(
              <>
                <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                <path d="M6 2v2M10 2v2M14 2v2" />
              </>
            )}
          </span>
          <span className="pf-tile__label">Breaks</span>
          <span className="pf-tile__value">{totals.breaks}</span>
        </div>
        <div className="pf-tile">
          <span className="pf-tile__icon">
            {statIcon(
              <>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </>
            )}
          </span>
          <span className="pf-tile__label">Focus</span>
          <span className="pf-tile__value">
            {focusHours ? (totals.focusMinutes / 60).toFixed(1) : totals.focusMinutes}
            <small>{focusHours ? "h" : "min"}</small>
          </span>
        </div>
      </div>

      <Section
        title="Account"
        description="Your display name and sign-in email."
        aside={
          <button type="button" className="c-btn c-btn--danger" onClick={onSignOut}>
            Sign out
          </button>
        }
      >
        <div className="pf-account__fields">
          <label className="pf-field">
            <span>Full name</span>
            <input className="c-input" type="text" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="pf-field">
            <span>Email</span>
            <div className="pf-locked" title="Your sign-in email can't be changed">
              <span className="pf-locked__value">{account.email}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <small>Used to sign in. It can't be changed.</small>
          </div>
          <div className="pf-account__save">
            {profileNotice ? <Notice tone={profileNotice.tone}>{profileNotice.text}</Notice> : <span />}
            <button type="button" className="c-btn c-btn--primary" disabled={!dirty || saving} onClick={() => void saveProfile()}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </Section>

      <Section
        title="Password"
        description="Use at least 8 characters."
        aside={
          passwordOpen ? null : (
            <button type="button" className="c-btn c-btn--ghost" onClick={() => setPasswordOpen(true)}>
              Change password
            </button>
          )
        }
      >
        {passwordOpen ? (
          <div className="pf-password">
            <label className="pf-field">
              <span>Current password</span>
              <input
                className="c-input"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </label>
            <label className="pf-field">
              <span>New password</span>
              <input
                className="c-input"
                type="password"
                autoComplete="new-password"
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
              />
            </label>
            <div className="pf-password__actions">
              <button type="button" className="c-btn c-btn--ghost" onClick={() => setPasswordOpen(false)}>
                Cancel
              </button>
              <button type="button" className="c-btn c-btn--primary" onClick={() => void savePassword()}>
                Update password
              </button>
            </div>
          </div>
        ) : null}
        {passwordNotice ? <Notice tone={passwordNotice.tone}>{passwordNotice.text}</Notice> : null}
      </Section>

      <Section title="Your companion" description="Give your desktop friend a name of its own.">
        <div className="pf-companion">
          <span className="pf-companion__stage">{pet ? <SpriteView pet={pet} scale={0.38} /> : null}</span>
          <label className="pf-field pf-companion__field">
            <span>Companion name</span>
            <input
              className="c-input"
              type="text"
              maxLength={24}
              placeholder={pet?.manifest.displayName ?? "Name your companion"}
              value={petNickname}
              onChange={(event) => onNicknameChange(event.target.value)}
            />
            <small>{pet ? `A ${pet.manifest.displayName}` : ""}</small>
          </label>
        </div>
      </Section>


    </div>
  );
}

function relativeTime(timestamp?: number): string {
  if (!timestamp) return "never";
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : new Date(timestamp).toLocaleDateString();
}

export function SoftwareUpdate({
  status,
  onCheck,
  onInstall
}: {
  status: UpdateStatus;
  onCheck: () => void;
  onInstall: () => void;
}): JSX.Element {
  const busy = status.state === "checking" || status.state === "downloading";
  const ready = status.state === "downloaded" || status.state === "available";
  let badge: { tone: "ok" | "new" | "busy" | "warn" | "muted"; label: string } = { tone: "muted", label: "Automatic" };
  let message = "Companion checks for new versions automatically and lets you know when one is ready.";

  if (status.state === "checking") {
    badge = { tone: "busy", label: "Checking" };
    message = "Looking for a newer version…";
  } else if (status.state === "downloading") {
    badge = { tone: "busy", label: `${status.progress ?? 0}%` };
    message = `Downloading version ${status.version ?? ""} in the background.`;
  } else if (status.state === "downloaded") {
    badge = { tone: "new", label: "Ready" };
    message = `Version ${status.version} is downloaded. Restart Companion to finish updating.`;
  } else if (status.state === "available") {
    badge = { tone: "new", label: "Available" };
    message = `Version ${status.version} is available. Download it to update.`;
  } else if (status.state === "not-available") {
    badge = { tone: "ok", label: "Up to date" };
    message = `You have the latest version. Last checked ${relativeTime(status.checkedAt)}.`;
  } else if (status.state === "error") {
    badge = { tone: "warn", label: "Offline" };
    message = "Couldn't reach the update server. Check your connection and try again.";
  }

  return (
    <section className="pf-section su">
      <div className="su__head">
        <img src={appLogo} alt="" className="su__logo" />
        <div className="su__titles">
          <h2 className="pf-section__title">Software update</h2>
          <p className="su__version">Companion {status.currentVersion || ""}</p>
        </div>
        <span className={`su__badge is-${badge.tone}`}>{badge.label}</span>
      </div>
      <p className="su__message">{message}</p>
      {status.state === "downloading" ? (
        <div className="su__progress" role="progressbar" aria-valuenow={status.progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${Math.max(3, status.progress ?? 0)}%` }} />
        </div>
      ) : null}
      {ready && status.releaseNotes ? (
        <div className="su__notes">
          <p className="su__notes-title">What&apos;s new in {status.version}</p>
          <p className="su__notes-body">{status.releaseNotes}</p>
        </div>
      ) : null}
      <div className="su__footer">
        <span />
        {ready ? (
          <button type="button" className="c-btn c-btn--primary" onClick={onInstall}>
            {status.state === "downloaded" ? "Restart & update" : "Download update"}
          </button>
        ) : (
          <button type="button" className="c-btn c-btn--ghost" onClick={onCheck} disabled={busy}>
            {busy ? "Checking…" : "Check for updates"}
          </button>
        )}
      </div>
    </section>
  );
}
