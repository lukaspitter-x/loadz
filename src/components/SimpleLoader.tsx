"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef } from "react";
import type { AnimStyle, BgStyle, CellShape, LoaderColors } from "@/lib/types";
import {
  NODE_EDGES,
  NODE_POSITIONS,
  applyStyle,
  blendColor,
  globalT,
  gridPhaseT,
  makeScatterCells,
  stepNodeGraph,
  stepScatter,
  type ScatterCell,
} from "@/lib/simple-loader/math";
import { type SimplePattern } from "@/lib/simple-loader/patterns";
import {
  ASCII_CYCLE_GLYPHS,
  BANG_DRAW_ORDER,
  CHECK_DRAW_ORDER,
  CROSS_DRAW_ORDER,
  GLYPH_BANG,
  GLYPH_CHECK,
  GLYPH_CROSS,
  sampleGlyph,
} from "@/lib/simple-loader/glyphs";
import { ShapeNode } from "@/lib/simple-loader/shapes";

const SIZE = 12;
const PAD = 1;
const AREA = SIZE - PAD * 2; // 10

export interface SimpleLoaderProps {
  displayText: string;
  grid?: { size: number };
  cellShape?: CellShape;
  cellSizeFactor?: number; // 0.3 .. 1.5, multiplies the grid pitch
  animation?: {
    pattern: SimplePattern;
    style: AnimStyle;
    fps: number;
    backgroundStyle: BgStyle;
  };
  colors: LoaderColors;
  transparentBg?: boolean;
  glow?: { enabled: boolean; size: number; intensity: number };
  shimmer?: { enabled: boolean; speed: number; mode?: TextFxMode };
  paused?: boolean;
  dataId?: string;
}

export type TextFxMode = "shimmer" | "shine" | "gradient" | "cursor";

type GridCell = { r: number; c: number; cx: number; cy: number };

export function SimpleLoader({
  displayText,
  grid = { size: 5 },
  cellShape = "rounded-rect",
  cellSizeFactor = 1,
  animation = { pattern: "wave-diagonal", style: "pulse-size", fps: 24, backgroundStyle: "none" },
  colors,
  transparentBg,
  glow,
  shimmer,
  paused,
  dataId,
}: SimpleLoaderProps) {
  const { pattern } = animation;
  const glowId = `glow-${useId().replace(/:/g, "")}`;
  // Status-glyph patterns always render on a 5×5 grid so the pixel glyphs read correctly.
  const isStatus = pattern === "success" || pattern === "error" || pattern === "warning";
  const effectiveSize = isStatus ? 5 : grid.size;

  const gridCells = useMemo<{ cells: GridCell[]; cellSize: number }>(() => {
    const pitch = AREA / effectiveSize;
    const cells: GridCell[] = [];
    for (let r = 0; r < effectiveSize; r++) {
      for (let c = 0; c < effectiveSize; c++) {
        cells.push({
          r,
          c,
          cx: PAD + (c + 0.5) * pitch,
          cy: PAD + (r + 0.5) * pitch,
        });
      }
    }
    return { cells, cellSize: pitch * cellSizeFactor };
  }, [effectiveSize, cellSizeFactor]);

  const scatterStateRef = useRef<ScatterCell[]>([]);
  const scatterCount = 28;
  const scatterCellSize = 1.2;
  const scatterBound = 1;

  useEffect(() => {
    if (pattern === "scatter") {
      scatterStateRef.current = makeScatterCells(scatterCount, AREA);
    }
  }, [pattern]);

  const shapeRefs = useRef<(SVGGraphicsElement | null)[]>([]);
  const edgeRefs = useRef<(SVGLineElement | null)[]>([]);
  // Start partway into the cycle so status patterns (which hold for ~40 ticks
  // before drawing cells) aren't blank on first paint.
  const tickRef = useRef(30);

  // Paint one frame synchronously on every render that changes config —
  // guarantees paused loaders show a real frame instead of unstyled cells.
  useLayoutEffect(() => {
    stepPattern({
      pattern,
      tick: tickRef.current,
      fps: animation.fps,
      style: animation.style,
      bg: animation.backgroundStyle,
      size: effectiveSize,
      colors,
      cellShape,
      gridCells,
      scatterState: scatterStateRef.current,
      scatterBound,
      refs: { shapes: shapeRefs.current, edges: edgeRefs.current },
    });
  });

  // rAF loop
  useEffect(() => {
    if (paused) return;
    let raf = 0;
    const loop = () => {
      tickRef.current++;
      stepPattern({
        pattern,
        tick: tickRef.current,
        fps: animation.fps,
        style: animation.style,
        bg: animation.backgroundStyle,
        size: effectiveSize,
        colors,
        cellShape,
        gridCells,
        scatterState: scatterStateRef.current,
        scatterBound,
        refs: { shapes: shapeRefs.current, edges: edgeRefs.current },
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pattern, animation.fps, animation.style, animation.backgroundStyle, effectiveSize, gridCells, colors, cellShape, paused]);

  const isOffGrid = pattern === "scatter" || pattern === "node-graph";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: displayText ? 8 : 0,
        font: "500 13px/16px var(--font-geist-sans), system-ui, sans-serif",
        color: colors.text,
      }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        data-loader-id={dataId}
        style={{
          background: transparentBg ? "transparent" : colors.background,
          borderRadius: 2,
          flexShrink: 0,
          display: "block",
          transition: "background 250ms ease",
        }}
      >
        {glow?.enabled && (
          <defs>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={glow.size} result="blur" />
              <feComponentTransfer in="blur" result="boosted">
                <feFuncA type="linear" slope={glow.intensity} />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="boosted" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        )}
        <g filter={glow?.enabled ? `url(#${glowId})` : undefined}>
          {isOffGrid && pattern === "node-graph" && (
            <>
              {NODE_EDGES.map(([a, b], i) => {
                const [ax, ay] = NODE_POSITIONS[a];
                const [bx, by] = NODE_POSITIONS[b];
                return (
                  <line
                    key={`e${i}`}
                    ref={(el) => { edgeRefs.current[i] = el; }}
                    x1={PAD + ax * AREA}
                    y1={PAD + ay * AREA}
                    x2={PAD + bx * AREA}
                    y2={PAD + by * AREA}
                    strokeWidth={0.3}
                  />
                );
              })}
              {NODE_POSITIONS.map(([x, y], i) => (
                <ShapeNode
                  key={`n${i}`}
                  shape={cellShape}
                  cx={PAD + x * AREA}
                  cy={PAD + y * AREA}
                  size={3}
                  nodeRef={(el) => { shapeRefs.current[i] = el; }}
                />
              ))}
            </>
          )}
          {isOffGrid && pattern === "scatter" &&
            Array.from({ length: scatterCount }).map((_, i) => (
              <g
                key={`s${i}`}
                ref={(el) => { shapeRefs.current[i] = el; }}
              >
                <ShapeNode shape={cellShape} cx={PAD} cy={PAD} size={scatterCellSize} />
              </g>
            ))}
          {!isOffGrid &&
            gridCells.cells.map((cell, i) => (
              <ShapeNode
                key={`${cellShape}-${effectiveSize}-${i}`}
                shape={cellShape}
                cx={cell.cx}
                cy={cell.cy}
                size={gridCells.cellSize}
                nodeRef={(el) => { shapeRefs.current[i] = el; }}
              />
            ))}
        </g>
      </svg>
      {displayText && (
        <TextLabel
          text={displayText}
          color={colors.text}
          shimmer={shimmer}
        />
      )}
    </span>
  );
}

// ---------- Label with optional text effects ----------

function TextLabel({
  text,
  color,
  shimmer,
}: {
  text: string;
  color: string;
  shimmer?: { enabled: boolean; speed: number; mode?: TextFxMode };
}) {
  if (!shimmer?.enabled) return <span>{text}</span>;
  const mode = shimmer.mode ?? "shimmer";
  if (mode === "cursor") {
    ensureTextFxKeyframes();
    return (
      <span style={{ color, display: "inline-flex", alignItems: "center", gap: 2 }}>
        <span>{text}</span>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 2,
            height: "0.9em",
            background: color,
            animation: "simple-caret 1.06s step-end infinite",
          }}
        />
      </span>
    );
  }
  return <span style={shimmerStyle(color, shimmer.speed, mode)}>{text}</span>;
}

// ---------- Per-cell pattern evaluation ----------

interface CellOut {
  opacity: number;
  scale: number;
  color?: string;
}

function evalGridPattern(
  pattern: SimplePattern,
  r: number,
  c: number,
  size: number,
  tick: number,
  fps: number,
  t: number,
  primary: string,
  inactive: string,
): CellOut {
  const center = (size - 1) / 2;
  const rate = Math.max(6, Math.min(60, fps)) / 24;

  if (pattern === "orbit") {
    const radius = ((size - 1) / 2) * 0.9;
    const ang = tick * 0.12 * rate;
    const hr = center + Math.sin(ang) * radius;
    const hc = center + Math.cos(ang) * radius;
    const d = Math.hypot(r - hr, c - hc);
    const v = Math.max(0, 1 - d / 1.3);
    return { opacity: 0.12 + v * 0.88, scale: 0.45 + v * 0.55 };
  }
  if (pattern === "ring") {
    const dist = Math.hypot(r - center, c - center);
    const targetDist = (size - 1) / 2 - 0.2;
    const onRing = Math.abs(dist - targetDist) < 0.75;
    if (!onRing) return { opacity: 0.08, scale: 0.3 };
    const cellAng = Math.atan2(r - center, c - center);
    const headAng = tick * 0.12 * rate;
    let delta = ((headAng - cellAng) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const tail = Math.max(0, 1 - delta / (Math.PI * 1.2));
    return { opacity: 0.15 + tail * 0.85, scale: 0.55 + tail * 0.45 };
  }
  if (pattern === "dot-pulse") {
    // 3 dots centered on the middle row
    const midR = Math.round(center);
    if (r !== midR) return { opacity: 0, scale: 0 };
    const step = Math.max(1, Math.floor(size / 3));
    const centerCol = Math.round(center);
    const dotCols = [centerCol - step, centerCol, centerCol + step];
    const idx = dotCols.indexOf(c);
    if (idx < 0) return { opacity: 0, scale: 0 };
    const phase = tick * 0.12 - idx * 0.9;
    const v = (Math.sin(phase) + 1) / 2;
    return { opacity: 0.25 + v * 0.75, scale: 0.45 + v * 0.65 };
  }
  if (pattern === "dot-wave") {
    // Sine-displaced row of dots traveling across
    const midR = Math.round(center);
    const phase = tick * 0.15 * rate - c * 0.65;
    const rowOffset = Math.round(Math.sin(phase) * center * 0.7);
    const activeR = midR + rowOffset;
    if (r === activeR) return { opacity: 1, scale: 1 };
    if (r === midR) return { opacity: 0.12, scale: 0.4 };
    return { opacity: 0, scale: 0 };
  }
  if (pattern === "cardio") {
    // ECG sweep: head moves left-to-right, QRS spike trails behind
    const sweep = (tick * 0.09 * rate) % (size + 2);
    const behind = sweep - c; // <0 = ahead of head, 0 = at head, >0 = passed
    const yAt = (b: number) => {
      if (b < 0 || b > 3) return null;
      if (b < 0.5) return -1;          // R peak (up)
      if (b < 1.3) return 1.3;          // S trough (down)
      if (b < 2) return -0.3;           // small return
      return 0;                          // baseline trail
    };
    const off = yAt(behind);
    const midR = Math.round(center);
    if (off === null) {
      // flat baseline, dim
      return r === midR ? { opacity: 0.1, scale: 0.35 } : { opacity: 0, scale: 0 };
    }
    const targetR = center + off * center * 0.7;
    const d = Math.abs(r - targetR);
    const active = d < 0.7;
    const fade = Math.max(0, 1 - behind / 3);
    return {
      opacity: active ? 0.2 + fade * 0.8 : r === midR ? 0.08 : 0,
      scale: active ? 0.55 + fade * 0.45 : 0.3,
    };
  }
  if (pattern === "waveform") {
    const amp = (Math.sin(tick * 0.18 * rate - c * 0.55) + 1) / 2;
    const halfHeight = amp * (center + 0.3);
    const distFromMid = Math.abs(r - center);
    const active = distFromMid <= halfHeight;
    const edgeT = Math.max(0, 1 - (distFromMid - halfHeight));
    return {
      opacity: active ? 1 : 0.08,
      scale: active ? 0.85 + edgeT * 0.15 : 0.3,
    };
  }
  if (pattern === "ripples") {
    const dist = Math.hypot(r - center, c - center);
    const wave = (Math.sin(tick * 0.15 * rate - dist * 1.4) + 1) / 2;
    return { opacity: 0.15 + wave * 0.85, scale: 0.5 + wave * 0.5 };
  }
  if (pattern === "noise") {
    // Smooth noise: hash at two consecutive seeds and interpolate, so each cell
    // eases between random values instead of snapping. Slower seed advance
    // keeps it fluid rather than jittery.
    const raw = tick * rate * 0.08;
    const seedA = Math.floor(raw);
    const seedB = seedA + 1;
    const frac = raw - seedA;
    const smooth = frac * frac * (3 - 2 * frac); // smoothstep
    const hash = (s: number) => {
      let x = (r * 73856093) ^ (c * 19349663) ^ (s * 83492791);
      x = (x ^ (x >>> 16)) >>> 0;
      x = Math.imul(x, 2246822507) >>> 0;
      x = (x ^ (x >>> 13)) >>> 0;
      x = Math.imul(x, 3266489909) >>> 0;
      x = (x ^ (x >>> 16)) >>> 0;
      return x / 4294967295;
    };
    const v = hash(seedA) * (1 - smooth) + hash(seedB) * smooth;
    return { opacity: 0.05 + v * 0.95, scale: 0.25 + v * 0.75 };
  }
  if (pattern === "ascii-cycle") {
    const glyphIdx = Math.floor(tick / 10) % ASCII_CYCLE_GLYPHS.length;
    const glyph = ASCII_CYCLE_GLYPHS[glyphIdx];
    const sub = (tick / 10) % 1;
    const fadeIn = Math.min(1, sub * 3);
    const active = sampleGlyph(glyph, r, c, size);
    if (!active) return { opacity: 0.05, scale: 0.25 };
    return { opacity: 0.2 + fadeIn * 0.8, scale: 0.5 + fadeIn * 0.5 };
  }
  if (pattern === "success" || pattern === "error" || pattern === "warning") {
    const glyph =
      pattern === "success" ? GLYPH_CHECK :
      pattern === "error" ? GLYPH_CROSS :
      GLYPH_BANG;
    const drawOrder =
      pattern === "success" ? CHECK_DRAW_ORDER :
      pattern === "error" ? CROSS_DRAW_ORDER :
      BANG_DRAW_ORDER;
    // Loop: 40% draw-in, 35% hold, 20% fade-out, 5% pause before restart
    const cycleTicks = Math.max(40, 120 / rate);
    const localT = (tick % cycleTicks) / cycleTicks; // 0..1
    const active = glyph[r]?.[c] === 1;
    if (!active) return { opacity: 0.06, scale: 0.25 };
    // determine per-cell delay in draw-in window (0..0.4)
    const idx = drawOrder.findIndex(([dr, dc]) => dr === r && dc === c);
    const orderIdx = idx < 0 ? drawOrder.length : idx;
    const perCellStart = (orderIdx / Math.max(1, drawOrder.length)) * 0.4;
    const perCellEnd = perCellStart + 0.12;
    let cellT: number;
    if (localT < perCellStart) cellT = 0;
    else if (localT < perCellEnd) cellT = (localT - perCellStart) / 0.12;
    else if (localT < 0.75) cellT = 1;
    else if (localT < 0.95) cellT = 1 - (localT - 0.75) / 0.2;
    else cellT = 0;
    // ease-out-back on the rising edge
    const eased = cellT >= 1 || cellT <= 0
      ? cellT
      : 1 + 2.5 * Math.pow(cellT - 1, 3) + 1.5 * Math.pow(cellT - 1, 2);
    return { opacity: Math.max(0, cellT), scale: Math.max(0, eased) };
  }

  // Fall through to existing grid patterns (wave-diagonal / expanding-pulse / staircase)
  const phaseT = gridPhaseT(pattern, r, c, size, t);
  const s = applyStyle(
    // Only the three original grid patterns pass through here; AnimStyle irrelevant otherwise.
    "pulse-size",
    phaseT,
    primary,
    inactive,
    "none",
    tick,
  );
  return { opacity: s.opacity, scale: s.scale, color: s.fill };
}

// ---------- Animation steppers ----------

interface StepArgs {
  pattern: SimplePattern;
  tick: number;
  fps: number;
  style: AnimStyle;
  bg: BgStyle;
  size: number;
  colors: LoaderColors;
  cellShape: CellShape;
  gridCells: { cells: GridCell[]; cellSize: number };
  scatterState: ScatterCell[];
  scatterBound: number;
  refs: {
    shapes: (SVGGraphicsElement | null)[];
    edges: (SVGLineElement | null)[];
  };
}

function stepPattern(args: StepArgs) {
  const { pattern, tick, fps, colors, refs } = args;

  if (pattern === "node-graph") {
    const { nodes, edges } = stepNodeGraph(tick);
    nodes.forEach((n, i) => {
      const el = refs.shapes[i];
      if (!el) return;
      el.style.transform = `scale(${n.scale})`;
      el.style.opacity = String(n.opacity);
      el.style.fill = colors.primary;
    });
    edges.forEach((alpha, i) => {
      const el = refs.edges[i];
      if (!el) return;
      el.style.stroke = colors.primary;
      el.style.strokeOpacity = String(alpha);
    });
    return;
  }
  if (pattern === "scatter") {
    const positions = stepScatter(args.scatterState, tick, args.scatterBound);
    positions.forEach((p, i) => {
      const el = refs.shapes[i];
      if (!el) return;
      el.setAttribute("transform", `translate(${p.x} ${p.y})`);
      el.style.opacity = String(p.opacity);
      el.style.fill = colors.primary;
    });
    return;
  }

  // All other patterns: grid-based per-cell evaluation.
  const t = globalT(tick, fps);
  const gridOriginal = pattern === "wave-diagonal" || pattern === "expanding-pulse" || pattern === "staircase";
  args.gridCells.cells.forEach((cell, i) => {
    const el = refs.shapes[i];
    if (!el) return;
    let out: CellOut;
    if (gridOriginal) {
      const phaseT = gridPhaseT(pattern, cell.r, cell.c, args.size, t);
      const s = applyStyle(args.style, phaseT, colors.primary, colors.inactiveCells, args.bg, tick);
      out = { opacity: s.opacity, scale: s.scale, color: s.fill };
    } else {
      out = evalGridPattern(pattern, cell.r, cell.c, args.size, tick, fps, t, colors.primary, colors.inactiveCells);
    }
    el.style.transform = `scale(${out.scale})`;
    el.style.opacity = String(out.opacity);
    // For patterns that don't set their own color, blend inactive → primary by activity
    // so the inactiveCells color actually shows on dim/off cells.
    el.style.fill = out.color ?? blendColor(colors.inactiveCells, colors.primary, Math.max(0, Math.min(1, out.opacity)));
  });
}

// ---------- Text effects (shimmer / shine) ----------

function ensureTextFxKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("simple-loader-text-fx-v2")) return;
  // Remove any older version.
  const old = document.getElementById("simple-loader-text-fx");
  if (old) old.remove();
  const el = document.createElement("style");
  el.id = "simple-loader-text-fx-v2";
  el.textContent = `
    @keyframes simple-shimmer {
      0% { background-position: 0% 0; }
      100% { background-position: 100% 0; }
    }
    @keyframes simple-shine {
      0% { background-position: 100% 0; }
      60%, 100% { background-position: 0% 0; }
    }
    @keyframes simple-caret {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
  `;
  document.head.appendChild(el);
}

function shimmerStyle(baseColor: string, speed: number, mode: Exclude<TextFxMode, "cursor">): React.CSSProperties {
  ensureTextFxKeyframes();
  const duration = Math.max(0.4, 2.5 / Math.max(0.2, speed));
  const common: React.CSSProperties = {
    display: "inline-block",
    backgroundSize: "300% 100%",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };
  if (mode === "shine") {
    // dim base + bright pulse. Uses alpha so it works for any text color.
    return {
      ...common,
      backgroundImage: `linear-gradient(100deg,
        ${baseColor}33 0%,
        ${baseColor}33 44%,
        ${baseColor} 50%,
        ${baseColor}33 56%,
        ${baseColor}33 100%)`,
      animation: `simple-shine ${duration * 1.4}s ease-in-out infinite`,
    };
  }
  if (mode === "gradient") {
    // colorful multi-hue sweep (ChatGPT-ish)
    return {
      ...common,
      backgroundImage: `linear-gradient(90deg,
        ${baseColor} 0%,
        #6CB4FF 20%,
        #BD93F9 35%,
        #F5A3C7 50%,
        #BD93F9 65%,
        #6CB4FF 80%,
        ${baseColor} 100%)`,
      animation: `simple-shimmer ${duration * 1.4}s linear infinite`,
    };
  }
  // "shimmer" default — alpha-contrasted wave so it works on white text too
  return {
    ...common,
    backgroundImage: `linear-gradient(90deg,
      ${baseColor}66 0%,
      ${baseColor}66 30%,
      ${baseColor} 50%,
      ${baseColor}66 70%,
      ${baseColor}66 100%)`,
    animation: `simple-shimmer ${duration}s linear infinite`,
  };
}
