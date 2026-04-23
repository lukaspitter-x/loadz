# loadz

Tiny loading animations, a text label, and a strong opinion about neon.

A sandbox for designing little SVG-based loaders and shipping them into your app without inheriting someone else's runtime. Everything auto-saves to `localStorage`, so leaving the tab open for three days and coming back to exactly the loader you were fiddling with is officially Supported Behavior™.

Live: https://loadz.aaxx24.cc

## How it works

Three steps. Really.

1. **Hit `+` or "Add"** — spawns a new loader that inherits grid settings from the currently selected one, then rolls dice on a pattern, palette, and glow profile that aren't identical to the last. Spam it until something catches your eye.
2. **Fine-tune in the settings panel** — pattern, cell shape, grid size, FPS, colors, glow, text effect, pause/play, display text. Every tweak is live and persisted immediately.
3. **Export** — click the download button on any card and pick your format:
   - **React (`.tsx`)** — a self-contained component with your config baked in as defaults. Zero project-specific imports (only `react`). Drop it in, render `<SimpleLoader />`, done.
   - **SVG** or **PNG** (frozen) — captures the current frame. Pause the loader first if you want a specific moment; otherwise it grabs whatever was on screen when you clicked.
   - **JSON** — the raw config, for anyone who wants to wire up their own runtime.

That's it. No accounts, no backend, no waitlist, no "book a demo."

## Features, because you're still reading

- **32 animation patterns across 13 groups** — Grid (wave-diagonal, expanding-pulse, staircase), Particle (scatter), Network (node-graph, constellation, network-pulse, molecular), Spinner (orbit, ring), Dots (pulse, wave), Line (cardio, waveform), Radial (ripples), AI (ascii-cycle, noise), Physics (bouncing-ball, pendulum, elastic-bar), Path (spiral, snake, checker), Natural (flame, rain, breath), Tech (progress-bar, scan-line, matrix-rain), Status (success, error, warning).
- **6 cell shapes** — rounded-rect, square, circle, diamond, hexagon, star.
- **Per-loader tuning** — grid size 3–8, cell size factor 0.3×–1.5×, FPS 3–60, transparent background, per-color overrides (primary, inactive, background, text).
- **Glow filter** with blur size + intensity, because sometimes a loader needs to feel like it's plugged in.
- **Text effects** — shimmer, shine, gradient, blinking-cursor typewriter. For when "Loading…" isn't dramatic enough.
- **Pause / resume** — freeze any loader mid-animation. Resume continues from the same frame instead of restarting, so you can take screenshots without chasing the one pretty frame.
- **Random beautiful config** — hand-tuned "vibe" palettes (cyberpunk, synthwave, vaporwave, Y2K, minimalist, juice-pop) each paired with a matching glow profile, because glow is a taste decision.
- **Multiple instances side-by-side** — stack as many as you want and A/B them against each other until you stop second-guessing.
- **Stateless shareable workspace** — the whole app is one static bundle. Nothing to host, nothing to log into.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start clicking `+`.

## Exporting to your app

Click the download icon on a loader's card (visible on hover, always visible when paused). Pick a tab, copy the output, paste it into your codebase. The React export has zero project-specific imports, so it works in any React 18+ app without bringing this repo's conventions with it.

## Tech

Next.js 16 + React 19, Tailwind v4, shadcn/ui primitives, deployed to Cloudflare Workers via OpenNext. Everything is SVG-based — no canvas, no WebGL, no dependencies fighting each other. The animation runtime is framework-free math in `src/lib/simple-loader/` driving one `requestAnimationFrame` loop per loader, wall-clock-gated so speed matches the configured FPS even when your 120 Hz monitor or background tab has opinions.

## Build for static hosting

```bash
NEXT_OUTPUT=export npm run build
```

Output lands in `out/`. Upload anywhere that serves files.

## Deploy to Cloudflare Workers

```bash
npm run build:cf     # build with @opennextjs/cloudflare
npm run preview:cf   # preview the worker locally
npm run deploy:cf    # deploy
```

Worker config lives in `wrangler.jsonc`.

## Contributing, or: I want to add a pattern

See [`AGENTS.md`](./AGENTS.md) for the architecture map and "adding a new pattern" checklist. The important rule: `src/lib/simple-loader/export/react-template.ts` mirrors `SimpleLoader.tsx` by hand, so whenever you change the runtime, change the template too. Future you will thank present you.

## License

MIT. Go wild.
