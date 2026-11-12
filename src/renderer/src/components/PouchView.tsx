import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { allPets } from "../../../shared/bundledPets";
import { DAILY_WATER_GOAL } from "../../../shared/constants";
import type { PouchItem } from "../../../shared/types";
import { useNow, useSnapshot } from "../hooks";
import { PlayIcon, PlusIcon, StopIcon, XIcon } from "./Icons";

type Filter = "all" | "text" | "images";

function timeAgo(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 45) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : new Date(timestamp).toLocaleDateString();
}

const TextGlyph = (): JSX.Element => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7V5h16v2" />
    <path d="M12 5v14" />
    <path d="M9 19h6" />
  </svg>
);

const LinkGlyph = (): JSX.Element => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const CheckGlyph = (): JSX.Element => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const tileIcon = (paths: JSX.Element): JSX.Element => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
);

/** Compboard: opened by clicking the pet. Quick actions plus recent clipboard items. */
export function PouchView(): JSX.Element {
  const snapshot = useSnapshot();
  const clock = useNow(15_000);
  const settings = snapshot.settings;
  const pet = allPets(settings.installedPets).find((entry) => entry.slug === settings.selectedPetId);
  const petName = settings.petNickname.trim() || pet?.manifest.displayName || "Your companion";
  const focusLeft = snapshot.timers.focusEndsAt ? Math.max(0, Math.ceil((snapshot.timers.focusEndsAt - clock) / 60000)) : 0;
  const [items, setItems] = useState<PouchItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [closing, setClosing] = useState(false);
  // The window is kept warm between opens; each open replays the entrance animation.
  const [openCount, setOpenCount] = useState(0);
  useEffect(() => window.companion.onPouchClosing(() => setClosing(true)), []);
  useEffect(
    () =>
      window.companion.onPouchOpening(() => {
        setClosing(false);
        setConfirmClear(false);
        setOpenCount(count => count + 1);
      }),
    []
  );
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void window.companion.listPouch().then(setItems);
    const off = window.companion.onPouchUpdated(setItems);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") window.companion.closePouch();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      off();
      window.clearInterval(tick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const shown = useMemo(
    () =>
      items.filter((item) =>
        filter === "all" ? true : filter === "images" ? item.kind === "image" : item.kind !== "image"
      ),
    [items, filter]
  );
  // Keep the board short: the latest few images and clips.
  const images = shown.filter((item) => item.kind === "image").slice(0, 4);
  const texts = shown.filter((item) => item.kind !== "image").slice(0, 6);

  async function copy(item: PouchItem): Promise<void> {
    const ok = await window.companion.copyPouchItem(item.id);
    if (!ok) return;
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 1400);
  }

  return (
    <main key={openCount} className={`pouch${closing ? " is-closing" : ""}`}>
      <header className="hb__head">
        <div className="hb__titles">
          <h1 className="hb__title">Compboard</h1>
          <p className="hb__sub">{petName} is here to help</p>
        </div>
        <button type="button" className="pouch__icon-btn" aria-label="Close" onClick={() => window.companion.closePouch()}>
          <XIcon size={14} />
        </button>
      </header>

      <div className="hb__actions">
        <button type="button" className="hb__tile" onClick={() => window.companion.logWater()}>
          <span className="hb__tile-icon">
            <PlusIcon size={15} />
          </span>
          <span className="hb__tile-label">Log water</span>
          <span className="hb__tile-meta">
            {snapshot.stats.watersLogged}/{DAILY_WATER_GOAL} today
          </span>
        </button>
        <button
          type="button"
          className={`hb__tile${snapshot.focusActive ? " is-on" : ""}`}
          onClick={snapshot.focusActive ? window.companion.stopFocus : window.companion.startFocus}
        >
          <span className="hb__tile-icon">{snapshot.focusActive ? <StopIcon size={13} /> : <PlayIcon size={13} />}</span>
          <span className="hb__tile-label">{snapshot.focusActive ? "End focus" : "Start focus"}</span>
          <span className="hb__tile-meta">
            {snapshot.focusActive ? `${focusLeft} min left` : `${settings.focusDurationMinutes} min session`}
          </span>
        </button>
        <button type="button" className="hb__tile" onClick={() => window.companion.takeBreakNow()}>
          <span className="hb__tile-icon">
            {tileIcon(
              <>
                <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              </>
            )}
          </span>
          <span className="hb__tile-label">Take a break</span>
          <span className="hb__tile-meta">Stretch for a minute</span>
        </button>
        <button type="button" className="hb__tile" onClick={() => window.companion.openDashboard()}>
          <span className="hb__tile-icon">
            {tileIcon(
              <>
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </>
            )}
          </span>
          <span className="hb__tile-label">Dashboard</span>
          <span className="hb__tile-meta">Stats and settings</span>
        </button>
      </div>

      <div className="hb__section-head">
        <span className="hb__section-title">Clipboard</span>
        <span className="hb__section-count">{items.length ? items.length : ""}</span>
        {items.length ? (
          <>
            <div className="pouch__tabs" role="tablist">
              {(["all", "text", "images"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={filter === tab}
                  className={`pouch__tab${filter === tab ? " is-active" : ""}`}
                  onClick={() => setFilter(tab)}
                >
                  {tab === "all" ? "All" : tab === "text" ? "Text" : "Images"}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="pouch__icon-btn hb__bin"
              aria-label="Clear clipboard"
              title="Clear clipboard"
              onClick={() => setConfirmClear(true)}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </>
        ) : null}
      </div>

      {confirmClear ? (
        <div className="hb__confirm" role="alertdialog" aria-label="Clear clipboard">
          <p>Clear all {items.length} {items.length === 1 ? "item" : "items"}? This can't be undone.</p>
          <div className="hb__confirm-actions">
            <button type="button" className="hb__confirm-btn" onClick={() => setConfirmClear(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="hb__confirm-btn is-danger"
              onClick={() => {
                window.companion.clearPouch();
                setConfirmClear(false);
              }}
            >
              Clear all
            </button>
          </div>
        </div>
      ) : null}

      <div className="pouch__body">
        {!items.length ? (
          <div className="pouch__empty">
            <span className="pouch__empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="2" width="8" height="4" rx="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              </svg>
            </span>
            <span className="pouch__empty-copy">
              <span className="pouch__empty-title">Nothing copied yet</span>
              <span className="pouch__empty-text">
                Copy text or press <kbd>Win</kbd> <kbd>Shift</kbd> <kbd>S</kbd>
              </span>
            </span>
          </div>
        ) : null}

        {images.length ? (
          <section className="pouch__section">
            {filter === "all" ? <p className="pouch__label">Screenshots &amp; images</p> : null}
            <div className="pouch__grid">
              {images.map((item) => (
                <div key={item.id} className="pouch__thumb">
                  <button type="button" className="pouch__thumb-btn" onClick={() => void copy(item)} title="Copy image">
                    <img src={item.preview} alt="" draggable={false} />
                    {copiedId === item.id ? (
                      <span className="pouch__copied">
                        <CheckGlyph />
                        Copied
                      </span>
                    ) : (
                      <span className="pouch__hover">Copy</span>
                    )}
                  </button>
                  <p className="pouch__thumb-meta">
                    {item.width && item.height ? `${item.width} × ${item.height}` : "Image"}
                    <span>{timeAgo(item.createdAt, now)}</span>
                  </p>
                  <button
                    type="button"
                    className="pouch__remove"
                    aria-label="Remove"
                    onClick={() => window.companion.removePouchItem(item.id)}
                  >
                    <XIcon size={11} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {texts.length ? (
          <section className="pouch__section">
            {filter === "all" && images.length ? <p className="pouch__label">Text &amp; links</p> : null}
            <ul className="pouch__list">
              {texts.map((item) => (
                <li key={item.id} className="pouch__row">
                  <button type="button" className="pouch__row-btn" onClick={() => void copy(item)} title="Copy">
                    <span className="pouch__row-icon">{item.kind === "link" ? <LinkGlyph /> : <TextGlyph />}</span>
                    <span className="pouch__row-text">{item.preview.trim().replace(/\s+/g, " ")}</span>
                    <span className="pouch__row-meta">
                      {copiedId === item.id ? (
                        <span className="pouch__row-copied">
                          <CheckGlyph />
                          Copied
                        </span>
                      ) : (
                        timeAgo(item.createdAt, now)
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="pouch__remove pouch__remove--row"
                    aria-label="Remove"
                    onClick={() => window.companion.removePouchItem(item.id)}
                  >
                    <XIcon size={11} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <footer className="pouch__foot">Kept only while Companion is open · Click to copy</footer>
    </main>
  );
}
