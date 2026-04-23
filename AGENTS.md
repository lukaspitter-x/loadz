<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# loadz

**Purpose: Design and export loader animations paired with a text label.**

A single-page sandbox for tiny loading animations, rendered with SVG and a `requestAnimationFrame` loop. Configure pattern, shape, colors, glow, and text effects; export as React (`.tsx`), SVG, PNG, or JSON.

## Architecture

```
src/
├── app/
│   ├── layout.tsx          root layout (Geist fonts)
│   ├── page.tsx            the entire sandbox UI — loader list + settings panel + header
│   ├── globals.css         Tailwind v4 theme tokens
│   └── icon.svg            favicon
├── components/
│   ├── SimpleLoader.tsx    the only loader component; rAF-driven, SVG-based
│   ├── ExportModal.tsx     JSON / React / HTML / SVG / PNG export
│   └── ui/                 shadcn primitives (button, input, select, slider, switch, ...)
└── lib/
    ├── types.ts            CellShape, AnimStyle, LoaderColors (+ CELL_SHAPES, STYLES)
    ├── utils.ts            cn() helper
    └── simple-loader/
        ├── math.ts         pure framework-free math (phases, blendColor, scatter, node-graph)
        ├── glyphs.ts       5×5 pixel-art glyphs (check / cross / warning / ascii-cycle set)
        ├── patterns.ts     SimplePattern union + SIMPLE_PATTERNS list + STATUS_DEFAULTS
        ├── shapes.tsx      ShapeNode — renders a CellShape as a single SVG element
        └── export/
            ├── serialize.ts        instanceToConfig, formatJson, buildReactSnippet, buildHtmlSnippet
            └── react-template.ts   large template string for the self-contained .tsx export
```

Single-file-ish on purpose: `src/app/page.tsx` owns the `Instance` shape, seeding, palette library, random-beautiful-config generator, persistence, and the settings UI. There is no global store.

## SimpleLoader runtime (the core of the app)

Takes a config (pattern, cellShape, colors, glow, shimmer, paused, etc.) and paints an SVG grid of `ShapeNode` cells. A single `useEffect` runs a `requestAnimationFrame` loop that calls `stepPattern` every frame; `stepPattern` dispatches to either the original grid math (`applyStyle` / `gridPhaseT` from `math.ts`) or `evalGridPattern` (in-file, covers all the newer patterns).

Key behaviors to preserve when editing:
- **Paused**: `useLayoutEffect` paints one frame synchronously on every render so paused loaders immediately show content. The rAF loop runs only when not paused. Tick is in a `useRef` so pause→resume continues, not restarts.
- **Inactive color**: when a pattern's cell doesn't return an explicit `color`, fill is `blendColor(inactiveCells, primary, opacity)`.
- **Status patterns** (`success` / `error` / `warning`): force `effectiveSize = 5` regardless of gridSize so the glyph bitmaps from `glyphs.ts` read correctly.
- **Off-grid patterns** (`scatter` / `node-graph`): render different element sets; gated by `isOffGrid`.

## Export

Per-instance Download button → `ExportModal` with five tabs:

- **JSON** — pretty-printed `instanceToConfig(instance)`.
- **React (.tsx)** — `react-template.ts` is a string literal containing a complete self-contained component. A `/*__CONFIG_LITERAL__*/` marker is replaced with the instance's JSON. The generated file has zero project-specific imports (only `react`). Keep it in sync manually with `SimpleLoader.tsx` and the modules it inlines.
- **HTML** — placeholder; not implemented yet (the tab shows a hint to use the React export instead).
- **SVG (frozen)** — serializes the live DOM, baking CSS transforms into SVG `transform` attributes (because standalone renderers like Figma don't honor `transform-box:fill-box` / `transform-origin:center`), and duplicating any `<g filter=...>` as an unfiltered overlay (because Figma doesn't reliably composite `SourceGraphic` inside an feMerge). Copy or download.
- **PNG (frozen)** — rasterizes the SVG into a `<canvas>` at selectable sizes (48–768px).

## Persistence

All instances + selection are saved to `localStorage["simple-loader-sandbox-v1"]` on every change. Hydration happens in a client-only `useEffect` after mount (not in the `useState` initializer) so SSR/CSR match. Missing fields on loaded instances are backfilled from `makeInstance()` defaults so schema additions don't lose user state.

## Development

```bash
npm run dev          # start dev server on :3000
npx tsc --noEmit     # strict typecheck (no test suite in this repo)
npm run build        # prod build (set NEXT_OUTPUT=export for a static bundle)
npm run deploy:cf    # deploy to Cloudflare Workers via OpenNext (config in wrangler.jsonc)
```

Production deploy: https://loadz.aaxx24.cc

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

## Adding a new pattern

1. Add the literal to the `SimplePattern` union in `src/lib/simple-loader/patterns.ts`.
2. Add an entry to `SIMPLE_PATTERNS` with a `group` (the picker groups by this).
3. Implement the per-cell logic in `evalGridPattern` inside `src/components/SimpleLoader.tsx` (or the legacy `gridPhaseT` path if it's a grid variant).
4. Mirror the same change into `src/lib/simple-loader/export/react-template.ts` so exports keep working.
5. If the pattern needs off-grid elements (like `scatter`/`node-graph`), extend the `isOffGrid` branch.
