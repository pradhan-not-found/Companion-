interface PetCardProps {
  userName: string;
  sips: number;
  message: string;
  bgImage: string;
  bgSize: string;
  bgPos: string;
  scaleX: number;
  onDrink: () => void;
  onRemind: () => void;
  onClose: () => void;
}

export default function PetCard({ userName, sips, message, bgImage, bgSize, bgPos, scaleX, onDrink, onRemind, onClose }: PetCardProps) {
  return (
    <div id="app">
      <button className="btn-close" onClick={onClose}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
      
      <div id="main-view" className="view-container">
        <div className="card pet-card">
          <div className="cat-container">
            <div 
              id="cat-sprite" 
              style={{
                backgroundImage: bgImage,
                backgroundSize: bgSize,
                backgroundPosition: bgPos,
                transform: `scaleX(${scaleX})`,
                transformOrigin: 'center'
              }}
            ></div>
          </div>
          <div className="message-box">
            <p id="main-message">{message}</p>
          </div>
          <div className="stats-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></svg>
            <span>{sips}</span> points
          </div>
          <div className="actions">
            <button className="btn primary-btn" onClick={onDrink}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>
              I drank water!
            </button>
            <button className="btn secondary-btn" onClick={onRemind}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Remind me later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
