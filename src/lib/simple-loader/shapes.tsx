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
