<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# loader-builder

**Purpose: Design and export loader animation with text label.**

A design tool for a tiny 12×12 pixel loading animation paired with a text label. Configure any combination of patterns, shapes, colors, glow, and text effects, then export the loader + label as React (.tsx), SVG, PNG, or JSON config.

Previously the project contained a PixiJS-based "infinite canvas" builder. That has been removed — everything now lives in one single-file sandbox at `/`, rendered with SVG + a `requestAnimationFrame` loop.

## Architecture

```
src/
├── app/
│   ├── layout.tsx          root layout (Geist fonts)
│   ├── page.tsx            the entire sandbox UI — loader list + settings panel + header
│   └── globals.css         Tailwind v4 theme tokens
├── components/
│   ├── SimpleLoader.tsx    the only loader component; rAF-driven, SVG-based
│   ├── ExportModal.tsx     JSON / React / HTML / SVG / PNG export
│   └── ui/                 shadcn primitives (button, input, select, slider, switch, ...)
└── lib/
    ├── types.ts            CellShape, AnimStyle, BgStyle, LoaderColors
    └── simple-loader/
        ├── math.ts         pure framework-free math (phases, blendColor, scatter, node-graph)
        ├── glyphs.ts       5×5 pixel-art glyphs (check / cross / warning / ascii-cycle set)
        ├── patterns.ts     SimplePattern union + SIMPLE_PATTERNS list + STATUS_DEFAULTS
        ├── shapes.tsx      ShapeNode — renders a CellShape as a single SVG element
        └── export/
            ├── serialize.ts        instanceToConfig, formatJson, buildReactSnippet, buildHtmlSnippet
            └── react-template.ts   large template string for the self-contained .tsx export
```

## SimpleLoader runtime (the core of the app)

Takes a config (pattern, cellShape, colors, glow, shimmer, paused, etc.) and paints a 12×12 SVG with a grid of `ShapeNode` cells. A single `useEffect` runs a `requestAnimationFrame` loop that calls `stepPattern` every frame; `stepPattern` dispatches to either the original grid math (`applyStyle` / `gridPhaseT` from `math.ts`) or `evalGridPattern` (in-file, covers all the new patterns).

Key behaviors to preserve when editing:
- **Paused**: `useLayoutEffect` paints one frame synchronously on every render so paused loaders immediately show content. The rAF loop runs only when not paused. Tick is in a `useRef` so pause→resume continues, not restarts.
- **Inactive color**: when a pattern's cell doesn't return an explicit `color`, fill is `blendColor(inactiveCells, primary, opacity)`.
- **Status patterns** (`success` / `error` / `warning`): force `effectiveSize = 5` regardless of gridSize so the glyph bitmaps read correctly.
- **Off-grid patterns** (`scatter` / `node-graph`): render different element sets; gated by `isOffGrid`.

## Export

Per-instance Download button → `ExportModal` with five tabs:

- **JSON** — pretty-printed `instanceToConfig(instance)`.
- **React (.tsx)** — `react-template.ts` is a string literal containing a complete self-contained component. A `/*__CONFIG_LITERAL__*/` marker is replaced with the instance's JSON. The generated file has zero project-specific imports (only `react`). Keep it in sync manually with `SimpleLoader.tsx` and the modules it inlines.
- **HTML** — placeholder; not implemented yet.
- **SVG (frozen)** — serializes the live DOM, baking CSS transforms into SVG `transform` attributes (because standalone renderers like Figma don't honor `transform-box:fill-box` / `transform-origin:center`), and duplicating any `<g filter=...>` as an unfiltered overlay (because Figma doesn't reliably composite `SourceGraphic` inside an feMerge). Copy or download.
- **PNG (frozen)** — rasterizes the SVG into a `<canvas>` at selectable sizes (48–768px).

## Persistence

All instances + selection are saved to `localStorage["simple-loader-sandbox-v1"]` on every change. Hydration happens in a client-only `useEffect` after mount (not in the `useState` initializer) so SSR/CSR match. Missing fields on loaded instances are backfilled from `makeInstance()` defaults so schema additions don't lose user state.

## Development

```bash
npm run dev          # start dev server on :3000
npx tsc --noEmit     # strict typecheck (no test suite in this repo)
npm run build        # prod build (set NEXT_OUTPUT=export for a static bundle)
```

## When editing `SimpleLoader.tsx`

Also update `src/lib/simple-loader/export/react-template.ts` — the template duplicates the component's runtime verbatim. The export typechecks independently (it imports only `react`), so an easy smoke test is:

```bash
# Substitute a sample config and run tsc against the result
node -e '
const fs = require("fs");
const tmpl = fs.readFileSync("src/lib/simple-loader/export/react-template.ts","utf8");
const m = tmpl.match(/REACT_TEMPLATE = `([\s\S]*)`;\s*$/);
const body = m[1].replace(/\\\$\{/g,"${").replace(/\\`/g,"`").replace("${CONFIG_MARKER}","__CONFIG_LITERAL__");
// ... write to /tmp/_export.tsx with a sample config, then npx tsc on it
'
```
