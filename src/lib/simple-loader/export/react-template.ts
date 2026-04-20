// Keep in sync with src/components/SimpleLoader.tsx and src/lib/simple-loader/{math,glyphs,patterns,shapes}.tsx
// When you touch the runtime, mirror the change in REACT_TEMPLATE below. The __CONFIG__ marker is
// replaced with a JSON literal at export time; otherwise the template is a verbatim self-contained .tsx.

export const CONFIG_MARKER = "__CONFIG_LITERAL__";

export const REACT_TEMPLATE = `// SimpleLoader — generated from loader-builder sandbox.
// Self-contained. Only dependency is react.
// Paste into your project (e.g. components/SimpleLoader.tsx) and import <SimpleLoader />.
"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";

// ---------- Types ----------

export type CellShape =
  | "rounded-rect"
  | "square"
  | "circle"
  | "diamond"
  | "hexagon"
  | "star";

export type AnimStyle = "pulse-size" | "pulse-opacity" | "pulse-color";
export type BgStyle = "breathe" | "none";

export interface LoaderColors {
  primary: string;
  secondary?: string;
  inactiveCells: string;
  background: string;
  text: string;
}

export type SimplePattern =
  | "wave-diagonal"
  | "expanding-pulse"
  | "staircase"
  | "scatter"
  | "node-graph"
  | "orbit"
  | "ring"
  | "dot-pulse"
  | "dot-wave"
  | "cardio"
  | "waveform"
  | "ripples"
  | "ascii-cycle"
  | "noise"
  | "success"
  | "error"
  | "warning";

export type TextFxMode = "shimmer" | "shine" | "gradient" | "cursor";

// ---------- Default config (baked at export time) ----------

export const DEFAULT_CONFIG = ${CONFIG_MARKER} as const;

// ---------- Constants ----------

const SIZE = 12;
const PAD = 1;
const AREA = SIZE - PAD * 2; // 10

// ---------- Math ----------

function clampFps(fps: number) { return Math.max(6, Math.min(60, fps)); }

function globalT(tick: number, fps: number): number {
  return tick * 0.05 * (clampFps(fps) / 24);
}

function gridPhaseT(pattern: SimplePattern, r: number, c: number, size: number, t: number): number {
  const center = (size - 1) / 2;
  if (pattern === "staircase") {
    const step = Math.floor(t * 2) % (size + size - 1);
    return r + c === step ? 1 : 0.15;
  }
  let offset = 0;
  if (pattern === "wave-diagonal") offset = (r + c) * 0.45;
  else if (pattern === "expanding-pulse") {
    offset = Math.sqrt((r - center) ** 2 + (c - center) ** 2) * 0.6;
  }
  const phase = t - offset;
  return (Math.sin(phase) + 1) / 2;
}

interface CellStyle { scale: number; opacity: number; fill: string; }

function applyStyle(
  style: AnimStyle,
  t: number,
  primary: string,
  inactive: string,
  bg: BgStyle,
  tick: number,
): CellStyle {
  const bgT = bg === "breathe" ? 0.15 + Math.sin(tick * 0.03) * 0.05 : 0.15;
  switch (style) {
    case "pulse-size":
      return { scale: 0.35 + t * 0.8, opacity: 0.25 + t * 0.75, fill: primary };
    case "pulse-opacity":
      return { scale: 0.9, opacity: Math.max(bgT, t), fill: primary };
    case "pulse-color":
      return { scale: 0.9, opacity: 1, fill: blendColor(inactive, primary, t) };
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16,
  );
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function blendColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return \`rgb(\${r},\${g},\${bl})\`;
}

interface ScatterCell { baseX: number; baseY: number; vx: number; vy: number; ox: number; oy: number; }

function makeScatterCells(count: number, area: number): ScatterCell[] {
  const out: ScatterCell[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      baseX: Math.random() * area,
      baseY: Math.random() * area,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      ox: 0,
      oy: 0,
    });
  }
  return out;
}

function stepScatter(cells: ScatterCell[], tick: number, bound: number) {
  return cells.map((cell) => {
    cell.ox += cell.vx;
    cell.oy += cell.vy;
    if (Math.abs(cell.ox) > bound) cell.vx = -cell.vx;
    if (Math.abs(cell.oy) > bound) cell.vy = -cell.vy;
    const pulse = (Math.sin(tick * 0.05 + cell.baseX * 0.02) + 1) / 2;
    return { x: cell.baseX + cell.ox, y: cell.baseY + cell.oy, opacity: 0.3 + pulse * 0.7 };
  });
}

const NODE_POSITIONS: [number, number][] = [
  [0.5, 0.12],
  [0.12, 0.88],
  [0.88, 0.88],
  [0.5, 0.52],
];

const NODE_EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
];

function stepNodeGraph(tick: number) {
  const t = tick * 0.04;
  const nodes = NODE_POSITIONS.map((_, i) => {
    const pulse = (Math.sin(t - i * 0.5) + 1) / 2;
    return { scale: 0.7 + pulse * 0.6, opacity: 0.5 + pulse * 0.5 };
  });
  const edges = NODE_EDGES.map(
    (_, i) => 0.15 + ((Math.sin(t * 1.4 - i * 0.9) + 1) / 2) * 0.7,
  );
  return { nodes, edges };
}

// ---------- Glyphs ----------

type Glyph5 = number[][];

const GLYPH_CHECK: Glyph5 = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1],
  [0, 0, 0, 1, 0],
  [1, 0, 1, 0, 0],
  [0, 1, 0, 0, 0],
];
const GLYPH_CROSS: Glyph5 = [
  [1, 0, 0, 0, 1],
  [0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 1, 0, 1, 0],
  [1, 0, 0, 0, 1],
];
const GLYPH_BANG: Glyph5 = [
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0],
];
const GLYPH_DOT: Glyph5 = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];
const GLYPH_PLUS: Glyph5 = [
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [1, 1, 1, 1, 1],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
];
const GLYPH_X: Glyph5 = [
  [1, 0, 0, 0, 1],
  [0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 1, 0, 1, 0],
  [1, 0, 0, 0, 1],
];
const GLYPH_STAR: Glyph5 = [
  [1, 0, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0],
  [1, 0, 1, 0, 1],
];
const GLYPH_ASTERISK8: Glyph5 = [
  [0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0],
  [1, 1, 1, 1, 1],
  [0, 0, 1, 0, 0],
  [0, 1, 0, 1, 0],
];
const GLYPH_CIRCLE: Glyph5 = [
  [0, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0],
];
const ASCII_CYCLE_GLYPHS: Glyph5[] = [GLYPH_DOT, GLYPH_PLUS, GLYPH_X, GLYPH_STAR, GLYPH_ASTERISK8, GLYPH_CIRCLE];

const CHECK_DRAW_ORDER: [number, number][] = [[3, 0], [4, 1], [3, 2], [2, 3], [1, 4]];
const CROSS_DRAW_ORDER: [number, number][] = [
  [0, 0], [1, 1], [2, 2], [3, 3], [4, 4],
  [0, 4], [1, 3], [3, 1], [4, 0],
];
const BANG_DRAW_ORDER: [number, number][] = [[0, 2], [1, 2], [2, 2], [4, 2]];

function sampleGlyph(glyph: Glyph5, r: number, c: number, size: number): boolean {
  const gr = Math.min(4, Math.max(0, Math.floor((r / (size - 1)) * 4 + 0.0001)));
  const gc = Math.min(4, Math.max(0, Math.floor((c / (size - 1)) * 4 + 0.0001)));
  return glyph[gr][gc] === 1;
}

// ---------- ShapeNode ----------

function ShapeNode({
  shape, cx, cy, size, style, nodeRef,
}: {
  shape: CellShape;
  cx: number;
  cy: number;
  size: number;
  style?: CSSProperties;
  nodeRef?: (el: SVGGraphicsElement | null) => void;
}) {
  const s = size;
  const commonStyle: CSSProperties = {
    transformBox: "fill-box",
    transformOrigin: "center",
    ...style,
  };
  if (shape === "circle") {
    return <circle ref={nodeRef as (el: SVGCircleElement | null) => void} cx={cx} cy={cy} r={s / 2} style={commonStyle} />;
  }
  if (shape === "square" || shape === "rounded-rect") {
    return (
      <rect
        ref={nodeRef as (el: SVGRectElement | null) => void}
        x={cx - s / 2}
        y={cy - s / 2}
        width={s}
        height={s}
        rx={shape === "rounded-rect" ? s * 0.25 : 0}
        style={commonStyle}
      />
    );
  }
  const points = polyPoints(shape, cx, cy, s);
  return <polygon ref={nodeRef as (el: SVGPolygonElement | null) => void} points={points} style={commonStyle} />;
}

function polyPoints(shape: CellShape, cx: number, cy: number, s: number): string {
  const r = s / 2;
  if (shape === "diamond") {
    return [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]]
      .map((p) => p.join(",")).join(" ");
  }
  if (shape === "hexagon") {
    const pts: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts.map((p) => p.join(",")).join(" ");
  }
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts.map((p) => p.join(",")).join(" ");
}

// ---------- Per-cell pattern evaluation ----------

interface CellOut { opacity: number; scale: number; color?: string; }

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
  const rate = clampFps(fps) / 24;

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
    const delta = ((headAng - cellAng) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const tail = Math.max(0, 1 - delta / (Math.PI * 1.2));
    return { opacity: 0.15 + tail * 0.85, scale: 0.55 + tail * 0.45 };
  }
  if (pattern === "dot-pulse") {
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
    const midR = Math.round(center);
    const phase = tick * 0.15 * rate - c * 0.65;
    const rowOffset = Math.round(Math.sin(phase) * center * 0.7);
    const activeR = midR + rowOffset;
    if (r === activeR) return { opacity: 1, scale: 1 };
    if (r === midR) return { opacity: 0.12, scale: 0.4 };
    return { opacity: 0, scale: 0 };
  }
  if (pattern === "cardio") {
    const sweep = (tick * 0.09 * rate) % (size + 2);
    const behind = sweep - c;
    const yAt = (b: number) => {
      if (b < 0 || b > 3) return null;
      if (b < 0.5) return -1;
      if (b < 1.3) return 1.3;
      if (b < 2) return -0.3;
      return 0;
    };
    const off = yAt(behind);
    const midR = Math.round(center);
    if (off === null) {
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
    const raw = tick * rate * 0.08;
    const seedA = Math.floor(raw);
    const seedB = seedA + 1;
    const frac = raw - seedA;
    const smooth = frac * frac * (3 - 2 * frac);
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
    const cycleTicks = Math.max(40, 120 / rate);
    const localT = (tick % cycleTicks) / cycleTicks;
    const active = glyph[r]?.[c] === 1;
    if (!active) return { opacity: 0.06, scale: 0.25 };
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
    const eased = cellT >= 1 || cellT <= 0
      ? cellT
      : 1 + 2.5 * Math.pow(cellT - 1, 3) + 1.5 * Math.pow(cellT - 1, 2);
    return { opacity: Math.max(0, cellT), scale: Math.max(0, eased) };
  }

  const phaseT = gridPhaseT(pattern, r, c, size, t);
  const s = applyStyle("pulse-size", phaseT, primary, inactive, "none", tick);
  return { opacity: s.opacity, scale: s.scale, color: s.fill };
}

// ---------- Text effects ----------

function ensureTextFxKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("simple-loader-text-fx-v2")) return;
  const el = document.createElement("style");
  el.id = "simple-loader-text-fx-v2";
  el.textContent = \`
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
  \`;
  document.head.appendChild(el);
}

function shimmerStyle(baseColor: string, speed: number, mode: Exclude<TextFxMode, "cursor">): CSSProperties {
  ensureTextFxKeyframes();
  const duration = Math.max(0.4, 2.5 / Math.max(0.2, speed));
  const common: CSSProperties = {
    display: "inline-block",
    backgroundSize: "300% 100%",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
  };
  if (mode === "shine") {
    return {
      ...common,
      backgroundImage: \`linear-gradient(100deg,
        \${baseColor}33 0%,
        \${baseColor}33 44%,
        \${baseColor} 50%,
        \${baseColor}33 56%,
        \${baseColor}33 100%)\`,
      animation: \`simple-shine \${duration * 1.4}s ease-in-out infinite\`,
    };
  }
  if (mode === "gradient") {
    return {
      ...common,
      backgroundImage: \`linear-gradient(90deg,
        \${baseColor} 0%,
        #6CB4FF 20%,
        #BD93F9 35%,
        #F5A3C7 50%,
        #BD93F9 65%,
        #6CB4FF 80%,
        \${baseColor} 100%)\`,
      animation: \`simple-shimmer \${duration * 1.4}s linear infinite\`,
    };
  }
  return {
    ...common,
    backgroundImage: \`linear-gradient(90deg,
      \${baseColor}66 0%,
      \${baseColor}66 30%,
      \${baseColor} 50%,
      \${baseColor}66 70%,
      \${baseColor}66 100%)\`,
    animation: \`simple-shimmer \${duration}s linear infinite\`,
  };
}

function TextLabel({
  text, color, shimmer,
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

// ---------- Main component ----------

export interface SimpleLoaderProps {
  displayText: string;
  grid?: { size: number };
  cellShape?: CellShape;
  cellSizeFactor?: number;
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
}

type GridCell = { r: number; c: number; cx: number; cy: number };

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
      el.style.transform = \`scale(\${n.scale})\`;
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
      el.setAttribute("transform", \`translate(\${p.x} \${p.y})\`);
      el.style.opacity = String(p.opacity);
      el.style.fill = colors.primary;
    });
    return;
  }

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
    el.style.transform = \`scale(\${out.scale})\`;
    el.style.opacity = String(out.opacity);
    el.style.fill = out.color ?? blendColor(colors.inactiveCells, colors.primary, Math.max(0, Math.min(1, out.opacity)));
  });
}

export function SimpleLoader({
  displayText = DEFAULT_CONFIG.displayText,
  grid = DEFAULT_CONFIG.grid,
  cellShape = DEFAULT_CONFIG.cellShape as CellShape,
  cellSizeFactor = DEFAULT_CONFIG.cellSizeFactor,
  animation = DEFAULT_CONFIG.animation as SimpleLoaderProps["animation"],
  colors = DEFAULT_CONFIG.colors,
  transparentBg = DEFAULT_CONFIG.transparentBg,
  glow = DEFAULT_CONFIG.glow,
  shimmer = DEFAULT_CONFIG.shimmer as SimpleLoaderProps["shimmer"],
}: Partial<SimpleLoaderProps> = {}) {
  const anim = animation!;
  const { pattern } = anim;
  const glowId = \`glow-\${useId().replace(/:/g, "")}\`;
  const isStatus = pattern === "success" || pattern === "error" || pattern === "warning";
  const effectiveSize = isStatus ? 5 : grid!.size;

  const gridCells = useMemo<{ cells: GridCell[]; cellSize: number }>(() => {
    const pitch = AREA / effectiveSize;
    const cells: GridCell[] = [];
    for (let r = 0; r < effectiveSize; r++) {
      for (let c = 0; c < effectiveSize; c++) {
        cells.push({
          r, c,
          cx: PAD + (c + 0.5) * pitch,
          cy: PAD + (r + 0.5) * pitch,
        });
      }
    }
    return { cells, cellSize: pitch * (cellSizeFactor ?? 1) };
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
  const tickRef = useRef(30);

  // Paint one frame synchronously so static / paused loaders show content.
  useLayoutEffect(() => {
    stepPattern({
      pattern,
      tick: tickRef.current,
      fps: anim.fps,
      style: anim.style,
      bg: anim.backgroundStyle,
      size: effectiveSize,
      colors: colors!,
      cellShape: cellShape!,
      gridCells,
      scatterState: scatterStateRef.current,
      scatterBound,
      refs: { shapes: shapeRefs.current, edges: edgeRefs.current },
    });
  });

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      tickRef.current++;
      stepPattern({
        pattern,
        tick: tickRef.current,
        fps: anim.fps,
        style: anim.style,
        bg: anim.backgroundStyle,
        size: effectiveSize,
        colors: colors!,
        cellShape: cellShape!,
        gridCells,
        scatterState: scatterStateRef.current,
        scatterBound,
        refs: { shapes: shapeRefs.current, edges: edgeRefs.current },
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pattern, anim.fps, anim.style, anim.backgroundStyle, effectiveSize, gridCells, colors, cellShape]);

  const isOffGrid = pattern === "scatter" || pattern === "node-graph";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: displayText ? 8 : 0,
        font: "500 13px/16px system-ui, -apple-system, sans-serif",
        color: colors!.text,
      }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={\`0 0 \${SIZE} \${SIZE}\`}
        style={{
          background: transparentBg ? "transparent" : colors!.background,
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
        <g filter={glow?.enabled ? \`url(#\${glowId})\` : undefined}>
          {isOffGrid && pattern === "node-graph" && (
            <>
              {NODE_EDGES.map(([a, b], i) => {
                const [ax, ay] = NODE_POSITIONS[a];
                const [bx, by] = NODE_POSITIONS[b];
                return (
                  <line
                    key={\`e\${i}\`}
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
                  key={\`n\${i}\`}
                  shape={cellShape!}
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
                key={\`s\${i}\`}
                ref={(el) => { shapeRefs.current[i] = el; }}
              >
                <ShapeNode shape={cellShape!} cx={PAD} cy={PAD} size={scatterCellSize} />
              </g>
            ))}
          {!isOffGrid &&
            gridCells.cells.map((cell, i) => (
              <ShapeNode
                key={\`\${cellShape}-\${effectiveSize}-\${i}\`}
                shape={cellShape!}
                cx={cell.cx}
                cy={cell.cy}
                size={gridCells.cellSize}
                nodeRef={(el) => { shapeRefs.current[i] = el; }}
              />
            ))}
        </g>
      </svg>
      {displayText && (
        <TextLabel text={displayText} color={colors!.text} shimmer={shimmer} />
      )}
    </span>
  );
}

// ---------- Usage ----------
// <SimpleLoader />                              // uses baked-in defaults
// <SimpleLoader displayText="Saving..." />      // override any prop
`;
