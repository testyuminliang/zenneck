import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";

interface Props {
  alignmentProgress: number;
  isFormed: boolean;
  onFormed: (v: boolean) => void;
  headRotation: { yaw: number; pitch: number; roll: number };
}

const noise3D = createNoise3D();
const N = 140; // points per curve

// 7 curves — warm terracotta / amber palette
const CURVE_CONFIGS = [
  { color: "#C4785C", ampX: 2.0, ampY: 1.4, ampZ: 0.55, freqT: 0.18, noiseOff: 0.0 },
  { color: "#E5B896", ampX: 1.5, ampY: 2.1, ampZ: 0.45, freqT: 0.23, noiseOff: 7.3 },
  { color: "#9A5840", ampX: 2.4, ampY: 1.1, ampZ: 0.70, freqT: 0.15, noiseOff: 14.6 },
  { color: "#D4956E", ampX: 1.7, ampY: 2.3, ampZ: 0.50, freqT: 0.26, noiseOff: 21.9 },
  { color: "#B87055", ampX: 2.2, ampY: 1.6, ampZ: 0.60, freqT: 0.20, noiseOff: 29.2 },
  { color: "#ECC99A", ampX: 1.3, ampY: 1.9, ampZ: 0.35, freqT: 0.17, noiseOff: 36.5 },
  { color: "#7A3F2C", ampX: 2.6, ampY: 1.0, ampZ: 0.80, freqT: 0.13, noiseOff: 43.8 },
] as const;

// Lerp helper
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function ResonanceVortex({ alignmentProgress, isFormed: _isFormed, onFormed, headRotation }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.Line[]>([]);
  const convergenceRef = useRef(0);
  const formedRef = useRef(false);
  const timeRef = useRef(0);
  const smoothYawRef = useRef(0);
  const smoothRollRef = useRef(0);
  const smoothPitchRef = useRef(0);

  // Build raw THREE.Line objects once
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const created = CURVE_CONFIGS.map((cfg) => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(N * 3);
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(cfg.color),
        transparent: true,
        opacity: 0.85,
      });
      const line = new THREE.Line(geo, mat);
      group.add(line);
      return line;
    });

    linesRef.current = created;

    return () => {
      created.forEach((l) => group.remove(l));
    };
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // Head rotation drives group orientation (all 3 axes)
    smoothYawRef.current = lerp(smoothYawRef.current, headRotation.yaw * 0.05, 0.06);
    smoothPitchRef.current = lerp(smoothPitchRef.current, headRotation.pitch * 0.03, 0.06);
    smoothRollRef.current = lerp(smoothRollRef.current, headRotation.roll * 0.012, 0.06);
    if (groupRef.current) {
      groupRef.current.rotation.y = smoothYawRef.current;   // 左右转脸
      groupRef.current.rotation.x = smoothPitchRef.current; // 上下点头
      groupRef.current.rotation.z = smoothRollRef.current;  // 左右侧倾
    }

    // Convergence target: trigger when alignment > 85%
    const targetConv = alignmentProgress > 0.85 ? 1.0 : 0.0;
    // 0.4s convergence time
    const lerpSpeed = Math.min(1.0, delta / 0.4);
    convergenceRef.current = lerp(convergenceRef.current, targetConv, lerpSpeed);
    const cv = convergenceRef.current;

    // Fire onFormed callbacks on threshold cross
    if (cv > 0.97 && !formedRef.current) {
      formedRef.current = true;
      onFormed(true);
    } else if (cv < 0.05 && formedRef.current) {
      formedRef.current = false;
      onFormed(false);
    }

    linesRef.current.forEach((line, i) => {
      const cfg = CURVE_CONFIGS[i];
      const posAttr = line.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let j = 0; j < N; j++) {
        const s = j / (N - 1); // 0..1
        const angle = s * Math.PI * 2;

        // ── CHAOTIC STATE ──────────────────────────────────────────────
        // Noise-driven Lissajous with inertial drift
        const noiseT = t * cfg.freqT + cfg.noiseOff;
        const nx = noise3D(Math.cos(angle) * 0.7 + i * 0.4, Math.sin(angle) * 0.7, noiseT);
        const ny = noise3D(Math.sin(angle) * 0.7, Math.cos(angle) * 0.7 + i * 0.4, noiseT * 1.2);
        const nz = noise3D(s * 2.5 + i * 0.6, noiseT * 0.6, 0.5);

        const r = 1.5 + nx * 0.9;
        const rot = t * 0.07 * (i % 2 === 0 ? 1 : -1.3);
        const chaosX = Math.cos(angle + rot) * r * cfg.ampX * 0.65;
        const chaosY = Math.sin(angle + rot * 0.7) * r * cfg.ampY * 0.65;
        const chaosZ = (nz * 0.7 + ny * 0.15) * cfg.ampZ;

        // ── MANDALA STATE ──────────────────────────────────────────────
        // Sinusoidal radial ring — each curve a different harmonic
        const harmonics = [2, 3, 4, 5, 6, 7, 8];
        const h = harmonics[i];
        const rMandala = 1.85 + Math.sin(angle * h) * 0.18 + Math.cos(angle * (h - 1)) * 0.08;
        const mandalaX = Math.cos(angle) * rMandala;
        const mandalaY = Math.sin(angle) * rMandala;
        const mandalaZ = Math.sin(angle * (i + 2)) * 0.07;

        // ── LERP ────────────────────────────────────────────────────────
        // Ease with smoothstep for a snappy collapse feel
        const cvSmooth = cv * cv * (3 - 2 * cv);
        arr[j * 3 + 0] = lerp(chaosX, mandalaX, cvSmooth);
        arr[j * 3 + 1] = lerp(chaosY, mandalaY, cvSmooth);
        arr[j * 3 + 2] = lerp(chaosZ, mandalaZ, cvSmooth);
      }

      posAttr.needsUpdate = true;
      line.geometry.computeBoundingSphere();

      // Opacity: converged state is brighter
      (line.material as THREE.LineBasicMaterial).opacity = lerp(0.70, 1.0, cv);
    });
  });

  return <group ref={groupRef} />;
}
