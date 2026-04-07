import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import * as THREE from 'three';

interface HeadRotation {
  yaw: number;
  pitch: number;
  roll: number;
}

interface FaceTrackerProps {
  onHeadRotationChange: (rotation: HeadRotation) => void;
  onAlignmentProgressChange: (progress: number) => void;
  onFormedChange: (value: boolean) => void;
}

const FaceTracker = forwardRef<any, FaceTrackerProps>(
  ({ onHeadRotationChange, onAlignmentProgressChange, onFormedChange }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const isInitializedRef = useRef(false);
    const previousRollRef = useRef(0);

    useImperativeHandle(ref, () => ({
      stop: () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      },
    }));

    useEffect(() => {
      const initFaceTracking = async () => {
        try {
          // Initialize MediaPipe Face Landmarker
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
          );

          const landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
          });

          faceLandmarkerRef.current = landmarker;

          // Request camera access
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              isInitializedRef.current = true;
              trackFace();
            };
          }
        } catch (error) {
          console.error('Face tracking initialization error:', error);
        }
      };

      const trackFace = () => {
        if (!isInitializedRef.current || !faceLandmarkerRef.current || !videoRef.current) {
          animationIdRef.current = requestAnimationFrame(trackFace);
          return;
        }

        try {
          const results = faceLandmarkerRef.current.detectForVideo(videoRef.current, Date.now());

          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];

            let yaw = 0;
            let pitch = 0;
            let roll = 0;

            if (landmarks.length >= 468) {
              // Use key facial landmarks to calculate head orientation
              const leftEye = landmarks[33]; // Left eye
              const rightEye = landmarks[263]; // Right eye
              const noseTip = landmarks[1]; // Nose tip
              const chin = landmarks[152]; // Chin

              // Calculate roll from eye positions (head tilt)
              const eyeDiff = rightEye.x - leftEye.x;
              const eyeHeightDiff = rightEye.y - leftEye.y;
              roll = Math.atan2(eyeHeightDiff, eyeDiff) * (180 / Math.PI);

              // Calculate pitch from nose to chin distance
              const noseToChainDist = chin.y - noseTip.y;
              pitch = noseToChainDist * 30; // Scale factor

              // Calculate yaw from nose position relative to eyes
              const noseX = noseTip.x;
              const eyesCenterX = (leftEye.x + rightEye.x) / 2;
              yaw = (noseX - eyesCenterX) * 100; // Scale factor
            }

            // Smooth the values using lerp
            yaw = THREE.MathUtils.lerp(previousRollRef.current, yaw, 0.1);
            
            // Calculate alignment progress (how close to 18° ±2°)
            const rollAngle = Math.abs(roll);
            const targetRoll = 18;
            const tolerance = 2;
            
            let alignmentProgress = 0;
            if (rollAngle >= targetRoll - tolerance && rollAngle <= targetRoll + tolerance) {
              alignmentProgress = Math.max(0, 1 - Math.abs(rollAngle - targetRoll) / tolerance);
            } else if (rollAngle > targetRoll - tolerance) {
              alignmentProgress = Math.max(0, 1 - Math.abs(rollAngle - targetRoll) / 10);
            }

            onHeadRotationChange({ yaw, pitch, roll });
            onAlignmentProgressChange(Math.min(alignmentProgress, 1));
            previousRollRef.current = yaw;
          }
        } catch (error) {
          console.error('Face detection error:', error);
        }

        animationIdRef.current = requestAnimationFrame(trackFace);
      };

      initFaceTracking();

      return () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
      };
    }, [onHeadRotationChange, onAlignmentProgressChange, onFormedChange]);

    return (
      <video
        ref={videoRef}
        style={{
          position: 'fixed',
          bottom: 10,
          left: 10,
          width: '120px',
          height: '90px',
          borderRadius: '8px',
          border: '1px solid #FFD700',
          opacity: 0.3,
          zIndex: 50,
          objectFit: 'cover',
        }}
      />
    );
  }
);

FaceTracker.displayName = 'FaceTracker';

export default FaceTracker;
