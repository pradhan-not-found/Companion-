import { useState, useEffect, useRef, useCallback } from 'react';
import Onboarding from './components/Onboarding.tsx';
import Dashboard from './components/Dashboard.tsx';
import PetMode from './components/PetMode.tsx';

const ANIMS = {
  sleep:     { s: 1, y: 0,     f: 4 }, // Row 1
  wake:      { s: 1, y: -100,  f: 4 }, // Row 2
  idle:      { s: 1, y: -200,  f: 4 }, // Row 3
  bounce:    { s: 1, y: -300,  f: 4 }, // Row 4
  
  happy:     { s: 2, y: 0,     f: 4 }, // Sheet 2, Row 1
  celebrate: { s: 2, y: -100,  f: 4 }, // Sheet 2, Row 2
  sad:       { s: 2, y: -200,  f: 3 }, // Sheet 2, Row 3
} as const;

type AnimName = keyof typeof ANIMS;

const WANDER_MS     = 6000;
const IDLE_SLEEP_MS = 60_000;

const eAPI = () => (window as any).electronAPI as {
  walkStart:               (dx: number) => void;
  walkStop:                () => void;
  closeWindow:             () => void;
  setWindowSize:           (w: number, h: number) => void;
  onDirectionChange:       (cb: (dx: number) => void) => void;
  removeDirectionListener: () => void;
  getStore:                () => Promise<any>;
  setStore:                (key: string, value: any) => void;
  resetStore:              () => Promise<void>;
} | undefined;

export default function App() {
  const [userName,     setUserName]     = useState<string>('');
  const [activePet,    setActivePet]    = useState<string>('default');
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [storeLoaded,  setStoreLoaded]  = useState<boolean>(false);
  const [showDashboard,setShowDashboard]= useState(false);
  const [isBreakMode,  setIsBreakMode]  = useState(false);
  const [sips,         setSips]         = useState(0);

  useEffect(() => {
    eAPI()?.getStore().then((store: any) => {
      if (store.userName) {
        setUserName(store.userName);
        setActivePet(store.activePet || 'default');
        setHasOnboarded(true);
      }
      setStoreLoaded(true);
    });
  }, []);
  const [message,      setMessage]      = useState('');
  const [isReacting,   setIsReacting]   = useState(false);
  const [isSleeping,   setIsSleeping]   = useState(false);

  const [anim,        setAnim]        = useState<AnimName>('idle');
  const [frame,       setFrame]       = useState(0);
  const [facingRight, setFacingRight] = useState(false); // natively faces left

  const isSleepingRef   = useRef(false);
  const isReactingRef   = useRef(false);
  const showDashRef     = useRef(false);
  const animIntervalRef = useRef<number | null>(null);
  const wanderRef       = useRef<number | null>(null);
  const idleRef         = useRef<number | null>(null);

  useEffect(() => { isSleepingRef.current = isSleeping; }, [isSleeping]);
  useEffect(() => { isReactingRef.current = isReacting; }, [isReacting]);
  useEffect(() => { showDashRef.current   = showDashboard;}, [showDashboard]);

  const play = useCallback((name: AnimName, speed = 250) => {
    if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    setAnim(name);
    setFrame(0);
    const petId = localStorage.getItem('meowdration_pet');
    const isPetdex = petId && petId !== 'default';
    
    let f: number = ANIMS[name].f;
    if (isPetdex) {
      if (name === 'idle') f = 6;
      else if (name === 'bounce') f = 5;
      else if (name === 'happy') f = 4;
      else if (name === 'sad' || name === 'celebrate') f = 8;
      else if (name === 'sleep' || name === 'wake') f = 6;
    }
    
    animIntervalRef.current = window.setInterval(() => {
      setFrame(prev => (prev + 1) % f);
    }, speed);
  }, []);

  const decideFn = useRef<(name: string) => void>(() => {});
  decideFn.current = (name: string) => {
    if (isSleepingRef.current || isReactingRef.current || showDashRef.current) return;
    
    const r = Math.random();
    if (r < 0.40) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      setFacingRight(dir > 0);
      play('bounce', 160);
      setMessage('Just exploring… 🐾');
      
      // Stop bouncing after a few seconds and be happy
      setTimeout(() => {
        if (!isSleepingRef.current && !isReactingRef.current && !showDashRef.current) {
          play('happy', 180);
          setTimeout(() => {
            if (!isSleepingRef.current && !isReactingRef.current && !showDashRef.current) {
              play('idle', 220);
            }
          }, 1500);
        }
      }, 4000);

    } else if (r < 0.70) {
      play('idle', 220);
      setMessage(`Hi ${name}! Stay hydrated! 💧`);
    } else {
      play('happy', 180);
      setMessage('Meow~ 🐱');
      setTimeout(() => {
        if (!isSleepingRef.current && !isReactingRef.current && !showDashRef.current) {
          play('idle', 220);
        }
      }, 1500);
    }
  };

  const goSleep = useCallback(() => {
    eAPI()?.walkStop();
    play('sleep', 500); 
    setMessage('Zzz… nobody pet me 😴');
    isSleepingRef.current = true;
    setIsSleeping(true);
  }, [play]);

  const wakeUp = useCallback(() => {
    isSleepingRef.current = false;
    setIsSleeping(false);
    play('wake', 280);
    setMessage("Oh, you're back! 👋");
    
    setTimeout(() => {
      if (!isSleepingRef.current && !isReactingRef.current) {
        play('idle', 220);
      }
    }, 1120);
  }, [play]);

  const resetInactivity = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current);
    if (isSleepingRef.current) wakeUp();
    idleRef.current = window.setTimeout(goSleep, IDLE_SLEEP_MS);
  }, [wakeUp, goSleep]);

  useEffect(() => {
    eAPI()?.onDirectionChange(dx => setFacingRight(dx > 0));
    return () => eAPI()?.removeDirectionListener();
  }, []);

  // Break mode: trigger once when sips reach goal (useEffect not render body)
  useEffect(() => {
    if (sips >= 8 && !isBreakMode) {
      setIsBreakMode(true);
    }
  }, [sips, isBreakMode]);

  useEffect(() => {
    if (!hasOnboarded) {
      eAPI()?.setWindowSize(800, 700);
      return;
    }
    if (showDashboard || isBreakMode) {
      eAPI()?.setWindowSize(340, 560);
    } else {
      eAPI()?.setWindowSize(200, 180);
    }
  }, [showDashboard, isBreakMode, hasOnboarded]);

  useEffect(() => {
    if (!hasOnboarded) return;
    play('idle', 220);
    idleRef.current = window.setTimeout(goSleep, IDLE_SLEEP_MS);
    return () => { if (idleRef.current) clearTimeout(idleRef.current); };
  }, [hasOnboarded, play, goSleep]);

  useEffect(() => {
    if (!hasOnboarded || isReacting || showDashboard || isSleeping) {
      eAPI()?.walkStop();
      if (wanderRef.current) clearInterval(wanderRef.current);
      if (showDashboard && anim === 'bounce') {
        play('idle', 220);
      }
      return;
    }
    const name = userName;
    wanderRef.current = window.setInterval(() => decideFn.current(name), WANDER_MS);
    return () => {
      eAPI()?.walkStop();
      if (wanderRef.current) clearInterval(wanderRef.current);
    };
  }, [hasOnboarded, isReacting, showDashboard, isSleeping, userName]);

  const handleStart = (name: string, petId: string) => {
    setUserName(name);
    setActivePet(petId);
    eAPI()?.setStore('userName', name);
    eAPI()?.setStore('activePet', petId);
    setHasOnboarded(true);
  };

  const handleCatClick = () => {
    resetInactivity();
    setShowDashboard(prev => !prev);
    
    if (!isReactingRef.current) {
      isReactingRef.current = true;
      play('bounce', 150);
      setTimeout(() => {
        isReactingRef.current = false;
        if (!isSleepingRef.current) {
          play('idle', 220);
        }
      }, 1000);
    }
  };

  const handleDrink = () => {
    resetInactivity();
    setSips(s => s + 1);
    setMessage("You're crushing it today! 💧");
    
    isReactingRef.current = true;
    setIsReacting(true);
    play('celebrate', 180);

    // Keep dashboard open to show spin
    setTimeout(() => {
        setShowDashboard(false);
        setTimeout(() => {
            play('happy', 240);
            setTimeout(() => {
                play('idle', 240);
                isReactingRef.current = false; 
                setIsReacting(false); 
            }, 1200);
        }, 600);
    }, 1200); 
  };

  const handleRemind = () => {
    resetInactivity();
    setMessage("I'll let it slide… this time 😒");
    
    isReactingRef.current = true;
    setIsReacting(true);
    play('sad', 350); 
    
    setTimeout(() => {
        setShowDashboard(false);
        setTimeout(() => {
            play('idle', 240);
            isReactingRef.current = false; 
            setIsReacting(false); 
        }, 900);
    }, 1200);
  };

  const closeWindow = () => {
    const a = eAPI();
    if (a?.closeWindow) a.closeWindow(); else window.close();
  };

  if (!storeLoaded) return null;
  if (!hasOnboarded) return <Onboarding onComplete={handleStart} onClose={closeWindow} />;

  const cfg = ANIMS[anim];
  let bgImage;
  let bgPos;
  let bgSize;
  let nativeWidth;
  let nativeHeight;
  let scale = 1;
  const isPetdex = activePet !== 'default';

  if (isPetdex) {
    bgImage = `url('pet://${activePet}/auto')`;
    bgSize = '1536px 1872px'; // PetDex sheets are 1536x1872
    nativeWidth = 192;
    nativeHeight = 208;
    scale = 0.6; // scale down slightly for desktop
    
    // Map Meowdration states to PetDex rows
    let row = 0;
    if (anim === 'sleep' || anim === 'wake') row = 6; // waiting
    else if (anim === 'idle') row = 0; // idle
    else if (anim === 'bounce') row = 4; // jumping
    else if (anim === 'happy') row = 3; // waving
    else if (anim === 'sad') row = 5; // failed
    else if (anim === 'celebrate') row = 3; // waving
    
    // Use exact pixels for positioning PetDex dynamically!
    bgPos = `${-(frame % 6) * 192}px ${-row * 208}px`;

  } else {
    bgImage = cfg.s === 1 ? "url('./spritsheet1.png')" : "url('./spritesheet2.png')";
    bgSize = '600px 400px';
    nativeWidth = 150;
    nativeHeight = 100;
    scale = 1;
    bgPos = `${-(frame % 4) * 150}px ${-Math.abs(cfg.y)}px`;
  }
  
  const flipX   = facingRight ? -1 : 1;

  return (
    <>
      {isBreakMode && (
        <div className="break-overlay">
          <h1 className="break-title">Time for a Break!</h1>
          <div className="break-timer">05:00</div>
          <p className="break-desc">You've reached your hydration goal for this session. Step away from the screen and rest your eyes.</p>
          <button className="dash-btn dash-ghost" onClick={() => { setIsBreakMode(false); setSips(0); }} style={{marginTop: 32}}>Skip Break (Not recommended)</button>
        </div>
      )}
      <PetMode 
        bgImage={bgImage} 
        bgPos={bgPos} 
        bgSize={bgSize} 
        nativeWidth={nativeWidth}
        nativeHeight={nativeHeight}
        scale={scale}
        flipX={flipX} 
        onClick={handleCatClick} 
      />
      {showDashboard && (
        <Dashboard
          userName={userName}
          sips={sips}
          message={message}
          isSleeping={isSleeping}
          onDrink={handleDrink}
          onRemind={handleRemind}
          onClose={() => setShowDashboard(false)}
          onCloseApp={closeWindow}
        />
      )}
    </>
  );
}
