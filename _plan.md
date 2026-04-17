# Plan — Loader Builder

## Stack (finalized)

Next.js 15 (app router, TS, Tailwind v4) · PixiJS 8 · pixi-viewport 6 · zustand 5 · react-colorful · shadcn/ui · next-themes · lucide-react · @use-gesture/react (optional, only if needed).

Single `Application` instance. One root `Viewport` child of `app.stage`. Each loader is a `Container` added to the viewport.

## Phases

### Phase 1 — Data
`lib/store.ts` — zustand store, `LoaderConfig` type, 4 default loaders, selected id, theme, mutations.
**Verify:** `console.log` in `page.tsx` shows 4 loaders, selected=`1`.

### Phase 2 — Pixi renderer primitives (no UI yet)
- `lib/pixi/drawCell.ts` — v8 chainable Graphics for all 6 shapes.
- `lib/pixi/tickPulse.ts` — `wave-diagonal` + `expanding-pulse` + `staircase` + `scatter` tick functions operating on an array of cell Graphics.
- `lib/pixi/LoaderContainer.ts` — class extending `Container`: owns its grid, `rebuild(config)`, `applyColors(config)`, `tick(delta)`.
- `lib/pixi/SceneController.ts` — creates `Application`, `Viewport`, dotted TilingSprite background, manages LoaderContainer instances keyed by id, subscribes to zustand.
**Verify:** minimal test page mounts scene, 4 cards visible, pulsing. No console errors.

### Phase 3 — Infinite canvas component
- `components/InfiniteCanvas.tsx` (client, `dynamic({ssr:false})`) — ref div, useEffect that instantiates SceneController, passes theme + subscribes to store changes to call `applyConfig`, resets view on `R` keypress, cleans up on unmount.
- Loader selection: hit-test via Pixi on pointerdown → `selectLoader(id)`.
- Dragging cards: pointer down on card → viewport pause drag → move container → release.
**Verify:** pan, zoom, reset-view work. Click a card → selected state (blue border drawn by Graphics). Drag a card → position updates.

### Phase 4 — Settings panel
- `components/settings/SettingsPanel.tsx` + per-section components.
- Sections: DisplayText, Grid (3–8 ToggleGroup), CellShape (Select), Animation (Pattern/FPS/Style/BgStyle), Builder/Effects/Nodes toggles, Colors (inline `HexColorPicker` expand-in-place), TextShimmer with Speed slider shown on toggle, stub sections (ImageMask, AIGeneration, SVGImport) with toggle only.
- All changes dispatch `updateLoader`. Renderer subscribes and calls `applyConfig`.
**Verify:** change primary color → dots update live; change grid size → grid rebuilds; change cell shape → redraw.

### Phase 5 — Top bar + FAB + theme
- `TopBar`: Reset View label with `⌘R` kbd, Share button (copies encoded URL), Export button (stub → console.log for v1), theme toggle.
- FAB `+` bottom-center: `addLoader`.
- `next-themes` wired. Scene controller reads theme from store and sets viewport bg + dotted pattern color.
**Verify:** theme toggles whole app incl. canvas bg color. FAB adds a new loader at a reasonable grid position.

### Phase 6 — Verify end-to-end
Build, dev server, Playwright snapshot + console check + screenshot + interactions.

## Scope cuts for v1 (to confirm with Lukas)

Implemented: all 4 animation patterns on the grid-cell primitive (wave, pulse, staircase, scatter as cell-animation; node-graph will reuse circles without edges in v1).

Stubbed: Share produces a URL but no backend hydration. Export button no-op. Text Shimmer toggle draws a tint pulse on the label instead of a real shader. Image Mask / AI Generation / SVG Import show toggles but no functionality.

## Verification criteria (checked in Phase 6)

1. Page loads at `http://localhost:3000`, no red console errors.
2. 4 loader cards render with pulsing dot grids.
3. Right panel shows "#4" badge, settings correspond to selected loader.
4. Change Primary color → selected loader's dots change color live.
5. Change Cell Shape to Circle → dots redraw as circles.
6. Change Grid size to 6 → grid rebuilds.
7. Pan (drag canvas bg) and zoom (wheel) work.
8. Press `R` → view resets.
9. Click `+` FAB → 5th loader appears.
10. Theme toggle → canvas bg and panel swap light/dark.
