import type { AnimStyle } from "../types";

export interface CellStyle {
  scale: number;
  opacity: number;
  fill: string;
}

export function globalT(tick: number, fps: number): number {
  const rate = Math.max(6, Math.min(60, fps)) / 24;
  return tick * 0.05 * rate;
}

export function gridPhaseT(
  pattern: string,
  r: number,
  c: number,
  size: number,
  t: number,
): number {
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

export function applyStyle(
  style: AnimStyle,
  t: number,
  primary: string,
  inactive: string,
): CellStyle {
  switch (style) {
    case "pulse-size":
      return { scale: 0.35 + t * 0.8, opacity: 0.25 + t * 0.75, fill: primary };
    case "pulse-opacity":
      return { scale: 0.9, opacity: Math.max(0.15, t), fill: primary };
    case "pulse-color":
      return { scale: 0.9, opacity: 1, fill: blendColor(inactive, primary, t) };
  }
}

export function blendColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export interface ScatterCell {
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  ox: number;
  oy: number;
}

export function makeScatterCells(count: number, area: number): ScatterCell[] {
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

export function fpsRate(fps: number): number {
  return Math.max(6, Math.min(60, fps)) / 24;
}

export function stepScatter(
  cells: ScatterCell[],
  tick: number,
  bound: number,
  fps: number = 24,
): { x: number; y: number; opacity: number }[] {
  const rate = fpsRate(fps);
  return cells.map((cell) => {
    cell.ox += cell.vx * rate;
    cell.oy += cell.vy * rate;
    if (Math.abs(cell.ox) > bound) cell.vx = -cell.vx;
    if (Math.abs(cell.oy) > bound) cell.vy = -cell.vy;
    const pulse = (Math.sin(tick * 0.05 * rate + cell.baseX * 0.02) + 1) / 2;
    return {
      x: cell.baseX + cell.ox,
      y: cell.baseY + cell.oy,
      opacity: 0.3 + pulse * 0.7,
    };
  });
}

export const NODE_POSITIONS: [number, number][] = [
  [0.5, 0.12],
  [0.12, 0.88],
  [0.88, 0.88],
  [0.5, 0.52],
];

export const NODE_EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

export function stepNodeGraph(
  tick: number,
  area: number,
  fps: number = 24,
): {
  nodes: { x: number; y: number; scale: number; opacity: number }[];
  edges: number[];
} {
  const t = tick * 0.04 * fpsRate(fps);
  // Small elliptical drift around each base position; ~6% of the area.
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

// ---------- Constellation ----------
// N free-moving nodes with velocity + wall bounce; edges drawn between pairs
// within a proximity threshold, alpha fades with distance.

export interface ConstellationNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const CONSTELLATION_COUNT = 6;

export function makeConstellation(area: number): ConstellationNode[] {
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

export function stepConstellation(
  nodes: ConstellationNode[],
  area: number,
  fps: number = 24,
): {
  positions: { x: number; y: number }[];
  edges: { a: number; b: number; alpha: number }[];
} {
  const rate = fpsRate(fps);
  nodes.forEach((n) => {
    n.x += n.vx * rate;
    n.y += n.vy * rate;
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

// ---------- Network Pulse ----------
// Nodes on a ring; a "signal packet" travels around the ring, lighting up nodes
// and edges as it passes.

export const PULSE_NODE_COUNT = 8;

export function pulseNodePositions(area: number): { x: number; y: number }[] {
  const cx = area / 2;
  const cy = area / 2;
  const r = area * 0.42;
  const out = [];
  for (let i = 0; i < PULSE_NODE_COUNT; i++) {
    const a = (i / PULSE_NODE_COUNT) * Math.PI * 2 - Math.PI / 2;
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return out;
}

export function stepNetworkPulse(tick: number, fps: number = 24): {
  nodes: { scale: number; opacity: number }[];
  edges: number[]; // alpha for each consecutive-pair edge (N edges, closing ring)
} {
  const count = PULSE_NODE_COUNT;
  const packet = (tick * 0.06 * fpsRate(fps)) % count; // float position along ring
  const nodes = [];
  for (let i = 0; i < count; i++) {
    // Distance around ring (shortest direction)
    const diff = Math.abs(((packet - i + count / 2) % count) - count / 2);
    const nearness = Math.max(0, 1 - diff / 1.4);
    nodes.push({ scale: 0.6 + nearness * 0.6, opacity: 0.25 + nearness * 0.75 });
  }
  const edges = [];
  for (let i = 0; i < count; i++) {
    // Edge between i and (i+1) — active when packet is between them.
    const mid = i + 0.5;
    const diff = Math.abs(((packet - mid + count / 2) % count) - count / 2);
    const alpha = Math.max(0, 1 - diff / 0.8);
    edges.push(0.1 + alpha * 0.9);
  }
  return { nodes, edges };
}

// ---------- Molecular ----------
// One central node + orbiting satellites at different radii / speeds.
// Bonds (lines) stay connected from center to each satellite.

export const MOLECULAR_SATELLITES = 3;

export function stepMolecular(tick: number, area: number, fps: number = 24): {
  center: { x: number; y: number; scale: number; opacity: number };
  satellites: { x: number; y: number; scale: number; opacity: number }[];
} {
  const cx = area / 2;
  const cy = area / 2;
  const t = tick * 0.05 * fpsRate(fps);
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
