# ZenNeck - 3D Visual Alignment & Neck-Spine Meditation Experience

A sophisticated React 19 + Three.js + MediaPipe Face Tracking application that creates an immersive 3D experience combining particle physics, real-time face detection, and meditative interaction patterns.

## 🎨 Visual Identity

- **Background**: Deep radial gradient from #001A12 to absolute black with golden particle dust
- **Primary Colors**: 18K gold (#FFD700), soft white (#F5F2EE), semi-transparent glass effects
- **Effects**: UnrealBloom (cinematic glow), particle systems with fluid dynamics
- **Aesthetic**: Minimalist HUD with focus on 3D depth and ethereal motion

## 🔧 Core Features

### 1. **Particle System (10,000 particles)**
- **CHAOS State**: Particles flow with Simplex Noise-driven fluid dynamics, creating organic turbulence
- **FORMED State**: Auto-triggers when head Roll angle reaches 18° (±2° tolerance), particles snap into a perfect grid forming a 3D Polaroid photograph
- **Transition**: Smooth 600ms easing with cinematic bloom burst (intensity 1.0 → 3.0)

### 2. **Face Tracking Integration (MediaPipe)**
- Real-time facial landmark detection (468 points)
- Head rotation extraction:
  - **Yaw** (left/right turn) → Camera X displacement
  - **Pitch** (up/down tilt) → Camera Y displacement
  - **Roll** (head tilt) → Alignment trigger mechanism
- All values smoothed with exponential lerp for stutter-free motion

### 3. **Interactive UI Components**
- **Center Focus**: Subtle crosshair that brightens as alignment approaches target
- **Aura Widget**: Rotating semi-transparent sphere in bottom-right reflecting alignment state
- **Floating Photos**: 4 Polaroid-like meshes scattered in 3D space with subtle bobbing animation

### 4. **Post-Processing**
- Bloom effect with dynamic intensity tied to alignment progress
- Color depth processing for enhanced visual depth

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
npm install --legacy-peer-deps
```

### Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173` with hot module reloading.

### Production Build

```bash
npm run build
```

Output in `dist/` directory.

## 📁 Project Structure

```
src/
├── App.tsx                    # Main Canvas setup, state management
├── components/
│   ├── ParticleSystem.tsx     # 10K particle chaos→formed logic
│   ├── FloatingPhotos.tsx     # Animated Polaroid meshes
│   ├── PostProcessing.tsx     # Bloom & color effects
│   ├── FaceTracker.tsx        # MediaPipe integration
│   └── UI/
│       ├── CenterFocus.tsx    # Crosshair indicator
│       ├── AuraWidget.tsx     # Rotating sphere visualization
│       └── UI.css             # Styled components
├── index.css                  # Global styles
└── App.css                    # App container styles
```

## 🎯 Interaction Flow

1. **Start**: Particles enter CHAOS mode with organic Simplex noise motion
2. **Track**: Face camera captures head position and rotation in real-time
3. **Align**: User tilts head sideways to target 18° roll angle
4. **Trigger**: When roll reaches target ±2°, particles transition to FORMED state
5. **Bloom**: Intense bloom burst signals successful alignment
6. **Result**: Particles form perfect grid snapshot (Polaroid photo style)

## ⚙️ Technical Stack

- **React 19**: UI framework with Hooks
- **Three.js** (v0.160): 3D rendering engine
- **React Three Fiber** (v8.14): React bindings for Three.js
- **@react-three/postprocessing**: Post-processing effects (Bloom)
- **@react-three/drei**: Utility components (Preload, etc.)
- **MediaPipe** (v0.10): Face landmark detection & pose estimation
- **Simplex Noise** (v4.0): Procedural Perlin noise generation
- **Vite**: Build tool & dev server
- **TypeScript**: Type safety

## 🎮 Controls

- **Head Tracking**: Use device camera
- **Head Roll (Tilt)**: Primary interaction - tilt head left/right
- **Head Yaw/Pitch**: Subtly moves camera for immersion

## ⚡ Performance Considerations

- GPU-accelerated particle rendering (Points geometry)
- Efficient buffer attribute updates only when needed
- Cached geometries and materials (useMemo)
- Video element at low opacity for minimal visual impact
- Optimized bloom processing with luminance threshold

## 🔐 Browser Compatibility

Requires:
- WebGL 2.0 support
- getUserMedia API (camera access)
- ES2020+ JavaScript support

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 15+
- Edge 90+

## 📝 License

MIT

## 🙏 Inspiration

Designed as a meditative 3D experience combining:
- Particle physics (chaos to order transformation)
- Neck/spine alignment mindfulness
- Immersive 3D visual feedback
- Subtle interaction mechanics

---

**Note**: This application requires camera permissions. Privacy-first design ensures all face tracking happens locally on your device—no data transmission.
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
