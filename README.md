# loadz

**Purpose:** Design and export loader animations paired with a text label.

A single-page sandbox for building tiny loading animations. Configure any combination of pattern, shape, colors, glow, and text effects, stack multiple instances side-by-side, then export each one as React (`.tsx`), SVG, PNG, or a JSON config. All state auto-persists to `localStorage` so loaders survive reloads.

Live: https://loadz.aaxx24.cc

## Features

- **32 animation patterns across 13 groups** — Grid (wave-diagonal, expanding-pulse, staircase), Particle (scatter), Network (node-graph, constellation, network-pulse, molecular), Spinner (orbit, ring), Dots (pulse, wave), Line (cardio, waveform), Radial (ripples), AI (ascii-cycle, noise), Physics (bouncing-ball, pendulum, elastic-bar), Path (spiral, snake, checker), Natural (flame, rain, breath), Tech (progress-bar, scan-line, matrix-rain), Status (success, error, warning)
- **6 cell shapes** — rounded-rect, square, circle, diamond, hexagon, star
- **Per-loader tuning** — grid size 3–8, cell size factor 0.3×–1.5×, FPS 3–60, transparent background, per-color overrides (primary, inactive, background, text)
- **Glow filter** with blur size + intensity
- **Text effects** — shimmer, shine, gradient, blinking cursor
- **Pause/resume** — freeze any loader mid-animation; resume continues instead of restarting
- **Random beautiful config** — generates hand-tuned vibe palettes (cyberpunk, synthwave, minimalist, etc.) with matching glow profiles
- **Export** — React (`.tsx`), SVG (frozen to current frame), PNG (frozen, up to 768px), JSON config
- **Zero runtime dependencies** in exports — the generated React file only imports `react`

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Exporting to your app

1. Configure a loader in the sandbox.
2. Click the download icon on the loader's card (visible on hover, or always when paused).
3. Pick a tab:
   - **React (.tsx)** — a self-contained component with the config baked in as defaults. Drop into any React 18+ app; props override the defaults.
   - **SVG / PNG (frozen)** — captures the current frame. Pause the loader first if you want a specific moment.
   - **JSON** — the raw config, for building your own runtime.

## Tech

Next.js 16 + React 19, Tailwind v4, shadcn/ui primitives. Everything SVG-based. The animation runtime is framework-free math in `src/lib/simple-loader/` driving one `requestAnimationFrame` loop per loader.

## Build for static hosting

```bash
NEXT_OUTPUT=export npm run build
```

Output lands in `out/`. No server needed.

## Deploy to Cloudflare Workers

Wired up via [OpenNext](https://opennext.js.org/cloudflare).

```bash
npm run build:cf     # build with @opennextjs/cloudflare
npm run preview:cf   # preview the worker locally
npm run deploy:cf    # deploy to Cloudflare
```

Worker config lives in `wrangler.jsonc`.

## Project notes

See `AGENTS.md` for the architecture map and guidance for anyone (or any AI) working in this repo — in particular, the React-export template in `src/lib/simple-loader/export/react-template.ts` mirrors `SimpleLoader.tsx` by hand and must stay in sync when the runtime changes.
