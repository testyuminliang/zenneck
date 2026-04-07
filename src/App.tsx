import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import ParticleSystem from "./components/ParticleSystem";
import PostProcessing from "./components/PostProcessing";
import MinimalUI from "./components/UI/MinimalUI";
import FloatingPhotos from "./components/FloatingPhotos";
import FaceTracker from "./components/FaceTracker";
import "./App.css";

interface HeadRotation {
  yaw: number;
  pitch: number;
  roll: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [headRotation, setHeadRotation] = useState<HeadRotation>({
    yaw: 0,
    pitch: 0,
    roll: 0,
  });
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
          position: [0, 0, 5],
          fov: 75,
          aspect: window.innerWidth / window.innerHeight,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
        dpr={window.devicePixelRatio}
        style={{ width: "100%", height: "100vh" }}
      >
        {/* Lighting */}
        {/* @ts-ignore */}
        <ambientLight intensity={1.2} />
        {/* @ts-ignore */}
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        {/* @ts-ignore */}
        <pointLight position={[-10, -10, 5]} intensity={0.8} />

        {/* Main Scene Components */}
        <ParticleSystem
          headRotation={headRotation}
          alignmentProgress={alignmentProgress}
          isFormed={isFormed}
          setIsFormed={setIsFormed}
        />

        {/* Debug sphere to verify rendering */}
        {/* @ts-ignore */}
        <mesh position={[0, 0, 0]}>
          {/* @ts-ignore */}
          <sphereGeometry args={[0.2, 16, 16]} />
          {/* @ts-ignore */}
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={1}
          />
        </mesh>

        <FloatingPhotos />

        {/* Post-processing effects */}
        <PostProcessing
          alignmentProgress={alignmentProgress}
          isFormed={isFormed}
        />

        <Preload all />
      </Canvas>

      {/* Minimal UI overlay */}
      <MinimalUI
        alignmentProgress={alignmentProgress}
        isFormed={isFormed}
        headRotation={headRotation}
      />

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
