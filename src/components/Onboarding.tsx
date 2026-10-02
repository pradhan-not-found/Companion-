import { useState, useEffect, useRef } from 'react';

const eAPI = () => (window as any).electronAPI as {
  closeWindow: () => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  getPets: () => Promise<any[]>;
  setWindowSize: (w: number, h: number) => void;
} | undefined;

interface OnboardingProps {
  onComplete: (name: string, petId: string) => void;
  onClose: () => void;
}

export default function Onboarding({ onComplete, onClose }: OnboardingProps) {
  const [value, setValue] = useState('');
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<string>('default');
  const [frame, setFrame] = useState(0);
  const trimmed = value.trim();

  useEffect(() => {
    // Expand window to fit the grid
    eAPI()?.setWindowSize(700, 700);

    eAPI()?.getPets().then(res => {
      if (res && res.length > 0) {
        setPets(res);
        setSelectedPet(res[0].id);
      }
    });

    const interval = setInterval(() => {
      setFrame(f => f + 1);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const submit = () => {
    onComplete(trimmed || "Guest", selectedPet);
  };

  const handleMinimize = () => {
    eAPI()?.minimizeWindow();
  };

  const renderPetPreview = (petId: string) => {
    let nativeWidth;
    let nativeHeight;
    let scale;
    let row = 0;
    let gridCols;
    let gridRows;
    let bgImage;

    if (petId !== 'default') {
      bgImage = `url('pet://${petId}/auto')`;
      nativeWidth = 192;
      nativeHeight = 208;
      scale = 0.35; 
      row = 0; 
      gridCols = 8;
      gridRows = 9;
    } else {
      bgImage = "url('./spritsheet1.png')";
      nativeWidth = 150;
      nativeHeight = 100;
      scale = 0.6;
      row = 2; // idle row in spritsheet1
      gridCols = 4;
      gridRows = 4;
    }

    // Force exact integer pixel dimensions to prevent browser subpixel rendering artifacts
    const displayW = Math.round(nativeWidth * scale);
    const displayH = Math.round(nativeHeight * scale);
    const finalBgW = displayW * gridCols;
    const finalBgH = displayH * gridRows;
    
    const framesPerRow = petId === 'default' ? 4 : 6;
    const bgPosX = -(frame % framesPerRow) * displayW;
    const bgPosY = -row * displayH;
    
    // On the desktop, PetDex pets are rendered in a 180px high window, which physically 
    // crops the bottom 28px of their 208px frame (where the next row's head bleeds in).
    // We perfectly replicate that desktop crop here by reducing the mask height!
    const cropBottom = petId === 'default' ? 0 : 28; 
    const maskH = Math.round((nativeHeight - cropBottom) * scale);

    return (
      <div style={{
        height: '75px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: `${displayW}px`,
          height: `${maskH}px`,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}>
          <div 
            style={{
              width: `${displayW}px`,
              height: `${displayH}px`,
              backgroundImage: bgImage,
              backgroundPosition: `${bgPosX}px ${bgPosY}px`,
              backgroundSize: `${finalBgW}px ${finalBgH}px`,
              backgroundRepeat: 'no-repeat',
              imageRendering: 'pixelated'
            }}
          />
        </div>
      </div>
    );
  };

  const handleMaximize = () => {
    eAPI()?.maximizeWindow();
  };

  return (
    <div className="onboarding-overlay" style={{ overflow: 'hidden', alignItems: 'center' }}>
      <div className="title-bar">
        <button className="title-btn" onClick={handleMinimize} title="Minimize">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12"></line></svg>
        </button>
        <button className="title-btn" onClick={handleMaximize} title="Maximize">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
        </button>
        <button className="title-btn close" onClick={onClose} title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div style={{ flex: 1, width: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px 40px' }}>
        <div className="onboarding-content" style={{width: '100%', maxWidth: '600px'}}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <img src="./applogo.png" style={{ width: '84px', height: '84px', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} alt="Companion Logo" />
          </div>
          <h1 className="onboarding-title">Welcome to Companion</h1>
          <p className="onboarding-subtitle">
            Choose a name and a companion to personalize your workspace.
          </p>

        <div className="onboarding-input-row" style={{marginBottom: '32px', WebkitAppRegion: 'no-drag'} as any}>
          <input
            type="text"
            placeholder="What should we call you?"
            autoComplete="off"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="onboarding-input"
          />
        </div>

        <div style={{ width: '100%', WebkitAppRegion: 'no-drag' } as any}>
          <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', marginBottom: '16px', textAlign: 'left' }}>
            Choose your companion
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '32px'
          }}>
            <div
              onClick={() => setSelectedPet('default')}
              style={{
                background: selectedPet === 'default' ? 'var(--water-light)' : 'var(--surface)',
                border: selectedPet === 'default' ? '2px solid var(--water)' : '1px solid var(--border)',
                borderRadius: '4px',
                padding: '16px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              {renderPetPreview('default')}
              <p style={{fontSize: '13px', fontWeight: 500, marginTop: '8px'}}>Standard Cat</p>
            </div>

            {pets.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPet(p.id)}
                style={{
                  background: selectedPet === p.id ? 'var(--water-light)' : 'var(--surface)',
                  border: selectedPet === p.id ? '2px solid var(--water)' : '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {renderPetPreview(p.id)}
                <p style={{fontSize: '13px', fontWeight: 500, marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                  {p.displayName}
                </p>
              </div>
            ))}
          </div>
        </div>

        <button
          className="onboarding-continue-btn"
          style={{ width: '100%', borderRadius: '4px', justifyContent: 'center', WebkitAppRegion: 'no-drag' } as any}
          onClick={submit}
          title="Continue"
        >
          Let's Go
          <svg viewBox="0 0 24 24" fill="none" style={{marginLeft: '8px'}}
            width="17" height="17"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/>
            <path d="M13 6l6 6-6 6"/>
          </svg>
        </button>
      </div>
      </div>
    </div>
  );
}
