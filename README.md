# ZenNeck — A Story About My Neck, My Screen, and a Moment of Stillness

A meditative web app that uses your camera to guide you through a quiet sequence of neck movements — each one rewarded with ten thousand golden particles blooming into stillness.

---

## Inspiration

It started with a message from my mom.

I was at my desk, mid-afternoon, doing what many of us quietly do — scrolling through my phone instead of working. And almost every time I chatted with my parents, somewhere in the conversation, one of them would say:

> *"Remember to rest. Move around a little. Watch out for your neck!"*

I'd reply "okay okay" and put my phone down. But it kept happening. Every week. The same gentle, slightly nagging reminder that I'd learned to half-ignore — until I realized I was sitting in the exact posture they were warning me about, reading the exact message they always sent.

What if taking care of your neck felt like an achievement instead of a chore?
What if — just for a moment — tilting your head to the side felt like unlocking something beautiful?
That question became ZenNeck.

---

## What it does

ZenNeck guides you through a quiet sequence of neck movements — each one gently prompted, each one rewarded. As you follow along, ten thousand golden particles swirl in organic chaos, and at just the right moment, they snap into a perfect glowing grid: a bloom of light, a breath of stillness. The angle is customizable with three presets — light (13°), medium (20°), and deep (30°) — so the experience meets you where you are.

The whole session unfolds with soft ambient sound and subtle visual cues. It's not a workout app. It's closer to a ritual: guided, unhurried, and quietly satisfying.

---

## How I built it

Everything runs locally in the browser — no server, no account, no friction.

The camera watches your face in real time using **MediaPipe** (468 facial landmarks), extracting head roll, yaw, and pitch frame by frame. A custom sequencing system walks you through a series of neck movements in order, tracking how long you hold each position. When you hit the target angle, the particle system responds: ten thousand golden points stop their chaotic dance and snap into a still, glowing grid.

A **ResonanceVortex** and **FluidBackground** layer in additional visual depth, and a soft UnrealBloom effect gives everything that warm, candlelit feeling. Audio — background music, sound effects, and optional voice cues — makes the experience feel complete, not just visual.

My development process matched the app's spirit: slow, deliberate, one step at a time. I tackled one feature per session — get it running first, verify it feels right, then refine. No big rewrites, no chasing multiple things at once. Each small loop closed before the next one opened.

---

## Accomplishments that I'm proud of

Every milestone felt like a small celebration: the first time the particle system ran without crashing, the first time the bloom fired at exactly the right moment, the first time the guided sequence completed end-to-end and it just *felt right*. Going from a rough proof-of-concept to a polished MVP — and then sharing a screen recording with friends and family and hearing *"wow, this is beautiful"* — that meant everything.

I'm also proud that the entire experience runs client-side, with no data leaving the browser. Your face is never stored or transmitted. It's just you and the particles.

---

## What I learned

- **Intention is a design tool.** Knowing *why* something should feel a certain way is just as important as knowing *how* to build it.
- **You don't need to know the technology before you need it.** Starting from a feeling and working backwards toward implementation is a valid — and often powerful — way to build.
- **Small wins compound.** Each closed loop, each working feature, each moment of "it finally looks right" builds momentum that carries the whole project forward.

---

## What's next for ZenNeck

The next version: a **desktop companion** — a lightweight spirit that lives in your taskbar and gently reminds you to tilt your head, no browser required. Because the best reminder is the one you don't have to remember to open.

My parents have been telling me to take care of myself since I was a kid. Now a little app whispers the same thing — just with ten thousand particles and a bloom of gold light.

---

## Getting Started

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

---

## Technical Stack

- **React 19** — UI framework with Hooks
- **Three.js** (v0.160) — 3D rendering engine
- **React Three Fiber** (v8.14) — React bindings for Three.js
- **@react-three/postprocessing** — UnrealBloom & post-processing effects
- **MediaPipe** (v0.10) — Face landmark detection & pose estimation (468 points)
- **Simplex Noise** (v4.0) — Procedural noise for fluid particle dynamics
- **Vite** — Build tool & dev server
- **TypeScript** — Type safety

## Visual Identity

- **Background**: Deep radial gradient from `#001A12` to absolute black with golden particle dust
- **Primary Colors**: 18K gold (`#FFD700`), soft white (`#F5F2EE`), semi-transparent glass effects
- **Effects**: UnrealBloom cinematic glow, fluid particle dynamics, ResonanceVortex overlay
- **Aesthetic**: Minimalist HUD with focus on 3D depth and ethereal motion

## Project Structure

```
src/
├── App.tsx                    # Main state management & sequencing
├── hooks/
│   ├── useSequence.ts         # Guided neck movement sequence logic
│   └── useAudio.ts            # BGM, SFX, voice cue management
├── components/
│   ├── FaceTracker.tsx        # MediaPipe integration (468-point landmarks)
│   ├── FluidBackground.tsx    # Animated background layer
│   ├── MeditationOverlay.tsx  # Hold-progress ring & completion visuals
│   ├── ResonanceVortex.tsx    # Alignment state visual effect
│   ├── PostEffects.tsx        # Bloom & color depth processing
│   └── UI/
│       ├── MinimalUI.tsx      # Main HUD & preset controls
│       └── CustomPanel.tsx    # Settings panel (angle, audio, theme)
├── themes.ts                  # Customizable color themes
├── lang.ts                    # zh / en language strings
└── types.ts                   # Shared TypeScript types
```

## Interaction Flow

1. **Start** — Particles enter CHAOS mode with organic Simplex noise motion
2. **Track** — Camera captures head position and rotation in real-time
3. **Guide** — A sequence of neck movement prompts appears one by one
4. **Hold** — Hold each position at the target angle; a progress ring fills
5. **Bloom** — UnrealBloom burst signals successful hold
6. **Complete** — Full sequence completion triggers a final ripple & clearing effect

## Performance

- GPU-accelerated particle rendering (Points geometry)
- Efficient buffer attribute updates only when needed
- Cached geometries and materials via `useMemo`
- Optimized bloom processing with luminance threshold

## Browser Compatibility

Requires WebGL 2.0, `getUserMedia` API, and ES2020+ support.

Tested on Chrome 90+, Firefox 88+, Safari 15+, Edge 90+.

---

**Privacy**: All face tracking happens locally on your device. No data is ever transmitted or stored.

## License

MIT
