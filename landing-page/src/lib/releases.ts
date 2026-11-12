/** Release notes shown on the changelog. Newest first. */
export type Release = {
  image: string;
  imageAlt: string;
  platform: "windows" | "mac";
  version: string;
  date: string;
  title: string;
  summary: string;
  latest?: boolean;
  sections: { heading: "What's new" | 'Improved' | 'Fixed'; items: { name: string; detail: string }[] }[];
};

export const RELEASES: Release[] = [
  {
    version: 'v1.1.0',
    platform: 'windows',
    image: '/changelog/v1.1.0.webp',
    imageAlt: 'Companion pets working on their laptops',
    date: '2026-11-11',
    title: 'Accounts, Compboard and a smarter focus mode',
    summary:
      'The biggest update yet. Companion now knows who you are, keeps your clipboard close, guards your focus sessions and lets your pet deliver every message.',
    latest: true,
    sections: [
      {
        heading: "What's new",
        items: [
          { name: 'Accounts', detail: 'Create an account, sign in and sign out. Your companion, name and progress stay with you.' },
          { name: 'Onboarding', detail: 'Pick your first companion and give it a name the first time you open the app.' },
          { name: 'Profile', detail: 'Edit your name and choose a pet avatar or upload your own photo.' },
          { name: 'Compboard', detail: 'Click your pet to open quick actions and your recent clipboard history, right beside it.' },
          { name: 'Focus mode', detail: 'Distracting tabs and games close automatically during a focus session. Add your own sites.' },
          { name: 'Coding agent alerts', detail: 'Your pet pokes you when Claude Code or Codex needs your input.' },
          { name: 'Pet check-ins', detail: 'If you have been away for a while, your companion says hello when you return.' },
          { name: 'Updates page', detail: 'See your version and install new releases from inside the app.' }
        ]
      },
      {
        heading: 'Improved',
        items: [
          { name: 'Notifications', detail: 'Reminders now arrive as speech bubbles from your pet instead of system toasts.' },
          { name: 'Movement', detail: 'Smoother walking and turning, including during focus sessions.' },
          { name: 'Dashboard', detail: 'A redesigned dashboard with trend charts, a full-width activity heatmap and a realistic water glass.' },
          { name: 'Launch at login', detail: 'Companion can start with Windows and greet you when it opens.' }
        ]
      },
      {
        heading: 'Fixed',
        items: [
          { name: 'Scaled displays', detail: 'The pet window no longer grows on displays set above 100% scaling.' },
          { name: 'Click-through', detail: 'Only your pet is clickable, so the rest of your screen works normally around it.' }
        ]
      }
    ]
  },
  {
    version: 'v1.0.1',
    platform: 'windows',
    image: '/changelog/v1.0.1.webp',
    imageAlt: 'The first Companion pets on colourful tiles',
    date: '2026-10-02',
    title: 'Companion beta',
    summary: 'Where it all started: a pixel pet that lives on your desktop and keeps you company while you work.',
    sections: [
      {
        heading: "What's new",
        items: [
          { name: 'Desktop pets', detail: 'Animated pixel companions that roam your screen while you work.' },
          { name: 'Hydration reminders', detail: 'Set a daily water goal and get gentle reminders through the day.' },
          { name: 'Break reminders', detail: 'Regular nudges to stand up, stretch and rest your eyes.' },
          { name: 'Transparent overlay', detail: 'Built for Windows to blend into your workspace without getting in the way.' }
        ]
      }
    ]
  }
];
