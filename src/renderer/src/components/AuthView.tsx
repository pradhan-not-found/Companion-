import { useState } from "react";
import { ArrowLeftIcon } from "./Icons";
import type { FormEvent, JSX } from "react";
import type { InstalledPet } from "../../../shared/types";
import appLogo from "../assets/applogo.png";
import { SpriteView } from "./CompanionPanels";

type Mode = "welcome" | "sign-in" | "create";

/** First screen when nobody is signed in: welcome, sign in, or create an account. */
export function AuthView({ heroPet }: { heroPet: InstalledPet | undefined }): JSX.Element {
  const [mode, setMode] = useState<Mode>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchTo(next: Mode): void {
    setMode(next);
    setError(null);
    setPassword("");
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result =
      mode === "create"
        ? await window.companion.createAccount({ name, email, password })
        : await window.companion.signIn({ email, password });
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
          <h2>A friend on your desktop.</h2>
          <p>Breaks, water, focus and your coding agents. Gently looked after while you work.</p>
        </div>
      </section>

      <section className="auth__panel">
        {mode === "welcome" ? (
          <div className="auth__card auth__card--welcome">
            <h1 className="auth__title">Welcome to Companion</h1>
            <p className="auth__subtitle">Create an account to keep your companion, stats and reminders.</p>
            <div className="auth__actions">
              <button type="button" className="c-btn c-btn--primary c-btn--block auth__btn" onClick={() => switchTo("create")}>
                Create account
              </button>
              <button type="button" className="c-btn c-btn--ghost c-btn--block auth__btn" onClick={() => switchTo("sign-in")}>
                Sign in
              </button>
            </div>
            {!window.companion.isPackaged ? (
              <button
                type="button"
                className="auth__demo"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  void window.companion.signInDemo().then((result) => {
                    setBusy(false);
                    if (!result.ok) setError(result.error);
                  });
                }}
              >
                Try the demo
                <span>Development build · signs in as Demo User</span>
              </button>
            ) : null}
            {error ? (
              <p className="auth__error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <form className="auth__card" onSubmit={(event) => void submit(event)} noValidate>
            <button type="button" className="auth__back" onClick={() => switchTo("welcome")}>
              <ArrowLeftIcon size={15} />
              Back
            </button>
            <h1 className="auth__title">{mode === "create" ? "Create your account" : "Welcome back"}</h1>
            <p className="auth__subtitle">
              {mode === "create" ? "It takes less than a minute." : "Sign in to pick up where you left off."}
            </p>

            {mode === "create" ? (
              <label className="auth__field">
                <span>Your name</span>
                <input
                  className="c-input"
                  type="text"
                  autoComplete="name"
                  maxLength={40}
                  placeholder="Alex Morgan"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoFocus
                />
              </label>
            ) : null}
            <label className="auth__field">
              <span>Email</span>
              <input
                className="c-input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus={mode === "sign-in"}
              />
            </label>
            <label className="auth__field">
              <span>Password</span>
              <div className="auth__password">
                <input
                  className="c-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "create" ? "new-password" : "current-password"}
                  placeholder={mode === "create" ? "At least 8 characters" : "Your password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button type="button" className="auth__reveal" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {error ? (
              <p className="auth__error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="c-btn c-btn--primary c-btn--block auth__btn" disabled={busy}>
              {busy ? "Please wait…" : mode === "create" ? "Create account" : "Sign in"}
            </button>
            <p className="auth__switch">
              {mode === "create" ? "Already have an account?" : "New to Companion?"}{" "}
              <button type="button" className="auth__link" onClick={() => switchTo(mode === "create" ? "sign-in" : "create")}>
                {mode === "create" ? "Sign in" : "Create an account"}
              </button>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
