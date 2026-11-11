import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import type { PouchItem } from "../../../shared/types";
import { XIcon } from "./Icons";

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

/** The pet's clipboard pouch: recent copies and screenshots, one click to reuse. */
export function PouchView(): JSX.Element {
  const [items, setItems] = useState<PouchItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
  const images = shown.filter((item) => item.kind === "image");
  const texts = shown.filter((item) => item.kind !== "image");

  async function copy(item: PouchItem): Promise<void> {
    const ok = await window.companion.copyPouchItem(item.id);
    if (!ok) return;
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 1400);
  }

  return (
    <main className="pouch">
      <header className="pouch__head">
        <div>
          <h1 className="pouch__title">Clipboard</h1>
          <p className="pouch__sub">
            {items.length ? `${items.length} recent ${items.length === 1 ? "item" : "items"}` : "Nothing copied yet"}
          </p>
        </div>
        <div className="pouch__head-actions">
          {items.length ? (
            <button type="button" className="pouch__text-btn" onClick={() => window.companion.clearPouch()}>
              Clear
            </button>
          ) : null}
          <button type="button" className="pouch__icon-btn" aria-label="Close" onClick={() => window.companion.closePouch()}>
            <XIcon size={14} />
          </button>
        </div>
      </header>

      {items.length ? (
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
            <p className="pouch__empty-title">Your pouch is empty</p>
            <p className="pouch__empty-text">
              Copy some text or take a screenshot with <kbd>Win</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>, and it will be
              waiting here.
            </p>
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
                    ) : null}
                  </button>
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
