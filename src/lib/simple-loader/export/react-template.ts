// Keep in sync with src/components/SimpleLoader.tsx and src/lib/simple-loader/{math,glyphs,patterns,shapes}.tsx
// When you touch the runtime, mirror the change in REACT_TEMPLATE below. The __CONFIG__ marker is
// replaced with a JSON literal at export time; otherwise the template is a verbatim self-contained .tsx.

export const CONFIG_MARKER = "__CONFIG_LITERAL__";

export const REACT_TEMPLATE = `// SimpleLoader — generated from loader-builder sandbox.
// Self-contained. Only dependency is react.
// Paste into your project (e.g. components/SimpleLoader.tsx) and import <SimpleLoader />.
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

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
  | "constellation"
  | "network-pulse"
  | "molecular"
  | "orbit"
  | "ring"
  | "dot-pulse"
  | "dot-wave"
  | "cardio"
  | "waveform"
  | "ripples"
  | "ascii-cycle"
  | "noise"
  | "bouncing-ball"
  | "pendulum"
  | "elastic-bar"
  | "spiral"
  | "snake"
  | "checker"
  | "flame"
  | "rain"
  | "breath"
  | "progress-bar"
  | "scan-line"
  | "matrix-rain"
  | "success"
  | "error"
  | "warning";

export type TextFxMode = "shimmer" | "shine" | "gradient" | "cursor";

// ---------- Default config (baked at export time) ----------

export const DEFAULT_CONFIG = ${CONFIG_MARKER} as const;

// ---------- Constants ----------

const DEFAULT_SIZE = 12;
const DEFAULT_PAD = 1;

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

function stepNodeGraph(tick: number, area: number) {
  const t = tick * 0.04;
  const driftA = area * 0.05;
  const driftB = area * 0.07;
  const nodes = NODE_POSITIONS.map(([bx, by], i) => {
    const base = { x: bx * area, y: by * area };
    const ph = t * 0.8 + i * 1.3;
    const x = base.x + Math.cos(ph) * driftA;
    const y = base.y + Math.sin(ph * 0.7 + i * 0.5) * driftB;
    const pulse = (Math.sin(t - i * 0.5) + 1) / 2;
    return { x, y, scale: 0.7 + pulse * 0.6, opacity: 0.5 + pulse * 0.5 };
  });
  const edges = NODE_EDGES.map(
    (_, i) => 0.15 + ((Math.sin(t * 1.4 - i * 0.9) + 1) / 2) * 0.7,
  );
  return { nodes, edges };
}

// ---------- Constellation / Network Pulse / Molecular ----------

interface ConstellationNode { x: number; y: number; vx: number; vy: number; }
const CONSTELLATION_COUNT = 6;
function makeConstellation(area: number): ConstellationNode[] {
  const out: ConstellationNode[] = [];
  for (let i = 0; i < CONSTELLATION_COUNT; i++) {
    out.push({
      x: Math.random() * area,
      y: Math.random() * area,
      vx: (Math.random() - 0.5) * area * 0.04,
      vy: (Math.random() - 0.5) * area * 0.04,
    });
  }
  return out;
}
function stepConstellation(nodes: ConstellationNode[], area: number) {
  nodes.forEach((n) => {
    n.x += n.vx; n.y += n.vy;
    if (n.x < 0 || n.x > area) { n.vx = -n.vx; n.x = Math.max(0, Math.min(area, n.x)); }
    if (n.y < 0 || n.y > area) { n.vy = -n.vy; n.y = Math.max(0, Math.min(area, n.y)); }
  });
  const threshold = area * 0.55;
  const edges: { a: number; b: number; alpha: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      const alpha = d < threshold ? Math.pow(1 - d / threshold, 1.3) : 0;
      edges.push({ a: i, b: j, alpha });
    }
  }
  return { positions: nodes.map((n) => ({ x: n.x, y: n.y })), edges };
}

const PULSE_NODE_COUNT = 8;
function pulseNodePositions(area: number) {
  const cx = area / 2; const cy = area / 2; const r = area * 0.42;
  const out = [];
  for (let i = 0; i < PULSE_NODE_COUNT; i++) {
    const a = (i / PULSE_NODE_COUNT) * Math.PI * 2 - Math.PI / 2;
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return out;
}
function stepNetworkPulse(tick: number) {
  const count = PULSE_NODE_COUNT;
  const packet = (tick * 0.06) % count;
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const diff = Math.abs(((packet - i + count / 2) % count) - count / 2);
    const nearness = Math.max(0, 1 - diff / 1.4);
    nodes.push({ scale: 0.6 + nearness * 0.6, opacity: 0.25 + nearness * 0.75 });
  }
  const edges = [];
  for (let i = 0; i < count; i++) {
    const mid = i + 0.5;
    const diff = Math.abs(((packet - mid + count / 2) % count) - count / 2);
    const alpha = Math.max(0, 1 - diff / 0.8);
    edges.push(0.1 + alpha * 0.9);
  }
  return { nodes, edges };
}

const MOLECULAR_SATELLITES = 3;
function stepMolecular(tick: number, area: number) {
  const cx = area / 2; const cy = area / 2; const t = tick * 0.05;
  const radii = [area * 0.2, area * 0.33, area * 0.45];
  const speeds = [1.1, -0.75, 0.5];
  const phases = [0, 2.1, 4.3];
  const satellites = [];
  for (let i = 0; i < MOLECULAR_SATELLITES; i++) {
    const a = t * speeds[i] + phases[i];
    const x = cx + Math.cos(a) * radii[i];
    const y = cy + Math.sin(a) * radii[i];
    const pulse = (Math.sin(t * 1.3 - i * 0.9) + 1) / 2;
    satellites.push({ x, y, scale: 0.7 + pulse * 0.4, opacity: 0.55 + pulse * 0.45 });
  }
  const centerPulse = (Math.sin(t * 2) + 1) / 2;
  return {
    center: { x: cx, y: cy, scale: 0.85 + centerPulse * 0.25, opacity: 0.7 + centerPulse * 0.3 },
    satellites,
  };
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
  if (shape === "circle") {
    return <circle ref={nodeRef as (el: SVGCircleElement | null) => void} cx={cx} cy={cy} r={s / 2} style={style} />;
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
        style={style}
      />
    );
  }
  const points = polyPoints(shape, cx, cy, s);
  return <polygon ref={nodeRef as (el: SVGPolygonElement | null) => void} points={points} style={style} />;
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
    const sweep = (tick * 0.1 * rate) % (size + 3);
    const dx = sweep - c;
    const midR = Math.round(center);
    const amp = center * 0.95;
    const qrsAt = (b: number): number | null => {
      if (b < -0.3 || b > 4) return null;
      if (b < 0.2) return 0;
      if (b < 0.75) return -amp;
      if (b < 1.5) return amp;
      if (b < 2.2) return -amp * 0.35;
      return 0;
    };
    const off = qrsAt(dx);
    if (off === null) {
      return r === midR ? { opacity: 0.06, scale: 0.25 } : { opacity: 0, scale: 0 };
    }
    const targetR = center + off;
    const d = Math.abs(r - targetR);
    const age = Math.max(0, Math.min(1, dx / 3.5));
    const fade = 1 - age;
    const atHead = dx > -0.3 && dx < 0.4;
    if (d < 1.2) {
      const edgeT = Math.max(0, 1 - d * 0.9);
      if (atHead) {
        return { opacity: 0.9 + edgeT * 0.1, scale: 0.95 + edgeT * 0.25 };
      }
      return { opacity: 0.25 + fade * 0.7 * edgeT, scale: 0.45 + fade * 0.55 };
    }
    if (r === midR) {
      return { opacity: 0.1 + fade * 0.12, scale: 0.3 };
    }
    return { opacity: 0, scale: 0 };
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
  if (pattern === "bouncing-ball") {
    const midC = Math.round(center);
    const t = tick * 0.12 * rate;
    const h = Math.abs(Math.sin(t));
    const ballR = (size - 1) * (1 - h);
    const d = Math.abs(r - ballR);
    const onBall = c === midC && d < 0.9;
    const squash = h < 0.15 ? (1 - h / 0.15) : 0;
    if (r === size - 1 && Math.abs(c - midC) < 1 + squash * 1.5 && squash > 0.1) {
      return { opacity: 0.4 + squash * 0.6, scale: 0.6 + squash * 0.4 };
    }
    if (onBall) return { opacity: 1, scale: 1 };
    if (r === size - 1 && c === midC) return { opacity: 0.15, scale: 0.4 };
    return { opacity: 0, scale: 0 };
  }
  if (pattern === "pendulum") {
    const midR = Math.round(center);
    const t = tick * 0.1 * rate;
    const swing = Math.sin(t);
    const ballC = center + swing * center * 0.9;
    const ballCi = Math.round(ballC);
    const arcY = Math.abs(swing);
    const ballR = Math.round(midR + arcY * center * 0.3);
    if (r === ballR && c === ballCi) return { opacity: 1, scale: 1 };
    if (c === Math.round(center) && r < ballR && r <= midR) return { opacity: 0.12, scale: 0.3 };
    return { opacity: 0, scale: 0 };
  }
  if (pattern === "elastic-bar") {
    const midR = Math.round(center);
    if (r !== midR) return { opacity: 0, scale: 0 };
    const t = tick * 0.08 * rate;
    const raw = Math.sin(t);
    const stretch = raw * raw;
    const halfWidth = 0.6 + stretch * center * 0.95;
    const d = Math.abs(c - center);
    if (d < halfWidth) {
      const edgeT = Math.max(0, 1 - d / halfWidth);
      return { opacity: 0.3 + edgeT * 0.7, scale: 0.6 + edgeT * 0.4 };
    }
    return { opacity: 0, scale: 0 };
  }
  if (pattern === "spiral") {
    const cellAngle = Math.atan2(r - center, c - center);
    const dist = Math.hypot(r - center, c - center);
    const maxDist = Math.hypot(center, center);
    const orderIdx = dist + (cellAngle + Math.PI) / (Math.PI * 2) * 0.7;
    const totalOrder = maxDist + 0.7;
    const head = (tick * 0.06 * rate) % (totalOrder * 1.4);
    const diff = head - orderIdx;
    if (diff < 0 || diff > totalOrder * 1.1) return { opacity: 0.05, scale: 0.25 };
    const fade = 1 - Math.min(1, diff / (totalOrder * 0.7));
    return { opacity: 0.15 + fade * 0.85, scale: 0.4 + fade * 0.6 };
  }
  if (pattern === "snake") {
    const perim: [number, number][] = [];
    for (let cc = 0; cc < size; cc++) perim.push([0, cc]);
    for (let rr = 1; rr < size; rr++) perim.push([rr, size - 1]);
    for (let cc = size - 2; cc >= 0; cc--) perim.push([size - 1, cc]);
    for (let rr = size - 2; rr > 0; rr--) perim.push([rr, 0]);
    const pLen = perim.length;
    const head = Math.floor(tick * 0.2 * rate) % pLen;
    const tailLen = 4;
    for (let k = 0; k < tailLen; k++) {
      const idx = ((head - k) % pLen + pLen) % pLen;
      if (perim[idx][0] === r && perim[idx][1] === c) {
        const tVal = 1 - k / tailLen;
        return { opacity: 0.25 + tVal * 0.75, scale: 0.55 + tVal * 0.45 };
      }
    }
    return { opacity: 0.04, scale: 0.2 };
  }
  if (pattern === "checker") {
    const t = tick * 0.04 * rate;
    const phase = (Math.sin(t) + 1) / 2;
    const parity = (r + c) % 2;
    const v = parity === 0 ? phase : 1 - phase;
    return { opacity: 0.15 + v * 0.85, scale: 0.45 + v * 0.55 };
  }
  if (pattern === "flame") {
    const t = tick * 0.18 * rate;
    const basePart = Math.max(0, 1 - r / (size - 0.2));
    const flick = 0.55 + Math.sin(t + c * 2.3 + r * 1.7) * 0.35 + Math.sin(t * 2.1 + c * 1.1) * 0.15;
    const intensity = basePart * Math.max(0.15, flick) * 1.4;
    const v = Math.max(0, Math.min(1, intensity));
    if (v < 0.08) return { opacity: 0.05, scale: 0.2 };
    return { opacity: 0.15 + v * 0.85, scale: 0.4 + v * 0.6 };
  }
  if (pattern === "rain") {
    const t = tick * 0.22 * rate;
    const colHash = ((c * 2654435761) >>> 0) / 4294967295;
    const speed = 0.7 + colHash * 0.8;
    const offset = colHash * size * 2;
    const dropY = ((t * speed + offset) % (size + 3)) - 1;
    const d = r - dropY;
    if (d >= 0 && d < 3) {
      const brightness = 1 - d / 3;
      return { opacity: 0.25 + brightness * 0.75, scale: 0.5 + brightness * 0.5 };
    }
    return { opacity: 0.04, scale: 0.2 };
  }
  if (pattern === "breath") {
    const t = tick * 0.05 * rate;
    const dist = Math.hypot(r - center, c - center);
    const phase = t - dist * 0.25;
    const raw = (Math.sin(phase) + 1) / 2;
    const eased = raw * raw * (3 - 2 * raw);
    return { opacity: 0.3 + eased * 0.7, scale: 0.5 + eased * 0.5 };
  }
  if (pattern === "progress-bar") {
    const midR = Math.round(center);
    const t = tick * 0.08 * rate;
    const cycle = t % 2;
    const dir = cycle < 1 ? cycle : 2 - cycle;
    const barWidth = size * 0.45;
    const barCenter = dir * (size - barWidth) + barWidth / 2;
    const d = Math.abs(c - barCenter);
    if (r !== midR) {
      if (Math.abs(r - midR) === 1) return { opacity: 0.06, scale: 0.2 };
      return { opacity: 0, scale: 0 };
    }
    if (d < barWidth / 2) {
      const edgeT = Math.max(0, 1 - d / (barWidth / 2));
      return { opacity: 0.4 + edgeT * 0.6, scale: 0.7 + edgeT * 0.3 };
    }
    return { opacity: 0.1, scale: 0.3 };
  }
  if (pattern === "scan-line") {
    const t = tick * 0.14 * rate;
    const sweep = t % (size + 2);
    const d = Math.abs(c - sweep);
    if (d < 0.6) return { opacity: 1, scale: 0.95 };
    if (d < 1.8) return { opacity: 0.15 + (1.8 - d) * 0.45, scale: 0.4 + (1.8 - d) * 0.25 };
    return { opacity: 0.04, scale: 0.2 };
  }
  if (pattern === "matrix-rain") {
    const t = tick * 0.18 * rate;
    const colHash = ((c * 2654435761) >>> 0) / 4294967295;
    const speed = 0.6 + colHash * 0.7;
    const offset = colHash * size * 3;
    const head = ((t * speed + offset) % (size + 4)) - 1;
    const d = head - r;
    if (d < -0.5) return { opacity: 0.03, scale: 0.15 };
    if (d < 0.5) return { opacity: 1, scale: 0.95 };
    if (d < 4) {
      const fade = 1 - d / 4;
      return { opacity: 0.1 + fade * 0.6, scale: 0.4 + fade * 0.4 };
    }
    return { opacity: 0.03, scale: 0.15 };
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
  if (document.getElementById("simple-loader-text-fx-v3")) return;
  const el = document.createElement("style");
  el.id = "simple-loader-text-fx-v3";
  el.textContent = \`
    @keyframes simple-shimmer {
      0% { background-position: 0% 0; }
      100% { background-position: 100% 0; }
    }
    @keyframes simple-shine {
      0% { background-position: 100% 0; }
      60%, 100% { background-position: 0% 0; }
    }
    @keyframes simple-caret-blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
    .simple-loader-caret {
      animation: simple-caret-blink 1.06s step-end infinite;
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
    return <TypewriterLabel text={text} color={color} speed={shimmer.speed} />;
  }
  return <span style={shimmerStyle(color, shimmer.speed, mode)}>{text}</span>;
}

function TypewriterLabel({ text, color, speed }: { text: string; color: string; speed: number }) {
  const [typed, setTyped] = useState("");
  const textRef = useRef(text);
  textRef.current = text;
  ensureTextFxKeyframes();

  useEffect(() => {
    const charDelay = Math.max(25, 90 / Math.max(0.2, speed));
    const holdAfterFull = 3500;
    const holdAfterEmpty = 500;
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;
    let phase: "typing" | "hold-full" | "hold-empty" = "typing";
    const tick = () => {
      const full = textRef.current;
      if (phase === "typing") {
        i++;
        setTyped(full.slice(0, i));
        if (i >= full.length) {
          phase = "hold-full";
          timer = setTimeout(tick, holdAfterFull);
        } else {
          timer = setTimeout(tick, charDelay);
        }
      } else if (phase === "hold-full") {
        i = 0;
        setTyped("");
        phase = "hold-empty";
        timer = setTimeout(tick, holdAfterEmpty);
      } else {
        phase = "typing";
        timer = setTimeout(tick, charDelay);
      }
    };
    timer = setTimeout(tick, charDelay);
    return () => clearTimeout(timer);
  }, [speed]);

  return (
    <span style={{ color, position: "relative", display: "inline-block", whiteSpace: "pre" }}>
      <span aria-hidden style={{ visibility: "hidden" }}>{text}</span>
      <span style={{ position: "absolute", inset: 0, display: "inline-flex", alignItems: "center", gap: 2, whiteSpace: "pre" }}>
        <span>{typed}</span>
        <span
          aria-hidden
          className="simple-loader-caret"
          style={{
            display: "inline-block",
            width: 2,
            height: "0.9em",
            background: color,
          }}
        />
      </span>
    </span>
  );
}

// ---------- Main component ----------

export interface SimpleLoaderProps {
  displayText: string;
  size?: number;
  padding?: number;
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
  area: number;
  pad: number;
  colors: LoaderColors;
  cellShape: CellShape;
  gridCells: { cells: GridCell[]; cellSize: number };
  scatterState: ScatterCell[];
  scatterBound: number;
  constellationState: ConstellationNode[];
  refs: {
    shapes: (SVGGraphicsElement | null)[];
    edges: (SVGLineElement | null)[];
  };
}

function stepPattern(args: StepArgs) {
  const { pattern, tick, fps, colors, refs } = args;

  if (pattern === "node-graph") {
    const { nodes, edges } = stepNodeGraph(tick, args.area);
    nodes.forEach((n, i) => {
      const el = refs.shapes[i];
      if (!el) return;
      el.setAttribute("transform", \`translate(\${args.pad + n.x} \${args.pad + n.y}) scale(\${n.scale})\`);
      el.style.opacity = String(n.opacity);
      el.style.fill = colors.primary;
    });
    NODE_EDGES.forEach(([a, b], i) => {
      const el = refs.edges[i];
      if (!el) return;
      el.setAttribute("x1", String(args.pad + nodes[a].x));
      el.setAttribute("y1", String(args.pad + nodes[a].y));
      el.setAttribute("x2", String(args.pad + nodes[b].x));
      el.setAttribute("y2", String(args.pad + nodes[b].y));
      el.style.stroke = colors.primary;
      el.style.strokeOpacity = String(edges[i]);
    });
    return;
  }
  if (pattern === "constellation") {
    const { positions, edges } = stepConstellation(args.constellationState, args.area);
    positions.forEach((p, i) => {
      const el = refs.shapes[i];
      if (!el) return;
      el.setAttribute("transform", \`translate(\${args.pad + p.x} \${args.pad + p.y})\`);
      el.style.opacity = "0.95";
      el.style.fill = colors.primary;
    });
    edges.forEach((e, i) => {
      const el = refs.edges[i];
      if (!el) return;
      const a = positions[e.a];
      const b = positions[e.b];
      el.setAttribute("x1", String(args.pad + a.x));
      el.setAttribute("y1", String(args.pad + a.y));
      el.setAttribute("x2", String(args.pad + b.x));
      el.setAttribute("y2", String(args.pad + b.y));
      el.style.stroke = colors.primary;
      el.style.strokeOpacity = String(e.alpha);
    });
    return;
  }
  if (pattern === "network-pulse") {
    const { nodes, edges } = stepNetworkPulse(tick);
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
  if (pattern === "molecular") {
    const { center, satellites } = stepMolecular(tick, args.area);
    const centerEl = refs.shapes[0];
    if (centerEl) {
      centerEl.setAttribute("transform", \`translate(\${args.pad + center.x} \${args.pad + center.y}) scale(\${center.scale})\`);
      centerEl.style.opacity = String(center.opacity);
      centerEl.style.fill = colors.primary;
    }
    satellites.forEach((s, i) => {
      const el = refs.shapes[i + 1];
      if (!el) return;
      el.setAttribute("transform", \`translate(\${args.pad + s.x} \${args.pad + s.y}) scale(\${s.scale})\`);
      el.style.opacity = String(s.opacity);
      el.style.fill = colors.primary;
    });
    satellites.forEach((s, i) => {
      const el = refs.edges[i];
      if (!el) return;
      el.setAttribute("x1", String(args.pad + center.x));
      el.setAttribute("y1", String(args.pad + center.y));
      el.setAttribute("x2", String(args.pad + s.x));
      el.setAttribute("y2", String(args.pad + s.y));
      el.style.stroke = colors.primary;
      el.style.strokeOpacity = String(0.4 + s.opacity * 0.5);
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
      if (args.bg === "breathe" && out.opacity < 0.3) {
        const breatheFloor = 0.15 + Math.sin(tick * 0.03) * 0.05;
        out.opacity = Math.max(out.opacity, breatheFloor);
      }
    }
    const baseSize = args.gridCells.cellSize;
    const drawn = baseSize * out.scale;
    writeCellGeometry(el, args.cellShape, cell.cx, cell.cy, drawn);
    el.style.opacity = String(out.opacity);
    el.style.fill = out.color ?? blendColor(colors.inactiveCells, colors.primary, Math.max(0, Math.min(1, out.opacity)));
  });
}

function writeCellGeometry(el: SVGGraphicsElement, shape: CellShape, cx: number, cy: number, size: number) {
  const r = size / 2;
  if (el instanceof SVGCircleElement) {
    el.setAttribute("cx", String(cx));
    el.setAttribute("cy", String(cy));
    el.setAttribute("r", String(r));
    return;
  }
  if (el instanceof SVGRectElement) {
    el.setAttribute("x", String(cx - r));
    el.setAttribute("y", String(cy - r));
    el.setAttribute("width", String(size));
    el.setAttribute("height", String(size));
    if (shape === "rounded-rect") el.setAttribute("rx", String(size * 0.25));
    return;
  }
  if (el instanceof SVGPolygonElement) {
    el.setAttribute("points", polyPointsFor(shape, cx, cy, size));
  }
}

function polyPointsFor(shape: CellShape, cx: number, cy: number, size: number): string {
  const r = size / 2;
  if (shape === "diamond") return \`\${cx},\${cy - r} \${cx + r},\${cy} \${cx},\${cy + r} \${cx - r},\${cy}\`;
  if (shape === "hexagon") {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(\`\${cx + Math.cos(a) * r},\${cy + Math.sin(a) * r}\`);
    }
    return pts.join(" ");
  }
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(\`\${cx + Math.cos(a) * rr},\${cy + Math.sin(a) * rr}\`);
  }
  return pts.join(" ");
}

export function SimpleLoader({
  displayText = DEFAULT_CONFIG.displayText,
  size: sizeProp = (DEFAULT_CONFIG as { size?: number }).size ?? DEFAULT_SIZE,
  padding: paddingProp = (DEFAULT_CONFIG as { padding?: number }).padding ?? DEFAULT_PAD,
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
  const SIZE = Math.max(4, sizeProp);
  const PAD = Math.max(0, Math.min(paddingProp, Math.floor((SIZE - 2) / 2)));
  const AREA = SIZE - PAD * 2;
  const s = AREA / 10;
  const scatterCount = 28;
  const scatterCellSize = 1.2 * s;
  const scatterBound = 1 * s;
  const nodeSize = 3 * s;
  const edgeStroke = 0.3 * s;
  const bgRadius = (SIZE / 12) * 2;

  const glowCss = (() => {
    if (!glow?.enabled) return undefined;
    const blurPx = glow.size * s;
    const stack = Math.max(1, Math.round(glow.intensity));
    return Array(stack).fill(\`drop-shadow(0 0 \${blurPx}px \${colors!.primary})\`).join(" ");
  })();
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
  }, [effectiveSize, cellSizeFactor, AREA, PAD]);

  const scatterStateRef = useRef<ScatterCell[]>([]);
  const constellationStateRef = useRef<ConstellationNode[]>([]);

  useEffect(() => {
    if (pattern === "scatter") {
      scatterStateRef.current = makeScatterCells(scatterCount, AREA);
    }
    if (pattern === "constellation") {
      constellationStateRef.current = makeConstellation(AREA);
    }
  }, [pattern, AREA]);

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
      area: AREA,
      pad: PAD,
      colors: colors!,
      cellShape: cellShape!,
      gridCells,
      scatterState: scatterStateRef.current,
      scatterBound,
      constellationState: constellationStateRef.current,
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
        area: AREA,
        pad: PAD,
        colors: colors!,
        cellShape: cellShape!,
        gridCells,
        scatterState: scatterStateRef.current,
        scatterBound,
        constellationState: constellationStateRef.current,
        refs: { shapes: shapeRefs.current, edges: edgeRefs.current },
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pattern, anim.fps, anim.style, anim.backgroundStyle, effectiveSize, gridCells, colors, cellShape]);

  const isOffGrid =
    pattern === "scatter" ||
    pattern === "node-graph" ||
    pattern === "constellation" ||
    pattern === "network-pulse" ||
    pattern === "molecular";

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
      <span
        style={{
          display: "inline-block",
          width: SIZE,
          height: SIZE,
          flexShrink: 0,
          background: transparentBg ? "transparent" : colors!.background,
          borderRadius: bgRadius,
          transition: "background 250ms ease",
          lineHeight: 0,
        }}
      >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={\`0 0 \${SIZE} \${SIZE}\`}
        style={{
          display: "block",
          filter: glowCss,
        }}
      >
        <g>
          {pattern === "node-graph" && (
            <>
              {NODE_EDGES.map((_, i) => (
                <line
                  key={\`e\${i}\`}
                  ref={(el) => { edgeRefs.current[i] = el; }}
                  strokeWidth={edgeStroke}
                />
              ))}
              {NODE_POSITIONS.map((_, i) => (
                <g key={\`n\${i}\`} ref={(el) => { shapeRefs.current[i] = el; }}>
                  <ShapeNode shape={cellShape!} cx={0} cy={0} size={nodeSize} />
                </g>
              ))}
            </>
          )}
          {pattern === "constellation" && (
            <>
              {Array.from({ length: (CONSTELLATION_COUNT * (CONSTELLATION_COUNT - 1)) / 2 }).map((_, i) => (
                <line
                  key={\`ce\${i}\`}
                  ref={(el) => { edgeRefs.current[i] = el; }}
                  strokeWidth={edgeStroke * 0.8}
                />
              ))}
              {Array.from({ length: CONSTELLATION_COUNT }).map((_, i) => (
                <g key={\`cn\${i}\`} ref={(el) => { shapeRefs.current[i] = el; }}>
                  <ShapeNode shape={cellShape!} cx={0} cy={0} size={nodeSize * 0.7} />
                </g>
              ))}
            </>
          )}
          {pattern === "network-pulse" && (() => {
            const pts = pulseNodePositions(AREA);
            return (
              <>
                {pts.map((_, i) => {
                  const a = pts[i];
                  const b = pts[(i + 1) % pts.length];
                  return (
                    <line
                      key={\`pe\${i}\`}
                      ref={(el) => { edgeRefs.current[i] = el; }}
                      x1={PAD + a.x}
                      y1={PAD + a.y}
                      x2={PAD + b.x}
                      y2={PAD + b.y}
                      strokeWidth={edgeStroke}
                    />
                  );
                })}
                {pts.map((p, i) => (
                  <ShapeNode
                    key={\`pn\${i}\`}
                    shape={cellShape!}
                    cx={PAD + p.x}
                    cy={PAD + p.y}
                    size={nodeSize * 0.7}
                    nodeRef={(el) => { shapeRefs.current[i] = el; }}
                  />
                ))}
              </>
            );
          })()}
          {pattern === "molecular" && (
            <>
              {Array.from({ length: MOLECULAR_SATELLITES }).map((_, i) => (
                <line
                  key={\`me\${i}\`}
                  ref={(el) => { edgeRefs.current[i] = el; }}
                  strokeWidth={edgeStroke * 1.2}
                />
              ))}
              {Array.from({ length: MOLECULAR_SATELLITES + 1 }).map((_, i) => (
                <g key={\`mn\${i}\`} ref={(el) => { shapeRefs.current[i] = el; }}>
                  <ShapeNode shape={cellShape!} cx={0} cy={0} size={i === 0 ? nodeSize : nodeSize * 0.7} />
                </g>
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
      </span>
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
