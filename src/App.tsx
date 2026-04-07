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
  const [guidedMode, setGuidedMode] = useState(false);
  const faceTrackerRef = useRef<any>(null);

  const { stepIndex, activeStep, phase, holdProgress, resonanceProgress, totalSteps } =
    useSequence(headRotation);

  // In guided mode: curves react to proximity before hold, then hold progress
  // In free mode: curves react to total head deviation
  const alignmentProgress = (() => {
    if (!guidedMode) {
      const mag = Math.sqrt(headRotation.yaw ** 2 + headRotation.pitch ** 2 + headRotation.roll ** 2);
      return Math.min(1, mag / 35);
    }
    if (phase === "resonance") return 1;
    if (phase === "hold") return 0.3 + holdProgress * 0.7;
    // guide phase: proximity to target drives 0–30% convergence
    const dist = Math.abs(headRotation[activeStep.axis] - activeStep.target);
    const proximity = Math.max(0, 1 - dist / (activeStep.tolerance * 5));
    return proximity * 0.3;
  })();

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
        guidedMode={guidedMode}
        onToggleGuidedMode={() => setGuidedMode((v) => !v)}
      />

      <FaceTracker
        ref={faceTrackerRef}
        onHeadRotationChange={setHeadRotation}
      />
    </div>
  );
}

export default App;
