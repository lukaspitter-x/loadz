import type { AnimPattern, AnimStyle, BgStyle } from "../types";

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
  pattern: AnimPattern,
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

export function stepScatter(
  cells: ScatterCell[],
  tick: number,
  bound: number,
): { x: number; y: number; opacity: number }[] {
  return cells.map((cell) => {
    cell.ox += cell.vx;
    cell.oy += cell.vy;
    if (Math.abs(cell.ox) > bound) cell.vx = -cell.vx;
    if (Math.abs(cell.oy) > bound) cell.vy = -cell.vy;
    const pulse = (Math.sin(tick * 0.05 + cell.baseX * 0.02) + 1) / 2;
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

export function stepNodeGraph(tick: number): {
  nodes: { scale: number; opacity: number }[];
  edges: number[];
} {
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
