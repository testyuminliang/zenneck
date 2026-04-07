import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import * as THREE from "three";

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
  (
    { onHeadRotationChange, onAlignmentProgressChange, onFormedChange },
    ref,
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const isInitializedRef = useRef(false);
    const smoothedRollRef = useRef(0);
    const smoothedYawRef = useRef(0);
    const smoothedPitchRef = useRef(0);
    const lastDetectTimeRef = useRef(0);

    useImperativeHandle(ref, () => ({
      stop: () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }
      },
    }));

    useEffect(() => {
      const initFaceTracking = async () => {
        try {
          // Initialize MediaPipe Face Landmarker
          const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm",
          );

          const landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            },
            runningMode: "VIDEO",
            numFaces: 1,
          });

          faceLandmarkerRef.current = landmarker;

          // Request camera access — lower res for faster detection
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user",
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
          console.error("Face tracking initialization error:", error);
        }
      };

      const trackFace = () => {
        if (
          !isInitializedRef.current ||
          !faceLandmarkerRef.current ||
          !videoRef.current
        ) {
          animationIdRef.current = requestAnimationFrame(trackFace);
          return;
        }

        // Throttle detection to ~30fps to reduce CPU load
        const now = performance.now();
        if (now - lastDetectTimeRef.current < 33) {
          animationIdRef.current = requestAnimationFrame(trackFace);
          return;
        }
        lastDetectTimeRef.current = now;

        try {
          const results = faceLandmarkerRef.current.detectForVideo(
            videoRef.current,
            Date.now(),
          );

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

              // Pitch: nose Y relative to eye-midpoint, normalized by face height
              // Neutral ~0, looking up → negative, looking down → positive
              const eyeMidY = (leftEye.y + rightEye.y) / 2;
              const faceHeight = chin.y - eyeMidY;
              pitch = ((noseTip.y - eyeMidY) / faceHeight - 0.45) * 150;

              // Yaw: nose horizontal offset from eye center
              const eyesCenterX = (leftEye.x + rightEye.x) / 2;
              yaw = (noseTip.x - eyesCenterX) * 100;
            }

            // Smooth all three axes
            smoothedRollRef.current = THREE.MathUtils.lerp(smoothedRollRef.current, roll, 0.4);
            smoothedYawRef.current = THREE.MathUtils.lerp(smoothedYawRef.current, yaw, 0.4);
            smoothedPitchRef.current = THREE.MathUtils.lerp(smoothedPitchRef.current, pitch, 0.4);
            roll = smoothedRollRef.current;
            yaw = smoothedYawRef.current;
            pitch = smoothedPitchRef.current;

            // Calculate alignment progress (how close to 18° ±2°)
            const rollAngle = Math.abs(roll);
            const targetRoll = 18;
            const tolerance = 2;

            let alignmentProgress = 0;
            if (
              rollAngle >= targetRoll - tolerance &&
              rollAngle <= targetRoll + tolerance
            ) {
              alignmentProgress = Math.max(
                0,
                1 - Math.abs(rollAngle - targetRoll) / tolerance,
              );
            } else if (rollAngle > targetRoll - tolerance) {
              alignmentProgress = Math.max(
                0,
                1 - Math.abs(rollAngle - targetRoll) / 10,
              );
            }

            onHeadRotationChange({ yaw, pitch, roll });
            onAlignmentProgressChange(Math.min(alignmentProgress, 1));
          }
        } catch (error) {
          console.error("Face detection error:", error);
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

    // Privacy-first: camera feed never visible
    return (
      <video
        ref={videoRef}
        style={{ display: "none" }}
        playsInline
        muted
      />
    );
  },
);

FaceTracker.displayName = "FaceTracker";

export default FaceTracker;
