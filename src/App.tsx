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
  const [amplitudeScale, setAmplitudeScale] = useState(1.0);
  type CompletionPhase = 'idle' | 'ripple' | 'clearing' | 'emerging';
  const [completionPhase, setCompletionPhase] = useState<CompletionPhase>('idle');
  const faceTrackerRef = useRef<any>(null);

  const { stepIndex, activeStep, phase, holdProgress, resonanceProgress, totalSteps, isCompleted, resetCompleted } =
    useSequence(headRotation, amplitudeScale);

  // In guided mode: curves react to proximity before hold, then hold progress
  // In free mode: curves react to total head deviation
  const alignmentProgress = (() => {
    if (!guidedMode) {
      const mag = Math.sqrt(headRotation.yaw ** 2 + headRotation.pitch ** 2 + headRotation.roll ** 2);
      return Math.min(1, mag / 35);
    }
    if (phase === "resonance") return 1;
    if (phase === "hold") return 0.3 + holdProgress * 0.7;
    // guide phase: proximity to target drives 0–50% convergence
    const dist = Math.abs(headRotation[activeStep.axis] - activeStep.target);
    const proximity = Math.max(0, 1 - dist / (activeStep.tolerance * 5));
    return proximity * 0.5;
  })();

  const isFormed = phase === "resonance";

  useEffect(() => {
    if (!isCompleted) return;
    setCompletionPhase('ripple');
    const t1 = setTimeout(() => setCompletionPhase('clearing'), 2600);
    const t2 = setTimeout(() => { resetCompleted(); setGuidedMode(false); setCompletionPhase('emerging'); }, 3300);
    const t3 = setTimeout(() => setCompletionPhase('idle'), 5000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [isCompleted]);

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
        amplitudeScale={amplitudeScale}
        onAmplitudeChange={setAmplitudeScale}
        completionPhase={completionPhase}
      />

      {/* ── CLEARING OVERLAY ── fades in/out between completion and free mode */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 450,
        background: '#f5ede4',
        opacity: completionPhase === 'clearing' ? 1 : 0,
        transition: completionPhase === 'clearing' ? 'opacity 0.5s ease' : 'opacity 0.8s ease',
        pointerEvents: 'none',
      }} />

      <FaceTracker
        ref={faceTrackerRef}
        onHeadRotationChange={setHeadRotation}
      />
    </div>
  );
}

export default App;
