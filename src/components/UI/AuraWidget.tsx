import { useEffect, useRef } from 'react';
import './UI.css';

interface AuraWidgetProps {
  alignmentProgress: number;
  isFormed: boolean;
}

const AuraWidget = ({ alignmentProgress, isFormed }: AuraWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const rotationRef = useRef(0);

  useEffect(() => {
    const animate = () => {
      rotationRef.current += 0.3; // Slow rotation
      
      if (sphereRef.current) {
        const hue = isFormed ? 360 : 40; // Gold or dynamic based on state
        const saturation = 70 + alignmentProgress * 30;
        const lightness = 50 - alignmentProgress * 15;
        
        sphereRef.current.style.background = `
          conic-gradient(
            from ${rotationRef.current}deg,
            hsl(${hue}, ${saturation}%, ${lightness}%),
            hsl(${hue + 60}, ${saturation}%, ${lightness + 10}%),
            hsl(${hue + 120}, ${saturation}%, ${lightness}%),
            hsl(${hue}, ${saturation}%, ${lightness}%)
          )
        `;
        sphereRef.current.style.opacity = String(0.6 + alignmentProgress * 0.4);
      }

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [alignmentProgress, isFormed]);

  return (
    <div className="aura-widget" ref={containerRef}>
      <div className="aura-sphere" ref={sphereRef} />
      <div className="aura-glow" />
    </div>
  );
};

export default AuraWidget;
