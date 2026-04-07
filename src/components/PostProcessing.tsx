import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, ColorDepth } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

interface PostProcessingProps {
  alignmentProgress: number;
  isFormed: boolean;
}

const PostProcessing = ({ alignmentProgress, isFormed }: PostProcessingProps) => {
  const { gl } = useThree();

  useEffect(() => {
    // Set up gradient background
    gl.setClearColor('#000000', 1);
    const bgColor = new THREE.Color('#000000');
    gl.setClearColor(bgColor, 1);
  }, [gl]);

  // Calculate bloom intensity based on alignment progress
  let bloomIntensity = 1;
  if (isFormed) {
    // Burst effect when formed
    bloomIntensity = 3;
  } else {
    // Gradual increase as alignment progresses
    bloomIntensity = 1 + alignmentProgress * 0.5;
  }

  return (
    <EffectComposer>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.15}
        luminanceSmoothing={0.9}
        blendFunction={BlendFunction.ADD}
      />
      <ColorDepth bits={8} />
    </EffectComposer>
  );
};

export default PostProcessing;
