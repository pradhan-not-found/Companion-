interface DashboardProps {
  userName: string;
  sips: number;
  message: string;
  isSleeping: boolean;
  onDrink: () => void;
  onRemind: () => void;
  onClose: () => void;
  onCloseApp: () => void;
}

const DAILY_GOAL = 8;

export default function Dashboard({
  userName, sips, message, isSleeping,
  onDrink, onRemind, onClose, onCloseApp,
}: DashboardProps) {
  const pct     = Math.min(sips / DAILY_GOAL, 1);
  const r       = 28;
  const circ    = 2 * Math.PI * r;
  const filled  = circ * pct;
  const remaining = Math.max(DAILY_GOAL - sips, 0);

  return (
    <div className="dash-overlay" onClick={onClose}>
      <div className="dash-panel" onClick={e => e.stopPropagation()}>

        {/* ── Titlebar ───────────────────────────────────────── */}
        <div className="dash-bar">
          <div className="dash-wc">
            <button className="wc wc-red"    onClick={onCloseApp} title="Quit" />
            <button className="wc wc-yellow" onClick={onClose}    title="Dismiss" />
          </div>
          <span className="dash-bar-label">Meowdration</span>
        </div>

        {/* ── Hero: ring + name ──────────────────────────────── */}
        <div className="dash-hero">
          <div className="dash-ring-wrap">
            <svg className="dash-ring-svg" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r={r} fill="none"
                stroke="rgba(59,130,246,0.12)" strokeWidth="6" />
              <circle cx="36" cy="36" r={r} fill="none"
                stroke="#3b82f6" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${filled} ${circ - filled}`}
                strokeDashoffset={circ * 0.25}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
              <text x="36" y="33" textAnchor="middle"
                fontSize="13" fontWeight="700" fill="#2E2E2D" fontFamily="Switzer,sans-serif">
                {sips}
              </text>
              <text x="36" y="46" textAnchor="middle"
                fontSize="7.5" fill="#9E9D9A" fontFamily="Switzer,sans-serif">
                sips
              </text>
            </svg>
          </div>

          <div className="dash-hero-text">
            <p className="dash-name">Hey, {userName}!</p>
            <p className="dash-status">
              {isSleeping
                ? '😴 I was sleeping…'
                : remaining > 0
                  ? `${remaining} more to reach goal`
                  : '🎉 Daily goal reached!'}
            </p>
          </div>
        </div>

        {/* ── Cat message ────────────────────────────────────── */}
        <div className="dash-bubble">
          <span className="dash-bubble-dot" />
          <p>{message || `Meow! Hydrate, ${userName}! 💧`}</p>
        </div>

        <div className="dash-divider" />

        {/* ── Actions ────────────────────────────────────────── */}
        <div className="dash-actions">
          <button className="dash-btn dash-primary" onClick={onDrink}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
            </svg>
            I drank water!
          </button>
          <button className="dash-btn dash-ghost" onClick={onRemind}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Remind me
          </button>
          <button className="dash-btn dash-ghost" onClick={() => {
            const api = (window as any).electronAPI;
            if (api?.resetStore) {
              api.resetStore().then(() => window.location.reload());
            } else {
              window.location.reload();
            }
          }} title="Change Pet">
            ⚙️ Setup
          </button>
        </div>

        {/* ── Pip progress ───────────────────────────────────── */}
        <div className="dash-footer">
          <span className="dash-footer-label">Daily goal · {DAILY_GOAL} sips</span>
          <div className="dash-pips">
            {Array.from({ length: DAILY_GOAL }, (_, i) => (
              <div key={i} className={`pip${i < sips ? ' pip-on' : ''}`} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
