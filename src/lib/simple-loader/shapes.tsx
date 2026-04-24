import type { CSSProperties } from "react";
import type { CellShape } from "../types";

export function ShapeNode({
  shape,
  cx,
  cy,
  size,
  style,
  nodeRef,
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
  if (shape === "triangle-up" || shape === "triangle-down") {
    // Isoceles (not equilateral): base = s, height = s, centroid at (cx, cy).
    // Centroid is 1/3 above the base; apex is (2/3)s from the centroid.
    const apexDist = (2 * s) / 3;
    const baseDist = s / 3;
    const halfBase = s / 2;
    if (shape === "triangle-up") {
      return [
        [cx, cy - apexDist],
        [cx + halfBase, cy + baseDist],
        [cx - halfBase, cy + baseDist],
      ].map((p) => p.join(",")).join(" ");
    }
    return [
      [cx - halfBase, cy - baseDist],
      [cx + halfBase, cy - baseDist],
      [cx, cy + apexDist],
    ].map((p) => p.join(",")).join(" ");
  }
  if (shape === "triangle-ur" || shape === "triangle-dl" || shape === "triangle-ul" || shape === "triangle-dr") {
    // Right-isoceles triangles — halves of a square of side s, positioned so
    // the triangle's INCENTER (not centroid) sits at (cx, cy). Using the
    // incenter means uniform scaling about (cx, cy) insets every edge by the
    // same perpendicular distance — so when cells shrink, the gap along the
    // hypotenuse equals the gap along the legs, giving a visually uniform
    // tessellation instead of cells clumping into pairs.
    const apex = s * Math.SQRT1_2;   // leg-length component from incenter to far vertex
    const inset = s - apex;          // inradius: incenter's perpendicular distance to each edge
    if (shape === "triangle-ur") {
      return [
        [cx - apex, cy - inset],
        [cx + inset, cy - inset],
        [cx + inset, cy + apex],
      ].map((p) => p.join(",")).join(" ");
    }
    if (shape === "triangle-dl") {
      return [
        [cx - inset, cy - apex],
        [cx + apex, cy + inset],
        [cx - inset, cy + inset],
      ].map((p) => p.join(",")).join(" ");
    }
    if (shape === "triangle-ul") {
      return [
        [cx - inset, cy - inset],
        [cx + apex, cy - inset],
        [cx - inset, cy + apex],
      ].map((p) => p.join(",")).join(" ");
    }
    // triangle-dr
    return [
      [cx + inset, cy - apex],
      [cx + inset, cy + inset],
      [cx - apex, cy + inset],
    ].map((p) => p.join(",")).join(" ");
  }
  if (shape === "diamond") {
    return [
      [cx, cy - r],
      [cx + r, cy],
      [cx, cy + r],
      [cx - r, cy],
    ]
      .map((p) => p.join(","))
      .join(" ");
  }
  if (shape === "hexagon") {
    const pts: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts.map((p) => p.join(",")).join(" ");
  }
  // star: 10 points
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts.map((p) => p.join(",")).join(" ");
}
