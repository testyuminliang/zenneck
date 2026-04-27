import { useEffect, useRef, useState } from "react";
import MinimalUI from "./components/UI/MinimalUI";
import FaceTracker from "./components/FaceTracker";
import CustomPanel from "./components/UI/CustomPanel";
import FluidBackground from "./components/FluidBackground";
import MeditationOverlay from "./components/MeditationOverlay";
import { useSequence, STEPS } from "./hooks/useSequence";
import { useAudio } from "./hooks/useAudio";
import type { HeadRotation, CustomConfig } from "./types";
import type { Lang } from "./lang";
import { t } from "./lang";
import { getTheme } from "./themes";
import "./App.css";

const BASE_ANGLE = 20;

const DEFAULT_CONFIG: CustomConfig = {
  presets: [
    { label: "轻", angle: 13 },
    { label: "中", angle: 20 },
    { label: "深", angle: 30 },
  ],
  stepOrder: [2, 3, 0, 1, 4, 5],
  bgmEnabled: true,
  sfxEnabled: true,
  voiceCuesEnabled: false,
};

function App() {
  const [headRotation, setHeadRotation] = useState<HeadRotation>({ yaw: 0, pitch: 0, roll: 0 });
  const [guidedMode, setGuidedMode] = useState(false);
  const [activePresetIdx, setActivePresetIdx] = useState(1);
  const [customConfig, setCustomConfig] = useState<CustomConfig>(() => {
    try {
      const saved = localStorage.getItem("zenneck-config");
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return DEFAULT_CONFIG;
  });
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [lang, setLang] = useState<Lang>('zh');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);

  // Persist config changes to localStorage
  useEffect(() => {
    localStorage.setItem("zenneck-config", JSON.stringify(customConfig));
  }, [customConfig]);

  const theme = getTheme(customConfig.themeKey);
  const amplitudeScale = customConfig.presets[activePresetIdx].angle / BASE_ANGLE;
  const activeSteps = customConfig.stepOrder
    .map(id => STEPS.find(s => s.id === id)!)
    .filter(Boolean);
  type CompletionPhase = 'idle' | 'ripple' | 'clearing' | 'emerging';
  const [completionPhase, setCompletionPhase] = useState<CompletionPhase>('idle');
  const faceTrackerRef = useRef<any>(null);

  const { stepIndex, activeStep, phase, holdProgress, inHoldZone, resonanceProgress, totalSteps, isCompleted, resetCompleted, resetAll } =
    useSequence(headRotation, amplitudeScale, activeSteps, guidedMode);

  const { startBGM, stopBGM, loadCustomBgm, clearCustomBgm, startCrescendo, updateCrescendo, stopCrescendo, playStepComplete, playSessionComplete, playCue } = useAudio();

  // BGM：bgmEnabled 时淡入（自由/引导模式均生效），否则淡出
  useEffect(() => {
    if (customConfig.bgmEnabled) startBGM();
    else stopBGM();
    return () => stopBGM();
  }, [customConfig.bgmEnabled, startBGM, stopBGM]);

  // Voice cue — fires when a new step starts in guided mode
  useEffect(() => {
    if (!guidedMode || !customConfig.voiceCuesEnabled || phase !== "guide" || isCompleted) return;
    playCue(activeStep.id, lang, 2);
  }, [stepIndex, guidedMode]);

  // Voice cue — fires when movement reaches 40% of target in guide phase; repeats after 4s if still not in hold
  const movementCueFiredRef = useRef(false);
  const movementRepeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!guidedMode || !customConfig.voiceCuesEnabled || isCompleted) return;
    if (phase !== "guide") {
      movementCueFiredRef.current = false;
      if (movementRepeatTimerRef.current) { clearTimeout(movementRepeatTimerRef.current); movementRepeatTimerRef.current = null; }
      return;
    }
    if (movementCueFiredRef.current) return;
    const value = Math.abs(headRotation[activeStep.axis as keyof typeof headRotation]);
    const threshold = Math.abs(activeStep.target) * 0.4;
    if (value >= threshold && threshold > 2) {
      movementCueFiredRef.current = true;
      playCue(-2, lang, 0);
      movementRepeatTimerRef.current = setTimeout(() => {
        movementRepeatTimerRef.current = null;
        movementCueFiredRef.current = false; // allow re-fire so it can repeat again if still not in hold
      }, 4000);
    }
  }, [headRotation, phase, guidedMode]);

  // Voice cue — "慢慢来" after 3s out of hold zone, then "保持" on return
  const leftZoneAtRef = useRef<number | null>(null);
  const returnCueFiredRef = useRef(false);
  const returnCueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!guidedMode || !customConfig.voiceCuesEnabled || phase !== "hold" || isCompleted) {
      leftZoneAtRef.current = null;
      returnCueFiredRef.current = false;
      if (returnCueTimerRef.current) { clearTimeout(returnCueTimerRef.current); returnCueTimerRef.current = null; }
      return;
    }
    if (!inHoldZone) {
      if (leftZoneAtRef.current === null) {
        leftZoneAtRef.current = Date.now();
        returnCueFiredRef.current = false;
        returnCueTimerRef.current = setTimeout(() => {
          playCue(-2, lang, 0);
          returnCueFiredRef.current = true;
        }, 2000);
      }
    } else {
      if (returnCueTimerRef.current) { clearTimeout(returnCueTimerRef.current); returnCueTimerRef.current = null; }
      if (returnCueFiredRef.current) {
        playCue(-1, lang, 1);
      }
      leftZoneAtRef.current = null;
      returnCueFiredRef.current = false;
    }
  }, [inHoldZone, phase, guidedMode]);

  // Phase 转换音效
  const prevPhaseRef = useRef<string>("guide");
  useEffect(() => {
    if (!guidedMode || isCompleted) { prevPhaseRef.current = phase; return; }
    const prev = prevPhaseRef.current;
    if (phase === "hold" && prev === "guide") {
      if (customConfig.sfxEnabled) startCrescendo();
      if (customConfig.voiceCuesEnabled) playCue(-1, lang);
    } else if (phase === "resonance" && prev === "hold") {
      stopCrescendo();
      if (customConfig.sfxEnabled) playStepComplete();
    } else if (phase === "guide" && prev === "hold") {
      stopCrescendo();
    }
    prevPhaseRef.current = phase;
  }, [phase, guidedMode]);

  // 渐强音随 holdProgress 实时更新；离开区域时静音，回来时恢复
  useEffect(() => {
    if (phase === "hold" && guidedMode && customConfig.sfxEnabled)
      updateCrescendo(inHoldZone ? holdProgress : 0);
  }, [holdProgress, inHoldZone, phase, guidedMode]);


  useEffect(() => {
    if (!isCompleted) return;
    stopCrescendo();
    if (customConfig.sfxEnabled) playSessionComplete();
    if (customConfig.voiceCuesEnabled) setTimeout(() => playCue(-3, lang, 2), 800);
    setCompletionPhase('ripple');
    const t1 = setTimeout(() => setCompletionPhase('clearing'), 1600);
    const t2 = setTimeout(() => {
      resetCompleted();
      setGuidedMode(false);
      setCompletionPhase('emerging');
    }, 5500);
    const t3 = setTimeout(() => setCompletionPhase('idle'), 11000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [isCompleted]);

  useEffect(() => {
    return () => {
      if (faceTrackerRef.current) faceTrackerRef.current.stop();
    };
  }, []);

  const meditationProgress =
    phase === "resonance" || phase === "pause" ? 1
    : phase === "hold" ? holdProgress
    : 0;

  return (
    <div className="app-container">
      <FluidBackground
        palette={theme.bgPalette}
        baseColor={theme.bgBase}
        headOffset={!guidedMode ? { x: headRotation.yaw / 20, y: -headRotation.pitch / 20 } : undefined}
      />

      <MeditationOverlay
        progress={meditationProgress}
        bloomPalette={theme.bloomPalette}
        deepPalette={theme.deepPalette}
        arcColor={theme.arcColor}
      />

      <MinimalUI
        activeStep={activeStep}
        phase={phase}
        holdProgress={holdProgress}
        resonanceProgress={resonanceProgress}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        headRotation={headRotation}
        guidedMode={guidedMode}
        onToggleGuidedMode={() => {
          if (guidedMode) resetAll();
          setGuidedMode((v) => !v);
        }}
        activePresetIdx={activePresetIdx}
        onPresetChange={setActivePresetIdx}
        customConfig={customConfig}
        onCustomOpen={() => setShowCustomPanel(v => !v)}
        completionPhase={completionPhase}
        lang={lang}
        onToggleLang={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
        cameraActive={cameraActive}
        cameraFailed={cameraFailed}
      />

      {showCustomPanel && (
        <CustomPanel
          config={customConfig}
          allSteps={STEPS}
          onChange={setCustomConfig}
          onClose={() => setShowCustomPanel(false)}
          lang={lang}
          onUploadBgm={async (file) => {
            const name = await loadCustomBgm(file);
            setCustomConfig(c => ({ ...c, customBgmName: name }));
          }}
          onClearBgm={async () => {
            await clearCustomBgm();
            setCustomConfig(c => ({ ...c, customBgmName: undefined }));
          }}
        />
      )}

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
        }}>{t('sessionComplete', lang)}</span>
        <span style={{
          fontSize: '8px', letterSpacing: '0.4em',
          color: 'rgba(154,88,64,0.4)',
          fontFamily: 'monospace',
        }}>SESSION COMPLETE</span>
      </div>

      <FaceTracker
        ref={faceTrackerRef}
        onHeadRotationChange={setHeadRotation}
        onCameraActive={() => setCameraActive(true)}
        onCameraFailed={() => setCameraFailed(true)}
      />
    </div>
  );
}

export default App;
