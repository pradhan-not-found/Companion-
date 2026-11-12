/** Cookie consent, kept in a first-party cookie for a year. */
export const CONSENT_COOKIE = 'cmp_consent';

export type Consent = 'yes' | 'no' | null;

export function readConsent(): Consent {
  const raw = document.cookie.split('; ').find(part => part.startsWith(`${CONSENT_COOKIE}=`));
  const value = raw?.slice(CONSENT_COOKIE.length + 1);
  return value === 'yes' || value === 'no' ? value : null;
}

export function writeConsent(value: 'yes' | 'no') {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${365 * 86400}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent('cmp-consent', { detail: value }));
}
