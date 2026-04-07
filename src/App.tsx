import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import ResonanceVortex from "./components/ResonanceVortex";
import PostEffects from "./components/PostEffects";
import MinimalUI from "./components/UI/MinimalUI";
import FaceTracker from "./components/FaceTracker";
import "./App.css";

interface HeadRotation {
  yaw: number;
  pitch: number;
  roll: number;
}

function App() {
  const [headRotation, setHeadRotation] = useState<HeadRotation>({ yaw: 0, pitch: 0, roll: 0 });
  const [alignmentProgress, setAlignmentProgress] = useState(0);
  const [isFormed, setIsFormed] = useState(false);
  const faceTrackerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (faceTrackerRef.current) faceTrackerRef.current.stop();
    };
  }, []);

  return (
    <div className="app-container">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
        style={{ background: "#020408" }}
      >
        {/* Subtle fill lights — curves use LineBasicMaterial so these are accent only */}
        {/* @ts-ignore */}
        <ambientLight intensity={0.2} />
        {/* @ts-ignore */}
        <pointLight position={[0, 0, 4]} intensity={0.5} color="#D4AF37" />

        <ResonanceVortex
          alignmentProgress={alignmentProgress}
          isFormed={isFormed}
          onFormed={setIsFormed}
        />

        <PostEffects alignmentProgress={alignmentProgress} isFormed={isFormed} />

        <Preload all />
      </Canvas>

      <MinimalUI
        alignmentProgress={alignmentProgress}
        isFormed={isFormed}
        headRotation={headRotation}
      />

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
