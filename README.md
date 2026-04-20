# loader-builder

**Purpose:** Design and export loader animation with text label.

A design tool for tiny **12×12 pixel loading animations paired with a text label**. Build the loader visually in the sandbox, then export the loader + label as a React component, SVG, PNG, or JSON config — drop into any app.

## What it does

A single-page sandbox at `/` lets you stack multiple loader instances, tune every axis (pattern, shape, colors, glow, text effect), pause at any frame, and export the result as portable code or a static graphic. All state auto-persists to localStorage so your loaders survive reloads.

## Features

- **16 animation patterns** across 6 families — grid (wave, pulse, staircase), spinner (orbit, ring), dots (pulse, wave), line (cardio, waveform), radial (ripples), particle (scatter, node-graph), AI-feel (ascii-cycle, noise), plus looping status glyphs (success/error/warning)
- **6 cell shapes** — rounded-rect, square, circle, diamond, hexagon, star
- **Per-loader tuning** — grid size 3–8, cell size factor 0.3×–1.5×, FPS 3–60, transparent background toggle, per-color overrides (primary, inactive, background, text)
- **Glow filter** with blur size + intensity
- **Text effects** — shimmer, shine, gradient, blinking cursor
- **Pause/resume** — freeze any loader mid-animation, resume without restart
- **Export** — React (.tsx), SVG (frozen), PNG (frozen, up to 768px), JSON config
- **Multiple instances** — add as many as you want, cycle configs side-by-side
- **Zero runtime dependencies** in exports — the generated React file only imports `react`

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Exporting to your app

1. Configure a loader in the sandbox.
2. Click the download icon on the loader's card (appears on hover, or stays visible when paused).
3. Pick a tab:
   - **React (.tsx)** — paste into `components/SimpleLoader.tsx` and render `<SimpleLoader />`. Props override the baked-in defaults.
   - **SVG / PNG (frozen)** — captures the current frame. Pause the loader first if you want a specific moment; otherwise it grabs whatever frame is live.
   - **JSON** — the raw config, for anyone building their own runtime.

## Tech

Next.js 16 + React 19. Everything SVG-based. The animation runtime is ~400 lines of framework-free math in `src/lib/simple-loader/` driving one `requestAnimationFrame` loop per loader.

## Build for static hosting

```bash
NEXT_OUTPUT=export npm run build
```

Output lands in `out/`. No server needed.

## Project notes

See `AGENTS.md` for the architecture map and guidance for anyone (or any AI) working in this repo — in particular, the React-export template in `src/lib/simple-loader/export/react-template.ts` mirrors `SimpleLoader.tsx` by hand and needs to stay in sync when the runtime changes.
