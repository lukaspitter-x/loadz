import { Graphics } from "pixi.js";
import type { CellShape } from "../types";

export function hexToNumber(hex: string): number {
  const clean = hex.replace("#", "").trim();
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.slice(0, 6);
  return parseInt(normalized, 16) || 0;
}

function starPoints(cx: number, cy: number, size: number): number[] {
  const outer = size / 2;
  const inner = outer * 0.42;
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

function hexPoints(cx: number, cy: number, size: number): number[] {
  const r = size / 2;
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

export function drawCell(
  g: Graphics,
  shape: CellShape,
  cx: number,
  cy: number,
  size: number,
  color: number,
  alpha: number = 1,
) {
  g.clear();
  const half = size / 2;
  switch (shape) {
    case "circle":
      g.circle(cx, cy, half);
      break;
    case "square":
      g.rect(cx - half, cy - half, size, size);
      break;
    case "rounded-rect":
      g.roundRect(cx - half, cy - half, size, size, size * 0.25);
      break;
    case "diamond":
      g.poly([cx, cy - half, cx + half, cy, cx, cy + half, cx - half, cy]);
      break;
    case "hexagon":
      g.poly(hexPoints(cx, cy, size));
      break;
    case "star":
      g.poly(starPoints(cx, cy, size));
      break;
  }
  g.fill({ color, alpha });
}
