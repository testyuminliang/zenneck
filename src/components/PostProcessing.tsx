import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ColorDepth } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

interface PostProcessingProps {
  alignmentProgress: number;
  isFormed: boolean;
}

const PostProcessing = ({
  alignmentProgress,
  isFormed,
}: PostProcessingProps) => {
  const { gl } = useThree();

  useEffect(() => {
    // Set up light background
    const bgColor = new THREE.Color("#F5F2EE");
    gl.setClearColor(bgColor, 1);
  }, [gl]);

  // Calculate bloom intensity based on alignment progress - subtle for light bg
  let bloomIntensity = 0.3;
  if (isFormed) {
    // Subtle burst effect when formed
    bloomIntensity = 0.8;
  } else {
    // Very gradual increase as alignment progresses
    bloomIntensity = 0.3 + alignmentProgress * 0.2;
  }

  return (
    <EffectComposer>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.95}
        blendFunction={BlendFunction.SCREEN}
      />
      <ColorDepth bits={8} />
    </EffectComposer>
  );
};

export default PostProcessing;
