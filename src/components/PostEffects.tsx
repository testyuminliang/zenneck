import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

interface Props {
  alignmentProgress: number;
  isFormed: boolean;
}

export default function PostEffects({ alignmentProgress, isFormed }: Props) {
  const bloomRef = useRef<any>(null);
  const intensityRef = useRef(0.9);

  useFrame((_, delta) => {
    // Target intensity: idle → building → BURST on formation
    const target = isFormed ? 3.2 : 0.9 + alignmentProgress * 1.1;
    intensityRef.current += (target - intensityRef.current) * Math.min(1, delta * (isFormed ? 12 : 3));

    if (bloomRef.current) {
      bloomRef.current.intensity = intensityRef.current;
    }
  });

  return (
    <EffectComposer>
      <Bloom
        ref={bloomRef}
        intensity={0.9}
        luminanceThreshold={0.08}
        luminanceSmoothing={0.92}
        mipmapBlur
      />
    </EffectComposer>
  );
}
