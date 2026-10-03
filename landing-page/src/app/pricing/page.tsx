'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';

const PLANS = [
  {
    name: 'free',
    isBold: false,
    subtitle: 'everything you need to start.',
    highlight: 'best for trying it out',
    price: '$0',
    subPrice: 'free forever, no card needed',
    buttonText: 'start free',
    buttonType: 'silver',
    features: [
      '1 default companion pet',
      'basic hydration reminders',
      'transparent window overlay'
    ]
  },
  {
    name: 'pro',
    isBold: false,
    subtitle: 'more companions, more customization.',
    highlight: 'best for everyday use',
    price: '$5',
    subPrice: 'per month, billed monthly',
    buttonText: 'get pro',
    buttonType: 'blue',
    features: [
      'all pets (cats, dogs, foxes)',
      'custom pet skins & outfits',
      'priority email support'
    ]
  },
  {
    name: 'max',
    isBold: true,
    subtitle: 'keep your whole team motivated.',
    highlight: 'best for power users',
    price: '$12',
    subPrice: 'per seat / month, billed monthly',
    buttonText: 'get max',
    buttonType: 'silver',
    features: [
      'everything in pro',
      'team sync & admin dashboard',
      'dedicated account manager'
    ]
  }
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

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: bg, color: title }}>
      <NavBar isDark={isDark} onToggleDark={toggleDark} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {PLANS.map((plan, idx) => (
            <div
              key={plan.name}
              className="relative flex flex-col p-8 md:p-10 transition-all duration-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] rounded-xl border border-black/5"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
              {/* Header */}
              <div className="text-center px-2">
                <h2 className={`text-[26px] mb-3 text-black tracking-tight ${plan.isBold ? 'font-bold' : 'font-medium'}`}>{plan.name}</h2>
                <p className="text-[15px] text-gray-800 mb-2 leading-snug">{plan.subtitle}</p>
                <p className="text-[11px] text-gray-400">{plan.highlight}</p>
              </div>

              <div className="w-full border-t border-dotted border-gray-300 my-7" />

              {/* Price */}
              <div className="text-center">
                <div className="text-[64px] font-medium text-black leading-none mb-4 tracking-tighter">{plan.price}</div>
                <p className="text-[12px] text-gray-800 mb-6">{plan.subPrice}</p>
                
                {/* Gel Button */}
                <div className="flex justify-center">
                  <button
                    className="relative w-[130px] h-[34px] rounded-full flex items-center justify-center group overflow-hidden transition-transform active:scale-95 cursor-pointer"
                    style={{
                      background: plan.buttonType === 'blue' 
                        ? 'linear-gradient(to bottom, #e3ecff 0%, #b8cfff 45%, #a3c2ff 50%, #d4e3ff 100%)'
                        : 'linear-gradient(to bottom, #ffffff 0%, #f4f4f4 45%, #eaeaea 50%, #fdfdfd 100%)',
                      border: plan.buttonType === 'blue' ? '1px solid #7592fb' : '1px solid #c2c2c2',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                    }}
                  >
                    <div 
                      className="absolute top-[1px] left-[2px] right-[2px] h-[45%] rounded-t-full pointer-events-none"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)'
                      }}
                    />
                    <span 
                      className="relative z-10 text-black font-sans text-[14px] font-medium tracking-tight mt-[1px]"
                    >
                      {plan.buttonText}
                    </span>
                  </button>
                </div>
              </div>

              <div className="w-full border-t border-dotted border-gray-300 my-8" />

              {/* Features */}
              <div className="flex-1 flex flex-col text-left">
                <p className="text-[14px] text-gray-500 mb-4">includes</p>
                <ul className="flex flex-col gap-3.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-[14px] text-black font-medium">
                      <div className="w-[18px] h-[18px] rounded-full bg-black flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-3 h-3" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
