/**
 * Sponsors shown in the ring on /sponsor. Add a sponsor after their payment is
 * verified: put their logo in /public/sponsors and list them here.
 */
export type Sponsor = { name: string; logo: string; url?: string };

export const SPONSORS: Sponsor[] = [];
