import { useState } from "react";
import type { FormEvent, JSX } from "react";
import type { InstalledPet } from "../../../shared/types";
import appLogo from "../assets/applogo.png";
import { SpriteView } from "./CompanionPanels";

const CHECKOUT_URL = "https://trycompanion.vercel.app/checkout";

/** Formats typing or pasting into CMPN-XXXX-XXXX-XXXX. */
function formatKey(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = (raw.startsWith("CMPN") ? raw.slice(4) : raw).slice(0, 12);
  const groups = body.match(/.{1,4}/g) ?? [];
  return groups.length ? ["CMPN", ...groups].join("-") : raw.startsWith("C") ? raw.slice(0, 4) : "";
}

/** Shown after sign-in when this account has no active license on this computer. */
export function LicenseView({ heroPet, email, reason }: { heroPet: InstalledPet | undefined; email: string; reason?: string }): JSX.Element {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await window.companion.activateLicense(key);
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <main className="auth">
      <section className="auth__brand" aria-hidden="true">
        <div className="auth__brand-top">
          <img src={appLogo} alt="" className="auth__logo" />
          <span>Companion</span>
        </div>
        <div className="auth__stage">{heroPet ? <SpriteView pet={heroPet} state="waving" scale={1.05} /> : null}</div>
        <div className="auth__brand-copy">
          <h2>One license, yours to keep.</h2>
          <p>Every companion, focus mode, the Compboard and every future update.</p>
        </div>
      </section>

      <section className="auth__panel">
        <form className="auth__card" onSubmit={(event) => void submit(event)} noValidate>
          <h1 className="auth__title">Activate Companion</h1>
          <p className="auth__subtitle">
            Paste the license key from your email. It unlocks Companion for <b>{email}</b>.
          </p>

          <label className="auth__field">
            <span>License key</span>
            <input
              className="c-input license__input"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(event) => {
                setKey(formatKey(event.target.value));
                setError(null);
              }}
              placeholder="CMPN-XXXX-XXXX-XXXX"
              aria-invalid={Boolean(error)}
              autoFocus
            />
          </label>

          {error || reason ? (
            <p className="auth__error" role="alert">
              {error ?? reason}
            </p>
          ) : null}

          <button type="submit" className="c-btn c-btn--primary c-btn--block auth__btn" disabled={busy || key.length < 19}>
            {busy ? "Activating…" : "Activate"}
          </button>
          <p className="license__note">
            One license works for one Companion account.
          </p>

          <div className="license__links">
            <button type="button" className="license__link" onClick={() => window.companion.openExternal(CHECKOUT_URL)}>
              Get a license
            </button>
            <button type="button" className="license__link" onClick={() => void window.companion.signOut()}>
              Use another account
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
