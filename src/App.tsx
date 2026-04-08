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
    if (phase === "resonance" || phase === "pause") return 1;
    if (phase === "hold") return 0.3 + holdProgress * 0.7;
    // guide phase: how far along toward the target line (0 at start, 1 at line)
    const current = headRotation[activeStep.axis];
    const tgt = activeStep.target;
    const progress = tgt > 0
      ? Math.max(0, Math.min(1, current / tgt))
      : Math.max(0, Math.min(1, current / tgt));
    return progress * 0.5;
  })();

  const isFormed = phase === "resonance" || phase === "pause";

  useEffect(() => {
    if (!isCompleted) return;
    setCompletionPhase('ripple');
    const t1 = setTimeout(() => setCompletionPhase('clearing'), 1600);
    const t2 = setTimeout(() => { resetCompleted(); setGuidedMode(false); setCompletionPhase('emerging'); }, 5500);
    const t3 = setTimeout(() => setCompletionPhase('idle'), 11000);
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

      {/* ── CLEARING OVERLAY ── 渐入后缓缓消退，整个过程不断档 */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 450,
        background: '#f5ede4',
        opacity: completionPhase === 'clearing' ? 0.92
               : completionPhase === 'emerging'  ? 0
               : 0,
        transition: completionPhase === 'clearing' ? 'opacity 1.2s ease'
                  : completionPhase === 'emerging'  ? 'opacity 3.0s ease'
                  : 'opacity 0.3s ease',
        pointerEvents: 'none',
      }} />

      {/* ── COMPLETION TEXT ── 随覆层浮现，再随主页面一起缓缓退去 */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 460, pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        opacity: completionPhase === 'clearing' ? 1
               : completionPhase === 'emerging'  ? 0
               : 0,
        transition: completionPhase === 'clearing' ? 'opacity 1.2s ease 0.8s'
                  : completionPhase === 'emerging'  ? 'opacity 2.0s ease'
                  : 'opacity 0.3s ease',
      }}>
        <span style={{
          fontSize: '22px', letterSpacing: '0.22em',
          color: 'rgba(154,88,64,0.82)',
          fontFamily: "'DM Serif Display', serif",
          fontStyle: 'italic',
        }}>练习完成</span>
        <span style={{
          fontSize: '8px', letterSpacing: '0.4em',
          color: 'rgba(154,88,64,0.4)',
          fontFamily: 'monospace',
        }}>SESSION COMPLETE</span>
      </div>

      <FaceTracker
        ref={faceTrackerRef}
        onHeadRotationChange={setHeadRotation}
      />
    </div>
  );
}

export default App;
