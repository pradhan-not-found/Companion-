/**
 * Circular checkout progress: finished steps are filled with a check, the current
 * step's ring fills in, and the connecting line fills as you move forward.
 */
export default function CheckoutSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="ck-steps" aria-label="Checkout progress">
      {steps.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'todo';
        return (
          <li key={label} className={`ck-steps__item is-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
            <span className="ck-steps__circle">
              <svg className="ck-steps__ring" viewBox="0 0 36 36" aria-hidden="true">
                <circle className="ck-steps__track" cx="18" cy="18" r="16" />
                <circle className="ck-steps__fill" cx="18" cy="18" r="16" pathLength="100" />
              </svg>
              {state === 'done' ? (
                <svg className="ck-steps__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <span className="ck-steps__num">{index + 1}</span>
              )}
            </span>
            <span className="ck-steps__label">{label}</span>
            {index < steps.length - 1 ? (
              <span className="ck-steps__line" aria-hidden="true">
                <span />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
