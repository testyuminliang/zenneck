import { useEffect, useRef } from 'react';
import './UI.css';

interface CenterFocusProps {
  alignmentProgress: number;
}

const CenterFocus = ({ alignmentProgress }: CenterFocusProps) => {
  const crosshairRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (crosshairRef.current) {
      const opacity = Math.min(0.3 + alignmentProgress * 0.7, 1);
      const scale = 1 + alignmentProgress * 0.2;
      crosshairRef.current.style.opacity = String(opacity);
      crosshairRef.current.style.transform = `scale(${scale})`;
    }
  }, [alignmentProgress]);

  return (
    <div className="center-focus" ref={crosshairRef}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
        {/* Outer circle */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="#FFD700" strokeWidth="1" opacity="0.6" />
        
        {/* Inner circle */}
        <circle cx="50" cy="50" r="35" fill="none" stroke="#FFD700" strokeWidth="0.8" opacity="0.4" />
        
        {/* Crosshair lines */}
        <line x1="50" y1="20" x2="50" y2="30" stroke="#FFD700" strokeWidth="1.5" />
        <line x1="50" y1="70" x2="50" y2="80" stroke="#FFD700" strokeWidth="1.5" />
        <line x1="20" y1="50" x2="30" y2="50" stroke="#FFD700" strokeWidth="1.5" />
        <line x1="70" y1="50" x2="80" y2="50" stroke="#FFD700" strokeWidth="1.5" />
        
        {/* Center dot */}
        <circle cx="50" cy="50" r="3" fill="#FFD700" />
        
        {/* Alignment indicator arcs */}
        <circle cx="50" cy="50" r="25" fill="none" stroke="#FFD700" strokeWidth="0.5" opacity="0.3" strokeDasharray="5,5" />
      </svg>
    </div>
  );
};

export default CenterFocus;
