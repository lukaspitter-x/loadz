# Research — AI Loader Builder (April 2026)

## Stack verdicts

- **PixiJS**: v8.15.0 current. `new Application()` then **`await app.init({...})`**. Attach `app.canvas` (not `app.view` — that was v7). Cleanup with `app.destroy(true, { children: true, texture: true })`. Strict-mode double-mount: use `let cancelled=false` flag inside `useEffect`.
- **pixi-viewport**: v6.x compatible with Pixi v8. `import { Viewport } from 'pixi-viewport'`. `new Viewport({ events: app.renderer.events, ... })`. Add as child of `app.stage`.
- **@pixi/react**: skip. Raw Pixi + one ref-based component is simpler here; the analysis' architecture is raw-Pixi.
- **Next.js 15 + React 19**: works. PixiJS must be client-only. Use `"use client"` + `dynamic(() => import('./InfiniteCanvas'), { ssr: false })`.
- **Tailwind v4**: `create-next-app --tailwind` now installs v4 by default. CSS-first config via `@theme` in `globals.css`, not `tailwind.config.ts`.
- **shadcn/ui**: `npx shadcn@latest init` works with Tailwind v4 + React 19. No more `forwardRef` wrappers; `data-slot` attributes for styling.
- **react-colorful**: still ~the smallest picker (~2.8KB). Keep as specced.
- **zustand**: v5, fine.

## Disagreements with hint

- Hint snippets use `new Application({...})` with options in the constructor — that's **v7 API**. Must switch to `new Application(); await app.init({...})`.
- Hint uses `container.appendChild(app.view)` — v8 renamed it `app.canvas`.
- Hint's `g.beginFill()` / `g.endFill()` is v7 Graphics. **v8 uses chainable `g.rect(...).fill({color, alpha})`** and similar (`.circle().fill()`, `.roundRect().fill()`, `.poly().fill()`).

## Risks

- **Pixi v8 Graphics API change**: rewrite `drawCell` with new chainable API.
- **Async init + React strict-mode double mount**: canvas gets appended twice if not guarded. Standard `cancelled` flag fix.
- **Many Application instances** (one per loader card): causes GPU context overflow past ~16 cards. Use a **single Application with a Viewport containing multiple loader Containers**, not one Application per card. The analysis mentioned this but the code hint had a PixiLoaderRenderer class per card — wrong for this use case.
- **Tailwind v4 theme variables for dark mode**: use shadcn's template `@custom-variant dark` or `next-themes` with `class` strategy.
- **pixi-viewport events**: pass `events: app.renderer.events` not the old `interaction` manager.
