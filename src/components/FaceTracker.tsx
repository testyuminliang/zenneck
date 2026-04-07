import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import * as THREE from "three";
import type { HeadRotation } from "../types";

interface FaceTrackerProps {
  onHeadRotationChange: (rotation: HeadRotation) => void;
}

const FaceTracker = forwardRef<any, FaceTrackerProps>(
  ({ onHeadRotationChange }, ref) => {
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
        if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
        if (videoRef.current?.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        }
      },
    }));

    useEffect(() => {
      const initFaceTracking = async () => {
        try {
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
            outputFacialTransformationMatrixes: true,
          });
          faceLandmarkerRef.current = landmarker;

          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
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
          console.error("Face tracking init error:", error);
        }
      };

      const trackFace = () => {
        if (!isInitializedRef.current || !faceLandmarkerRef.current || !videoRef.current) {
          animationIdRef.current = requestAnimationFrame(trackFace);
          return;
        }

        // ~30fps cap
        const now = performance.now();
        if (now - lastDetectTimeRef.current < 33) {
          animationIdRef.current = requestAnimationFrame(trackFace);
          return;
        }
        lastDetectTimeRef.current = now;

        try {
          const results = faceLandmarkerRef.current.detectForVideo(videoRef.current, Date.now());

          if (results.faceLandmarks?.length > 0) {
            let roll = 0, pitch = 0, yaw = 0;

            // Use 3D face transformation matrix for accurate pitch/yaw/roll
            const matrices = (results as any).facialTransformationMatrixes;
            if (matrices?.length > 0) {
              // MediaPipe returns column-major 4×4 matrix; THREE reads it the same way
              const m = new THREE.Matrix4().fromArray(matrices[0].data);
              const euler = new THREE.Euler().setFromRotationMatrix(m, "YXZ");
              const toDeg = 180 / Math.PI;
              // yaw negated for mirror flip; roll NOT negated (matrix already in camera space)
              pitch =  euler.x * toDeg;
              yaw   = -euler.y * toDeg;
              roll  =  euler.z * toDeg;
            } else {
              // Fallback: landmark-based (less reliable for pitch)
              const lm = results.faceLandmarks[0];
              if (lm.length >= 468) {
                const leftEye  = lm[33];
                const rightEye = lm[263];
                const noseTip  = lm[1];
                const chin     = lm[152];
                roll  = -Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
                const eyeMidY = (leftEye.y + rightEye.y) / 2;
                const faceH   = chin.y - eyeMidY;
                pitch = -((noseTip.y - eyeMidY) / faceH - 0.45) * 200;
                yaw   = -(noseTip.x - (leftEye.x + rightEye.x) / 2) * 280;
              }
            }

            smoothedRollRef.current  = THREE.MathUtils.lerp(smoothedRollRef.current,  roll,  0.4);
            smoothedPitchRef.current = THREE.MathUtils.lerp(smoothedPitchRef.current, pitch, 0.4);
            smoothedYawRef.current   = THREE.MathUtils.lerp(smoothedYawRef.current,   yaw,   0.4);

            onHeadRotationChange({
              roll:  smoothedRollRef.current,
              pitch: smoothedPitchRef.current,
              yaw:   smoothedYawRef.current,
            });
          }
        } catch (e) {
          console.error("Face detect error:", e);
        }

        animationIdRef.current = requestAnimationFrame(trackFace);
      };

      initFaceTracking();
      return () => { if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current); };
    }, [onHeadRotationChange]);

    return <video ref={videoRef} style={{ display: "none" }} playsInline muted />;
  },
);

FaceTracker.displayName = "FaceTracker";
export default FaceTracker;
