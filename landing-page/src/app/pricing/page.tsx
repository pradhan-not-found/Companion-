'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    badge: 'Current',
    badgeColor: '#2E2E2D',
    description: 'Everything you need to get started.',
    features: [
      'All companion pets',
      'Idle & animated sprites',
      'Transparent overlay',
      'Hydration reminders',
      'Light & dark mode',
    ],
    cta: 'Join Beta Waitlist',
    href: '/get-beta',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '$5',
    period: 'per month',
    badge: 'Coming Soon',
    badgeColor: '#6E6D6A',
    description: 'More companions, more customization.',
    features: [
      'Everything in Free',
      'Exclusive premium pets',
      'Custom pet skins',
      'Advanced reminders',
      'Priority support',
    ],
    cta: 'Notify Me',
    href: '/#waitlist',
    highlight: false,
  },
  {
    name: 'Team',
    price: '$12',
    period: 'per seat / mo',
    badge: 'Coming Soon',
    badgeColor: '#6E6D6A',
    description: 'Keep your whole team motivated.',
    features: [
      'Everything in Pro',
      'Shared pet library',
      'Team sync & stats',
      'Admin dashboard',
      'Dedicated support',
    ],
    cta: 'Get Notified',
    href: '/#waitlist',
    highlight: false,
  },
];

export default function PricingPage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') setIsDark(true);
  }, []);

  const toggleDark = () => {
    setIsDark(v => { localStorage.setItem('theme', !v ? 'dark' : 'light'); return !v; });
  };

  const bg = isDark ? '#111111' : '#FAF9F6';
  const title = isDark ? '#FFFFFF' : '#2E2E2D';
  const sub = isDark ? '#A0A0A0' : '#6E6D6A';
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const dimBg = isDark ? '#161616' : '#F7F6F3';
  const checkColor = isDark ? '#A0A0A0' : '#2E2E2D';

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: bg, color: title }}>
      <NavBar isDark={isDark} onToggleDark={toggleDark} />

      <main className="flex-1 flex flex-col items-center px-6 py-16">
        <div className="text-center mb-12 max-w-lg">
          <h1 className="text-[32px] lg:text-[38px] font-semibold tracking-[-0.03em] leading-tight" style={{ color: title }}>
            Simple, honest pricing.
          </h1>
          <p className="text-[15px] mt-3 leading-[1.7]" style={{ color: sub }}>
            Companion is free during beta. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className="relative flex flex-col rounded-[16px] p-6 transition-all duration-200"
              style={{
                background: plan.highlight ? cardBg : dimBg,
                border: `1px solid ${plan.highlight ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)') : cardBorder}`,
                boxShadow: plan.highlight ? (isDark ? '0 12px 40px rgba(0,0,0,0.3)' : '0 12px 40px rgba(0,0,0,0.07)') : 'none',
              }}
            >
              {/* Badge */}
              <span
                className="self-start text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full mb-4"
                style={{
                  background: plan.highlight ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                  color: plan.highlight ? title : sub,
                }}
              >
                {plan.badge}
              </span>

              <h2 className="text-[15px] font-semibold mb-1" style={{ color: title }}>{plan.name}</h2>
              <p className="text-[13px] mb-4" style={{ color: sub }}>{plan.description}</p>

              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-[34px] font-bold tracking-[-0.03em]" style={{ color: title }}>{plan.price}</span>
                <span className="text-[12px]" style={{ color: sub }}>{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px]" style={{ color: sub }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={checkColor} className="w-3.5 h-3.5 shrink-0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={plan.href}
                className="flex items-center justify-center gap-1.5 h-10 rounded-[8px] text-[13px] font-medium no-underline transition-all duration-150 hover:-translate-y-[1px]"
                style={{
                  background: plan.highlight ? (isDark ? '#EDEDEC' : '#2E2E2D') : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
                  color: plan.highlight ? (isDark ? '#111' : '#FFF') : sub,
                  border: plan.highlight ? 'none' : `1px solid ${cardBorder}`,
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
