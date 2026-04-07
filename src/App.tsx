import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import ParticleSystem from './components/ParticleSystem';
import PostProcessing from './components/PostProcessing';
import CenterFocus from './components/UI/CenterFocus';
import AuraWidget from './components/UI/AuraWidget';
import FloatingPhotos from './components/FloatingPhotos';
import FaceTracker from './components/FaceTracker';
import './App.css';

interface HeadRotation {
  yaw: number;
  pitch: number;
  roll: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [headRotation, setHeadRotation] = useState<HeadRotation>({ yaw: 0, pitch: 0, roll: 0 });
  const [alignmentProgress, setAlignmentProgress] = useState(0);
  const [isFormed, setIsFormed] = useState(false);
  
  // FaceTracker will update headRotation and alignment progress
  const faceTrackerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (faceTrackerRef.current) {
        faceTrackerRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="app-container">
      <Canvas
        ref={canvasRef}
        camera={{
          position: [0, 0, 8],
          fov: 70,
          aspect: window.innerWidth / window.innerHeight,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        dpr={window.devicePixelRatio}
        style={{ width: '100%', height: '100vh' }}
      >
        {/* Lighting */}
        {/* @ts-ignore */}
        <ambientLight intensity={0.4} />
        {/* @ts-ignore */}
        <pointLight position={[10, 10, 10]} intensity={0.6} />

        {/* Main Scene Components */}
        <ParticleSystem
          headRotation={headRotation}
          alignmentProgress={alignmentProgress}
          isFormed={isFormed}
          setIsFormed={setIsFormed}
        />
        
        <FloatingPhotos />

        {/* Post-processing effects */}
        <PostProcessing alignmentProgress={alignmentProgress} isFormed={isFormed} />

        <Preload all />
      </Canvas>

      {/* HUD Components */}
      <CenterFocus alignmentProgress={alignmentProgress} />
      <AuraWidget alignmentProgress={alignmentProgress} isFormed={isFormed} />

      {/* Face Tracking */}
      <FaceTracker
        ref={faceTrackerRef}
        onHeadRotationChange={setHeadRotation}
        onAlignmentProgressChange={setAlignmentProgress}
        onFormedChange={setIsFormed}
      />
    </div>
  );
}

export default App;
