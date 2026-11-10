import type { JSX } from "react";
import { i18n, resolveLanguage } from "../../shared/i18n";
import { PetView } from "./components/PetView";
import { SettingsView } from "./components/SettingsView";
import { companionApi } from "./companionApi";

function PreloadUnavailable(): JSX.Element {
  const labels = i18n(resolveLanguage(navigator.language)).settings;
  return (
    <main className="settings-shell">
      <header>
        <p className="eyebrow">Companion</p>
        <h1>{labels.preloadUnavailable}</h1>
      </header>
      <section className="settings-section">
        <p className="diagnostic-copy">{labels.preloadCopy}</p>
      </section>
    </main>
  );
}

export default function App(): JSX.Element {
  if (!companionApi()) return <PreloadUnavailable />;

  const route = window.location.hash.replace("#", "");
  if (route === "settings") return <SettingsView />;
  return <PetView />;
}
