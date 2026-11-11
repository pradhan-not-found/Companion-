import { useEffect, useState } from "react";
import type { JSX, ReactNode } from "react";
import type { AccountProfile, AccountResult, InstalledPet, UpdateStatus } from "../../../shared/types";
import appLogo from "../assets/applogo.png";
import { Avatar, SpriteView } from "./CompanionPanels";

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

export function ProfilePage({
  account,
  avatarImage,
  pet,
  petNickname,
  companionDays,
  totals,
  update,
  photoError,
  onChoosePhoto,
  onRemovePhoto,
  onSaveProfile,
  onChangePassword,
  onNicknameChange,
  onSignOut,
  onCheckUpdates,
  onInstallUpdate
}: {
  account: AccountProfile;
  avatarImage: string;
  pet: InstalledPet | undefined;
  petNickname: string;
  companionDays: number;
  totals: { waters: number; breaks: number; focusMinutes: number };
  update: UpdateStatus;
  photoError: string | null;
  onChoosePhoto: () => void;
  onRemovePhoto: () => void;
  onSaveProfile: (changes: { name: string; email: string }) => Promise<AccountResult>;
  onChangePassword: (input: { current: string; next: string }) => Promise<AccountResult>;
  onNicknameChange: (nickname: string) => void;
  onSignOut: () => void;
  onCheckUpdates: () => void;
  onInstallUpdate: () => void;
}): JSX.Element {
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [profileNotice, setProfileNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    setName(account.name);
    setEmail(account.email);
  }, [account.id, account.name, account.email]);

  const dirty = name.trim() !== account.name || email.trim().toLowerCase() !== account.email;

  async function saveProfile(): Promise<void> {
    setSaving(true);
    const result = await onSaveProfile({ name, email });
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
      <Section
        title="Account"
        description={`Member since ${memberSince(account.createdAt)}`}
        aside={
          <button type="button" className="c-btn c-btn--danger" onClick={onSignOut}>
            Sign out
          </button>
        }
      >
        <div className="pf-account">
          <div className="pf-account__photo">
            <button type="button" className="pf-account__avatar" onClick={onChoosePhoto} aria-label="Change profile photo">
              <Avatar image={avatarImage} pet={pet} size={72} />
            </button>
            <div className="pf-account__photo-actions">
              <button type="button" className="pf-link" onClick={onChoosePhoto}>
                {avatarImage ? "Change photo" : "Upload photo"}
              </button>
              {avatarImage ? (
                <button type="button" className="pf-link is-muted" onClick={onRemovePhoto}>
                  Remove
                </button>
              ) : null}
            </div>
          </div>
          <div className="pf-account__fields">
            <label className="pf-field">
              <span>Full name</span>
              <input className="c-input" type="text" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="pf-field">
              <span>Email</span>
              <input
                className="c-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <div className="pf-account__save">
              {profileNotice ? <Notice tone={profileNotice.tone}>{profileNotice.text}</Notice> : <span />}
              <button
                type="button"
                className="c-btn c-btn--primary"
                disabled={!dirty || saving}
                onClick={() => void saveProfile()}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
        {photoError ? <Notice tone="error">{photoError}</Notice> : null}
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

      <Section title="Activity" description="Everything you've done together so far.">
        <dl className="pf-stats">
          <div>
            <dt>Days together</dt>
            <dd>{companionDays}</dd>
          </div>
          <div>
            <dt>Glasses of water</dt>
            <dd>{totals.waters}</dd>
          </div>
          <div>
            <dt>Breaks taken</dt>
            <dd>{totals.breaks}</dd>
          </div>
          <div>
            <dt>Focus time</dt>
            <dd>
              {focusHours ? (totals.focusMinutes / 60).toFixed(1) : totals.focusMinutes}
              <small>{focusHours ? "h" : "min"}</small>
            </dd>
          </div>
        </dl>
      </Section>

      <SoftwareUpdate status={update} onCheck={onCheckUpdates} onInstall={onInstallUpdate} />
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
    message = `Version ${status.version} is available. This portable copy can't update itself, so download it from GitHub.`;
  } else if (status.state === "not-available") {
    badge = { tone: "ok", label: "Up to date" };
    message = `You have the latest version. Last checked ${relativeTime(status.checkedAt)}.`;
  } else if (status.state === "error") {
    badge = { tone: "warn", label: "Offline" };
    message = "Couldn't reach the update server. Check your connection and try again.";
  } else if (status.state === "unsupported") {
    badge = { tone: "muted", label: "Dev build" };
    message = "Updates are turned off while running from source. Installed copies update automatically.";
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
        <span className="su__fine">Updates come from Companion&apos;s GitHub Releases.</span>
        {ready ? (
          <button type="button" className="c-btn c-btn--primary" onClick={onInstall}>
            {status.state === "downloaded" ? "Restart & update" : "Download update"}
          </button>
        ) : (
          <button type="button" className="c-btn c-btn--ghost" onClick={onCheck} disabled={busy || status.state === "unsupported"}>
            {busy ? "Checking…" : "Check for updates"}
          </button>
        )}
      </div>
    </section>
  );
}
