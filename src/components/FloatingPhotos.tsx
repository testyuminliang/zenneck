import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const FloatingPhotos = () => {
  const groupRef = useRef<THREE.Group>(null);
  const photosRef = useRef<THREE.Mesh[]>([]);

  // Create multiple floating photos
  const photos = useMemo(() => {
    const photoData = [];
    for (let i = 0; i < 4; i++) {
      photoData.push({
        position: [
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 10 + 2,
          (Math.random() - 0.5) * 8 - 8,
        ] as [number, number, number],
        rotation: [
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
        ] as [number, number, number],
        speed: 0.3 + Math.random() * 0.3,
        amplitude: 1 + Math.random() * 0.5,
        phaseOffset: Math.random() * Math.PI * 2,
      });
    }
    return photoData;
  }, []);

  // Create Polaroid-like plane geometry
  const createPhotoGeometry = () => {
    const geometry = new THREE.PlaneGeometry(2.5, 3.5);
    return geometry;
  };

  // Create material with golden gradient
  const createPhotoMaterial = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Polaroid frame effect
      ctx.fillStyle = "#F5F2EE";
      ctx.fillRect(0, 0, 256, 256);

      // Photo area with gradient
      const gradient = ctx.createLinearGradient(0, 0, 256, 256);
      gradient.addColorStop(0, "#1a0033");
      gradient.addColorStop(0.5, "#003d1a");
      gradient.addColorStop(1, "#1a0033");
      ctx.fillStyle = gradient;
      ctx.fillRect(20, 20, 216, 160);

      // Add some golden accents
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 1;
      ctx.strokeRect(25, 25, 206, 150);

      // Add text
      ctx.fillStyle = "#F5F2EE";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Zen Neck", 128, 200);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      emissive: new THREE.Color("#FFD700"),
      emissiveIntensity: 0.3,
      metalness: 0.1,
      roughness: 0.8,
      transparent: true,
      opacity: 0.6,
    });

    return material;
  };

  const geometry = useMemo(() => createPhotoGeometry(), []);
  const material = useMemo(() => createPhotoMaterial(), []);

  // Animate floating photos
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    photos.forEach((photo, i) => {
      if (photosRef.current[i]) {
        const mesh = photosRef.current[i];

        // Floating motion
        mesh.position.y =
          photo.position[1] +
          Math.sin(time * photo.speed + photo.phaseOffset) * photo.amplitude;
        mesh.rotation.x =
          photo.rotation[0] +
          Math.sin(time * 0.3 + photo.phaseOffset * 2) * 0.1;
        mesh.rotation.z =
          photo.rotation[2] +
          Math.cos(time * 0.25 + photo.phaseOffset * 3) * 0.1;

        // Subtle opacity pulse
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.3 + Math.sin(time * 0.5 + photo.phaseOffset) * 0.1;
      }
    });
  });

  return (
    // @ts-ignore
    <group ref={groupRef}>
      {photos.map((photo, i) => (
        // @ts-ignore
        <mesh
          key={i}
          ref={(el: THREE.Mesh | null) => {
            if (el) photosRef.current[i] = el;
          }}
          position={photo.position}
          rotation={photo.rotation}
          geometry={geometry}
          material={material}
          castShadow
          receiveShadow
        />
      ))}
      {/* @ts-ignore */}
    </group>
  );
};

export default FloatingPhotos;
