import { useEffect, useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";

interface ParticleSystemProps {
  headRotation: { yaw: number; pitch: number; roll: number };
  alignmentProgress?: number;
  isFormed?: boolean;
  setIsFormed: (value: boolean) => void;
}

const ParticleSystem = ({
  headRotation,
  alignmentProgress: _alignmentProgressProp = 0,
  isFormed: _isFormedProp = false,
  setIsFormed,
}: ParticleSystemProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { camera } = useThree();
  const noiseRef = useRef(createNoise3D());

  // Particle state
  const particleCount = 10000;
  const positionsRef = useRef<Float32Array>(
    new Float32Array(particleCount * 3),
  );
  const targetPositionsRef = useRef<Float32Array>(
    new Float32Array(particleCount * 3),
  );
  const velocitiesRef = useRef<Float32Array>(
    new Float32Array(particleCount * 3),
  );
  const particleStateRef = useRef<"chaos" | "forming" | "formed">("chaos");
  const transitionProgressRef = useRef(0);
  const timeRef = useRef(0);

  // Initialize particle positions in chaos state
  const initializeParticles = () => {
    const positions = positionsRef.current;
    const targetPositions = targetPositionsRef.current;

    // Grid for formed state (Polaroid photo arrangement)
    const gridSize = Math.ceil(Math.sqrt(particleCount));
    const spacing = 6 / gridSize;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;

      // Chaos positions - random distribution
      positions[idx] = (Math.random() - 0.5) * 20;
      positions[idx + 1] = (Math.random() - 0.5) * 20;
      positions[idx + 2] = (Math.random() - 0.5) * 20;

      // Target positions - grid in Polaroid shape
      const x = (i % gridSize) * spacing - (gridSize * spacing) / 2;
      const y = Math.floor(i / gridSize) * spacing - (gridSize * spacing) / 2;
      const z = 0;

      targetPositions[idx] = x;
      targetPositions[idx + 1] = y;
      targetPositions[idx + 2] = z;

      // Zero velocities
      velocitiesRef.current[idx] = 0;
      velocitiesRef.current[idx + 1] = 0;
      velocitiesRef.current[idx + 2] = 0;
    }
  };

  // Initialize geometry and material
  const { geometry, material } = useMemo(() => {
    initializeParticles();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positionsRef.current, 3),
    );

    const mat = new THREE.PointsMaterial({
      size: 0.05,
      color: new THREE.Color("#FFD700"),
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      toneMapped: false,
    });

    return { geometry: geo, material: mat };
  }, []);

  // Create dummy photo canvas (placeholder for actual photo)
  useEffect(() => {
    // Placeholder for future photo capture
  }, []);

  // Update particle positions in chaos state using Simplex noise
  useFrame((state) => {
    const positions = positionsRef.current;
    const time = state.clock.getElapsedTime();
    timeRef.current = time;

    if (particleStateRef.current === "chaos") {
      // Fluid motion using Simplex noise
      // @ts-ignore
      const noiseFunc = noiseRef.current;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const scale = 0.3;
        const speed = 0.5;

        const nx =
          noiseFunc(
            positions[idx] * scale,
            positions[idx + 1] * scale,
            time * speed,
          ) * 0.1;
        const ny =
          noiseFunc(
            positions[idx + 1] * scale,
            positions[idx + 2] * scale,
            time * speed,
          ) * 0.1;
        const nz =
          noiseFunc(
            positions[idx + 2] * scale,
            positions[idx] * scale,
            time * speed,
          ) * 0.1;

        velocitiesRef.current[idx] += nx;
        velocitiesRef.current[idx + 1] += ny;
        velocitiesRef.current[idx + 2] += nz;

        // Damping
        velocitiesRef.current[idx] *= 0.95;
        velocitiesRef.current[idx + 1] *= 0.95;
        velocitiesRef.current[idx + 2] *= 0.95;

        // Update positions
        positions[idx] += velocitiesRef.current[idx];
        positions[idx + 1] += velocitiesRef.current[idx + 1];
        positions[idx + 2] += velocitiesRef.current[idx + 2];

        // Keep particles in bounds
        const bound = 15;
        if (Math.abs(positions[idx]) > bound)
          positions[idx] = -positions[idx] * 0.5;
        if (Math.abs(positions[idx + 1]) > bound)
          positions[idx + 1] = -positions[idx + 1] * 0.5;
        if (Math.abs(positions[idx + 2]) > bound)
          positions[idx + 2] = -positions[idx + 2] * 0.5;
      }
    } else if (particleStateRef.current === "forming") {
      // Transition from chaos to formed
      const transitionDuration = 0.6; // 600ms
      transitionProgressRef.current += 0.016 / transitionDuration; // Assuming 60fps

      if (transitionProgressRef.current >= 1) {
        transitionProgressRef.current = 1;
        particleStateRef.current = "formed";
        setIsFormed(true);
      }

      const progress = transitionProgressRef.current;
      const easeProgress =
        progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const targetPos = targetPositionsRef.current;

        positions[idx] = THREE.MathUtils.lerp(
          positions[idx],
          targetPos[idx],
          easeProgress,
        );
        positions[idx + 1] = THREE.MathUtils.lerp(
          positions[idx + 1],
          targetPos[idx + 1],
          easeProgress,
        );
        positions[idx + 2] = THREE.MathUtils.lerp(
          positions[idx + 2],
          targetPos[idx + 2],
          easeProgress,
        );
      }
    }

    // Update camera position based on head rotation (subtle effect)
    const yawInfluence = Math.sin((headRotation.yaw * Math.PI) / 180) * 0.5;
    const pitchInfluence = Math.sin((headRotation.pitch * Math.PI) / 180) * 0.3;

    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      yawInfluence,
      0.1,
    );
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      pitchInfluence,
      0.1,
    );

    // Check for alignment trigger (18° ±2°)
    const rollAngle = Math.abs(headRotation.roll);
    const targetRoll = 18;
    const tolerance = 2;

    if (
      rollAngle >= targetRoll - tolerance &&
      rollAngle <= targetRoll + tolerance &&
      particleStateRef.current === "chaos"
    ) {
      particleStateRef.current = "forming";
      transitionProgressRef.current = 0;
    }

    if (geometry.attributes.position) {
      geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    // @ts-ignore
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
};

export default ParticleSystem;
