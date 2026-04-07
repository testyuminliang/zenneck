import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import ResonanceVortex from "./components/ResonanceVortex";
import MinimalUI from "./components/UI/MinimalUI";
import FaceTracker from "./components/FaceTracker";
import { useSequence } from "./hooks/useSequence";
import type { HeadRotation } from "./types";
import "./App.css";

function App() {
  const [headRotation, setHeadRotation] = useState<HeadRotation>({ yaw: 0, pitch: 0, roll: 0 });
  const faceTrackerRef = useRef<any>(null);

  const { stepIndex, activeStep, phase, holdProgress, resonanceProgress, totalSteps } =
    useSequence(headRotation);

  const alignmentProgress = phase === "hold" ? holdProgress : phase === "resonance" ? 1 : 0;
  const isFormed = phase === "resonance";

  useEffect(() => {
    return () => {
      if (faceTrackerRef.current) faceTrackerRef.current.stop();
    };
  }, []);

  return (
    <div className="app-container">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        dpr={[1, 2]}
        style={{ background: "#f5ede4" }}
      >
        {/* @ts-ignore */}
        <color attach="background" args={["#f5ede4"]} />
        {/* @ts-ignore */}
        <ambientLight intensity={0.2} />
        {/* @ts-ignore */}
        <pointLight position={[0, 0, 4]} intensity={0.5} color="#C4785C" />

        <ResonanceVortex
          alignmentProgress={alignmentProgress}
          isFormed={isFormed}
          onFormed={() => {}}
          headRotation={headRotation}
        />

        <Preload all />
      </Canvas>

      <MinimalUI
        activeStep={activeStep}
        phase={phase}
        holdProgress={holdProgress}
        resonanceProgress={resonanceProgress}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        headRotation={headRotation}
      />

      <FaceTracker
        ref={faceTrackerRef}
        onHeadRotationChange={setHeadRotation}
      />
    </div>
  );
}

export default App;
