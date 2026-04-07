# ZenNeck Architecture & Implementation Guide

## Project Overview

ZenNeck is a meditative 3D visualization application that combines particle physics, real-time face tracking, and immersive 3D graphics to create a unique user experience. The core interaction is elegantly simple: tilt your head to the side at precisely 18° and watch as 10,000 golden particles arrange themselves into a crystalline Polaroid photograph.

---

## System Architecture

### 1. React Application Shell (`App.tsx`)

**Responsibilities:**

- Manage global state (head rotation, alignment progress, formation state)
- Set up Three.js Canvas with optimal rendering settings
- Compose scene components and UI overlays
- Lifecycle management for FaceTracker

**Key Props Flow:**

```
App (State)
├─ headRotation: { yaw, pitch, roll }
├─ alignmentProgress: 0-1
├─ isFormed: boolean
└─ Children (ParticleSystem, PostProcessing, UI components, FaceTracker)
```

**Canvas Configuration:**

- Camera: Position `[0, 0, 8]`, FOV 70°, aspect ratio responsive
- Renderer: Antialias enabled, alpha blending, high performance mode
- DPR: Device pixel ratio for sharper rendering on high-DPI screens

---

### 2. Particle System (`components/ParticleSystem.tsx`)

**Architecture:** GPU-accelerated point cloud with dual-state dynamics

#### State Machine

```
CHAOS ← → FORMING ← → FORMED
```

**CHAOS State:**

- 10,000 particles initialized with random positions in 20x20x20 box
- Each frame: velocity += Simplex noise gradient
- Velocities damped by 0.95 factor to prevent explosion
- Keeps particles bouncing in bounded region
- Visual effect: Organic turbulence with golden shimmer

**FORMATION Trigger:**

- Watches `headRotation.roll` value from FaceTracker
- Fires when: `Math.abs(roll) >= 16° && Math.abs(roll) <= 20°` (18° ±2°)
- Sets state to `FORMING` and starts transition timer

**FORMING State:**

- Duration: 600ms (0.6 seconds)
- Transition: Easing function (quadratic ease-in-out)
- Target: Grid layout in Polaroid proportions
  - Grid size: `√10000 = 100x100`
  - Spacing: `6 / 100 = 0.06` units
  - Z-plane: All particles converge to Z=0 (flat photo plane)
- Camera slightly adjusts in XY based on head position

**FORMED State:**

- Particles hold grid positions
- Triggered: `ParticleSystem.setIsFormed(true)`
- Bloom intensity spikes to 3.0 for 1-frame celebration

#### Material Properties

```javascript
PointsMaterial {
  size: 0.05,
  color: #FFD700 (gold),
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.8,
  toneMapped: false  // Prevents filter from suppressing bloom
}
```

#### Performance Optimization

- Uses `Float32Array` for positions (GPU-ready)
- Single `BufferGeometry` with shared attributes
- Only updates `position` attribute when changed
- `useMemo` caches geometry/material across re-renders

---

### 3. Face Tracking (`components/FaceTracker.tsx`)

**Integration:** MediaPipe Face Landmarker with 468 facial keypoints

#### Data Flow

```
Camera Stream
    ↓
[Video Element]
    ↓
MediaPipe.detectForVideo()
    ↓
{faceLandmarks: [468 points]}
    ↓
Extract keypoints (eyes, nose, chin)
    ↓
Calculate Euler angles (yaw, pitch, roll)
    ↓
Smooth with THREE.MathUtils.lerp()
    ↓
onHeadRotationChange callback
```

#### Angle Calculations

```typescript
// Roll (head tilt - PRIMARY for alignment)
const eyeDiff = rightEye.x - leftEye.x;
const eyeHeightDiff = rightEye.y - leftEye.y;
roll = Math.atan2(eyeHeightDiff, eyeDiff) * (180 / Math.PI);

// Pitch (head up/down)
const noseToChainDist = chin.y - noseTip.y;
pitch = noseToChainDist * 30; // Scale factor

// Yaw (head left/right)
const noseX = noseTip.x;
const eyesCenterX = (leftEye.x + rightEye.x) / 2;
yaw = (noseX - eyesCenterX) * 100; // Scale factor
```

#### Alignment Progress Calculation

```typescript
const rollAngle = Math.abs(roll);
const targetRoll = 18;
const tolerance = 2;

alignmentProgress =
  rollAngle >= 16 && rollAngle <= 20
    ? Math.max(0, 1 - Math.abs(rollAngle - 18) / 2)
    : Math.max(0, 1 - Math.abs(rollAngle - 18) / 10);
```

**Result:** 0 at ±20°, peaks at 1.0 exactly at 18°

#### Smoothing

- Uses exponential moving average: `lerp(previous, current, 0.1)`
- 10% blend toward new value keeps motion smooth
- Prevents jittery camera/UI from sensor noise

---

### 4. Post-Processing (`components/PostProcessing.tsx`)

**Effect Stack:**

1. **Bloom (EffectComposer)**
   - Luminance threshold: 0.15 (captures gold particles)
   - Smoothing: 0.9 (soft bloom edges)
   - Blend: ADD (additive blending)
   - Dynamic intensity: 1.0 + (alignmentProgress × 0.5)
   - Peak: 3.0 when in FORMED state

2. **Color Depth**
   - 8-bit depth processing
   - Ensures clean color gradients

**Background:**

- Set via `gl.setClearColor('#000000')`
- Three.js Color object for gamma correction
- Radial gradient in App.css for CSS overlay effect

---

### 5. UI Components

#### CenterFocus (`components/UI/CenterFocus.tsx`)

```javascript
// Animated crosshair with dynamic opacity
opacity: min(0.3 + alignmentProgress * 0.7, 1)
scale: 1 + alignmentProgress * 0.2

// SVG elements:
- Outer circle (radius 45)
- Inner circle (radius 35)
- 4 crosshair lines
- Center dot
- Dashed alignment indicator
```

#### AuraWidget (`components/UI/AuraWidget.tsx`)

```javascript
// Bottom-right floating sphere
Position: { bottom: 40px, right: 40px }
Size: 80×80px
Animation:
  - Continuous rotation (conic gradient)
  - Color shifts based on alignment
  - Pulsing glow (keyframe animation)
  - Opacity transitions with alignment progress
```

#### FloatingPhotos (`components/FloatingPhotos.tsx`)

```javascript
// 4 Polaroid-style meshes
- Each has unique bobbing phase
- Slow rotation (0.3 rad/frame)
- Opacity pulse (sin wave)
- Scattered in 3D space [-7.5 to 7.5, 0-5, -8]
- Canvas texture with gradient + text
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  Camera Stream  │
└────────┬────────┘
         │
         ▼
   ┌──────────────┐
   │  FaceTracker │
   └────────┬─────┘
         │
    (every 16ms)
         │
         ▼
   ┌──────────────────┐
   │  Head Rotation   │
   │  {yaw, pitch,    │
   │   roll}          │
   └────────┬─────────┘
         │
         ▼
   ┌──────────────────┐
   │ Alignment Check  │
   │ (trigger from    │
   │  roll ≈ 18°)     │
   └────────┬─────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
 FORM→   Progress
 State    Update
    │          │
    └────┬─────┘
         │
         ▼
   ┌──────────────────┐
   │ ParticleSystem   │
   │ - Animate        │
   │ - Update buffer  │
   │ - Check trigger  │
   └──────────┬───────┘
              │
              ▼
         ┌─────────────┐
         │  Three.js   │
         │  Render     │
         └─────┬───────┘
               │
               ▼
        ┌────────────────┐
        │ PostProcessing │
        │ (Bloom, Color) │
        └────────┬───────┘
                 │
                 ▼
         ┌──────────────┐
         │   Canvas     │
         │   Display    │
         └──────────────┘
```

---

## Performance Optimizations

### GPU Level

- **Particle Rendering:** Uses `THREE.Points` (single draw call for 10K particles)
- **Geometry Caching:** `useMemo` prevents recreation on re-renders
- **Selective Updates:** Only position buffer attribute updates flagged when needed

### CPU Level

- **Lerp Smoothing:** Reduces animation jitter with exponential moving average
- **Noise Caching:** Simplex noise function stored in ref (not recreated)
- **Ref-based State:** Particle positions in typed arrays (not React state → no re-renders)

### Browser Level

- **No Unnecessary DOM:** Minimal HTML footprint (1 canvas + 1 video)
- **CSS Containment:** UI elements positioned fixed (no layout recalc)
- **Request Animation Frame:** Uses Three.js frame loop (synchronized to display refresh)

### Load Performance

- **Lazy Material Creation:** Canvas textures created once
- **Pre-loaded Dependencies:** Three.js, React, other libs bundled at build time
- **Vite Optimization:** Code splitting + tree-shaking in production build

---

## Customization Points

### Particle Count

Edit in `ParticleSystem.tsx`:

```typescript
const particleCount = 10000; // Change this
```

### Target Roll Angle

Edit in `ParticleSystem.tsx` and `FaceTracker.tsx`:

```typescript
const targetRoll = 18; // degrees
const tolerance = 2; // ±degrees
```

### Transition Speed

Edit in `ParticleSystem.tsx`:

```typescript
const transitionDuration = 0.6; // seconds
```

### Colors & Styling

- **Backend colors:** `App.css` gradient, `ParticleSystem.tsx` material
- **Bloom intensity:** `PostProcessing.tsx` calculation
- **UI colors:** `UI/UI.css` file

---

## Browser Requirements

- **WebGL 2.0:** For advanced rendering
- **getUserMedia API:** For camera access (HTTPS required in production)
- **ES2020:** Arrow functions, destructuring, etc.
- **SharedArrayBuffer:** Not required but improves performance

---

## Troubleshooting

### Camera not working

- Check browser permissions (chrome://settings/privacy/camera)
- Ensure HTTPS in production
- Verify MediaPipe WASM CDN access

### Particles not forming

- Check roll angle target is tuned to your head tilt
- Head must be relatively still (fast motion causes re-detection jitter)
- Ensure lighting is adequate for face detection

### Bloom not visible

- Check bloom intensity calculation in `PostProcessing.tsx`
- Verify material `toneMapped: false`
- Confirm `luminanceThreshold` isn't filtering out gold (#FFD700)

### Performance issues

- Reduce particle count
- Lower bloom intensity
- Disable post-processing (test without EffectComposer)
- Check GPU driver is up-to-date

---

## Future Enhancements

1. **Photo Capture:** Save formed particle grid as actual image
2. **Audio Integration:** Meditative soundscapes with particle sync
3. **Multi-user:** Network sync for shared experiences
4. **Mobile Optimization:** Touch-based controls for devices without cameras
5. **AR Mode:** Project onto real environment
6. **Custom Poses:** Different particle target layouts (spirals, waves, etc.)

---

## References

- [React Three Fiber Documentation](https://docs.pmnd.rs/react-three-fiber/)
- [Three.js API](https://threejs.org/docs/)
- [MediaPipe Face Landmarker](https://developers.google.com/mediapipe/solutions/vision/face_landmarker)
- [Simplex Noise Algorithm](https://en.wikipedia.org/wiki/Simplex_noise)
