"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AnimStyle, CellShape, LoaderColors } from "@/lib/types";
import {
  CONSTELLATION_COUNT,
  MOLECULAR_SATELLITES,
  NODE_EDGES,
  NODE_POSITIONS,
  PULSE_NODE_COUNT,
  applyStyle,
  blendColor,
  globalT,
  gridPhaseT,
  makeConstellation,
  makeScatterCells,
  pulseNodePositions,
  stepConstellation,
  stepMolecular,
  stepNetworkPulse,
  stepNodeGraph,
  stepScatter,
  type ConstellationNode,
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

const DEFAULT_SIZE = 12;
const DEFAULT_PAD = 1;
// Global tick-rate multiplier. 1 = configured fps, 2 = 2× faster, etc.
const SPEED_MULTIPLIER = 2;

export interface SimpleLoaderProps {
  displayText: string;
  size?: number;     // total loader dimension in px (e.g. 12, 16, 24…). Should be divisible by 4.
  padding?: number;  // inner padding (on each side). Clamped so inner area stays > 0.
  grid?: { size: number };
  cellShape?: CellShape;
  cellSizeFactor?: number; // 0.3 .. 1.5, multiplies the grid pitch
  animation?: {
    pattern: SimplePattern;
    style: AnimStyle;
    fps: number;
  };
  colors: LoaderColors;
  transparentBg?: boolean;
  glow?: { enabled: boolean; size: number; intensity: number };
  shimmer?: { enabled: boolean; speed: number; mode?: TextFxMode; base?: string; highlight?: string; stops?: [string, string, string] };
  paused?: boolean;
  dataId?: string;
  /**
   * Optional CSS pixel size for the rendered SVG. When set, the SVG keeps its
   * logical `size` coordinate space (viewBox) but is painted at `displayPx`
   * CSS pixels. Avoids the iOS Safari bug where `transform: scale()` on an
   * HTML ancestor leaves the SVG's internal content unscaled.
   */
  displayPx?: number;
}

export type TextFxMode = "shimmer" | "shine" | "gradient" | "cursor";

type GridCell = { r: number; c: number; cx: number; cy: number };

export function SimpleLoader({
  displayText,
  size: sizeProp = DEFAULT_SIZE,
  padding: paddingProp = DEFAULT_PAD,
  grid = { size: 5 },
  cellShape = "rounded-rect",
  cellSizeFactor = 1,
  animation = { pattern: "wave-diagonal", style: "pulse-size", fps: 24 },
  colors,
  transparentBg,
  glow,
  shimmer,
  paused,
  dataId,
  displayPx,
}: SimpleLoaderProps) {
  const { pattern } = animation;
  // Clamp geometry so AREA stays positive.
  const SIZE = Math.max(4, sizeProp);
  const PAD = Math.max(0, Math.min(paddingProp, Math.floor((SIZE - 2) / 2)));
  const AREA = SIZE - PAD * 2;
  // Helper shapes were designed at AREA=10 (SIZE=12, PAD=1); scale proportionally.
  const s = AREA / 10;
  const scatterCount = 28;
  const scatterCellSize = 1.2 * s;
  const scatterBound = 1 * s;
  const nodeSize = 3 * s;
  const edgeStroke = 0.3 * s;
  const bgRadius = (SIZE / 12) * 2;

  // CSS `filter: drop-shadow(...)` replaces the old SVG <filter> which iOS
  // mis-clips when the viewBox is scaled to `displayPx`. Drop-shadows stack
  // to approximate the old feComponentTransfer alpha boost.
  const glowCss = (() => {
    if (!glow?.enabled) return undefined;
    const scaleFactor = (displayPx ?? SIZE) / SIZE;
    const blurPx = glow.size * s * scaleFactor;
    const stack = Math.max(1, Math.round(glow.intensity));
    return Array(stack).fill(`drop-shadow(0 0 ${blurPx}px ${colors.primary})`).join(" ");
  })();

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
  // Start partway into the cycle so status patterns (which hold for ~40 ticks
  // before drawing cells) aren't blank on first paint.
  const tickRef = useRef(30);

  // Paint one frame synchronously when config changes — guarantees paused
  // loaders show a real frame instead of unstyled cells. Dep-gated so a
  // parent re-render (slider drag, color picker, etc.) doesn't force a
  // synchronous stepPattern on every loader.
  useLayoutEffect(() => {
    stepPattern({
      pattern,
      tick: tickRef.current,
      fps: animation.fps,
      style: animation.style,
      size: effectiveSize,
      colors,
      cellShape,
      gridCells,
      scatterState: scatterStateRef.current,
      scatterBound,
      constellationState: constellationStateRef.current,
      area: AREA,
      pad: PAD,
      refs: { shapes: shapeRefs.current, edges: edgeRefs.current },
    });
  }, [pattern, animation.fps, animation.style, effectiveSize, gridCells, colors, cellShape, scatterBound, AREA, PAD]);

  // Live pause ref so the rAF loop self-exits immediately on pause, even if the
  // effect cleanup hasn't run yet.
  const pausedRef = useRef(!!paused);
  pausedRef.current = !!paused;

  // rAF loop — wall-clock-gated so motion speed matches the configured fps
  // regardless of the display's refresh rate or frame slip. Only calls
  // stepPattern when tick actually advances, so paint work is bounded by fps.
  useEffect(() => {
    if (paused) return;
    const targetMs = 1000 / Math.max(1, animation.fps * SPEED_MULTIPLIER);
    let raf = 0;
    let last = performance.now();
    let accum = 0;
    const loop = (now: number) => {
      if (pausedRef.current) return;
      const dt = now - last;
      last = now;
      accum += dt;
      // tab-switch / long jank guard — don't spiral catching up
      if (accum > 500) accum = targetMs;
      let advanced = false;
      while (accum >= targetMs) {
        tickRef.current++;
        accum -= targetMs;
        advanced = true;
      }
      if (advanced) {
        stepPattern({
          pattern,
          tick: tickRef.current,
          fps: animation.fps,
          style: animation.style,
          size: effectiveSize,
          colors,
          cellShape,
          gridCells,
          scatterState: scatterStateRef.current,
          scatterBound,
          constellationState: constellationStateRef.current,
          area: AREA,
          pad: PAD,
          refs: { shapes: shapeRefs.current, edges: edgeRefs.current },
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pattern, animation.fps, animation.style, effectiveSize, gridCells, colors, cellShape, paused, scatterBound, AREA, PAD]);

  const isOffGrid =
    pattern === "scatter" ||
    pattern === "node-graph" ||
    pattern === "constellation" ||
    pattern === "network-pulse" ||
    pattern === "molecular";

  const outerPx = displayPx ?? SIZE;
  const outerRadius = displayPx ? (displayPx / SIZE) * bgRadius : bgRadius;

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
      <span
        style={{
          display: "inline-block",
          width: outerPx,
          height: outerPx,
          flexShrink: 0,
          background: transparentBg ? "transparent" : colors.background,
          borderRadius: outerRadius,
          transition: "background 250ms ease",
          lineHeight: 0,
        }}
      >
      <svg
        width={outerPx}
        height={outerPx}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        data-loader-id={dataId}
        style={{
          display: "block",
          // drop-shadow applied to the transparent SVG so only the drawn
          // cells contribute to the glow — not the outer background rect.
          filter: glowCss,
        }}
      >
        <g>
          {pattern === "node-graph" && (
            <>
              {NODE_EDGES.map((_, i) => (
                <line
                  key={`e${i}`}
                  ref={(el) => { edgeRefs.current[i] = el; }}
                  strokeWidth={edgeStroke}
                />
              ))}
              {NODE_POSITIONS.map((_, i) => (
                <g key={`n${i}`} ref={(el) => { shapeRefs.current[i] = el; }}>
                  <ShapeNode shape={cellShape} cx={0} cy={0} size={nodeSize} />
                </g>
              ))}
            </>
          )}
          {pattern === "constellation" && (
            <>
              {/* All pairs of nodes = C(N,2) edges; toggled alpha per frame */}
              {Array.from({ length: (CONSTELLATION_COUNT * (CONSTELLATION_COUNT - 1)) / 2 }).map((_, i) => (
                <line
                  key={`ce${i}`}
                  ref={(el) => { edgeRefs.current[i] = el; }}
                  strokeWidth={edgeStroke * 0.8}
                />
              ))}
              {Array.from({ length: CONSTELLATION_COUNT }).map((_, i) => (
                <g key={`cn${i}`} ref={(el) => { shapeRefs.current[i] = el; }}>
                  <ShapeNode shape={cellShape} cx={0} cy={0} size={nodeSize * 0.7} />
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
                      key={`pe${i}`}
                      ref={(el) => { edgeRefs.current[i] = el; }}
                      x1={PAD + a.x}
                      y1={PAD + a.y}
                      x2={PAD + b.x}
                      y2={PAD + b.y}
                      strokeWidth={edgeStroke}
                    />
                  );
                })}
                {pts.map((_, i) => (
                  <g key={`pn${i}`} ref={(el) => { shapeRefs.current[i] = el; }}>
                    <ShapeNode shape={cellShape} cx={0} cy={0} size={nodeSize * 0.7} />
                  </g>
                ))}
              </>
            );
          })()}
          {pattern === "molecular" && (
            <>
              {/* 3 bonds: center → satellite i */}
              {Array.from({ length: MOLECULAR_SATELLITES }).map((_, i) => (
                <line
                  key={`me${i}`}
                  ref={(el) => { edgeRefs.current[i] = el; }}
                  strokeWidth={edgeStroke * 1.2}
                />
              ))}
              {/* Center (shapeRefs[0]) + satellites (shapeRefs[1..]) */}
              {Array.from({ length: MOLECULAR_SATELLITES + 1 }).map((_, i) => (
                <g key={`mn${i}`} ref={(el) => { shapeRefs.current[i] = el; }}>
                  <ShapeNode shape={cellShape} cx={0} cy={0} size={i === 0 ? nodeSize : nodeSize * 0.7} />
                </g>
              ))}
            </>
          )}
          {pattern === "scatter" &&
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
      </span>
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
  shimmer?: { enabled: boolean; speed: number; mode?: TextFxMode; base?: string; highlight?: string; stops?: [string, string, string] };
}) {
  if (!shimmer?.enabled) return <span>{text}</span>;
  const mode = shimmer.mode ?? "shimmer";
  if (mode === "cursor") {
    return <TypewriterLabel text={text} color={color} speed={shimmer.speed} />;
  }
  const baseColor = shimmer.base || color;
  return <span style={shimmerStyle(baseColor, shimmer.speed, mode, shimmer.highlight, shimmer.stops)}>{text}</span>;
}

function TypewriterLabel({ text, color, speed }: { text: string; color: string; speed: number }) {
  const [typed, setTyped] = useState("");
  const textRef = useRef(text);
  textRef.current = text;
  // Install keyframes synchronously so the cursor's CSS animation resolves on first paint.
  ensureTextFxKeyframes();

  useEffect(() => {
    const charDelay = Math.max(25, 90 / Math.max(0.2, speed));
    // Hold long enough to see the cursor blink ~3 times before the loop restarts.
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
      {/* ghost reserves full width (+ caret gap/width) so the caret stays visible after the last char */}
      <span aria-hidden style={{ visibility: "hidden", paddingRight: 4 }}>{text}</span>
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
    // ECG sweep: head pulses bright, QRS trace trails behind with thick line and fading tail.
    const sweep = (tick * 0.1 * rate) % (size + 3);
    const dx = sweep - c; // >0 = already passed, <0 = ahead of head
    const midR = Math.round(center);
    const amp = center * 0.95; // full vertical range

    // y-offset of the trace at given "behind" distance (in columns)
    const qrsAt = (b: number): number | null => {
      if (b < -0.3 || b > 4) return null;
      if (b < 0.2) return 0;             // approach: baseline
      if (b < 0.75) return -amp;          // R peak — shoots to top
      if (b < 1.5) return amp;            // S trough — shoots to bottom
      if (b < 2.2) return -amp * 0.35;    // small bounce back
      return 0;                            // flat trail
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

    // Thicker spike — line is ~2 cells wide; edge cells fall off smoothly.
    if (d < 1.2) {
      const edgeT = Math.max(0, 1 - d * 0.9);
      if (atHead) {
        // Head flashes bright and slightly enlarged.
        return { opacity: 0.9 + edgeT * 0.1, scale: 0.95 + edgeT * 0.25 };
      }
      return { opacity: 0.25 + fade * 0.7 * edgeT, scale: 0.45 + fade * 0.55 };
    }
    // Continuity hint: baseline row stays faintly visible in the trail.
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
  // ---------- Physics ----------
  if (pattern === "bouncing-ball") {
    const midC = Math.round(center);
    const t = tick * 0.12 * rate;
    // |sin| gives bouncing motion: 0 at ground, 1 at apex.
    const h = Math.abs(Math.sin(t));
    const ballR = (size - 1) * (1 - h); // row position
    const d = Math.abs(r - ballR);
    const onBall = c === midC && d < 0.9;
    // Squash near ground (h low): widen ball horizontally.
    const squash = h < 0.15 ? (1 - h / 0.15) : 0;
    if (r === size - 1 && Math.abs(c - midC) < 1 + squash * 1.5 && squash > 0.1) {
      return { opacity: 0.4 + squash * 0.6, scale: 0.6 + squash * 0.4 };
    }
    if (onBall) return { opacity: 1, scale: 1 };
    // Faint shadow at ground
    if (r === size - 1 && c === midC) return { opacity: 0.15, scale: 0.4 };
    return { opacity: 0, scale: 0 };
  }
  if (pattern === "pendulum") {
    const midR = Math.round(center);
    const t = tick * 0.1 * rate;
    const swing = Math.sin(t); // -1..1
    const ballC = center + swing * center * 0.9;
    const ballCi = Math.round(ballC);
    // Small vertical arc — dips lower at endpoints
    const arcY = Math.abs(swing);
    const ballR = Math.round(midR + arcY * center * 0.3);
    if (r === ballR && c === ballCi) return { opacity: 1, scale: 1 };
    // Pivot string: short vertical line from top-center to ball
    if (c === Math.round(center) && r < ballR && r <= midR) {
      return { opacity: 0.12, scale: 0.3 };
    }
    return { opacity: 0, scale: 0 };
  }
  if (pattern === "elastic-bar") {
    const midR = Math.round(center);
    if (r !== midR) return { opacity: 0, scale: 0 };
    const t = tick * 0.08 * rate;
    // Use sin^2 for "snap back" feel: quick stretch then slow rest
    const raw = Math.sin(t);
    const stretch = raw * raw; // 0..1, squared gives faster return
    const halfWidth = 0.6 + stretch * center * 0.95;
    const d = Math.abs(c - center);
    if (d < halfWidth) {
      const edgeT = Math.max(0, 1 - d / halfWidth);
      return { opacity: 0.3 + edgeT * 0.7, scale: 0.6 + edgeT * 0.4 };
    }
    return { opacity: 0, scale: 0 };
  }
  // ---------- Path ----------
  if (pattern === "spiral") {
    // Activate cells in a spiral order: innermost first, winding outward.
    const cellAngle = Math.atan2(r - center, c - center);
    const dist = Math.hypot(r - center, c - center);
    const maxDist = Math.hypot(center, center);
    // Order = radius + small angular offset; head sweeps through this linearly.
    const orderIdx = dist + (cellAngle + Math.PI) / (Math.PI * 2) * 0.7;
    const totalOrder = maxDist + 0.7;
    const head = (tick * 0.06 * rate) % (totalOrder * 1.4);
    const diff = head - orderIdx;
    if (diff < 0 || diff > totalOrder * 1.1) return { opacity: 0.05, scale: 0.25 };
    const fade = 1 - Math.min(1, diff / (totalOrder * 0.7));
    return { opacity: 0.15 + fade * 0.85, scale: 0.4 + fade * 0.6 };
  }
  if (pattern === "snake") {
    // Perimeter cells traversed clockwise from top-left. Snake has a head + 3-cell tail.
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
        const t = 1 - k / tailLen;
        return { opacity: 0.25 + t * 0.75, scale: 0.55 + t * 0.45 };
      }
    }
    return { opacity: 0.04, scale: 0.2 };
  }
  if (pattern === "checker") {
    const t = tick * 0.04 * rate;
    const phase = (Math.sin(t) + 1) / 2; // 0..1
    const parity = (r + c) % 2;
    const v = parity === 0 ? phase : 1 - phase;
    return { opacity: 0.15 + v * 0.85, scale: 0.45 + v * 0.55 };
  }
  // ---------- Natural ----------
  if (pattern === "flame") {
    // Higher rows dimmer; add per-cell flicker so the top shimmers.
    const t = tick * 0.18 * rate;
    const basePart = Math.max(0, 1 - r / (size - 0.2));
    const flick = 0.55 + Math.sin(t + c * 2.3 + r * 1.7) * 0.35 + Math.sin(t * 2.1 + c * 1.1) * 0.15;
    const intensity = basePart * Math.max(0.15, flick) * 1.4;
    const v = Math.max(0, Math.min(1, intensity));
    if (v < 0.08) return { opacity: 0.05, scale: 0.2 };
    return { opacity: 0.15 + v * 0.85, scale: 0.4 + v * 0.6 };
  }
  if (pattern === "rain") {
    // Per-column independent drops, varying speed + phase so columns aren't synced.
    const t = tick * 0.22 * rate;
    const colHash = ((c * 2654435761) >>> 0) / 4294967295; // 0..1
    const speed = 0.7 + colHash * 0.8;
    const offset = colHash * size * 2;
    const dropY = ((t * speed + offset) % (size + 3)) - 1;
    const d = r - dropY; // positive if above drop
    if (d >= 0 && d < 3) {
      const brightness = 1 - d / 3;
      return { opacity: 0.25 + brightness * 0.75, scale: 0.5 + brightness * 0.5 };
    }
    return { opacity: 0.04, scale: 0.2 };
  }
  if (pattern === "breath") {
    // Whole grid pulses in coordinated slow breath, with slight radial phase for depth.
    const t = tick * 0.05 * rate;
    const dist = Math.hypot(r - center, c - center);
    const phase = t - dist * 0.25;
    const raw = (Math.sin(phase) + 1) / 2;
    const eased = raw * raw * (3 - 2 * raw);
    return { opacity: 0.3 + eased * 0.7, scale: 0.5 + eased * 0.5 };
  }
  // ---------- Tech ----------
  if (pattern === "progress-bar") {
    const midR = Math.round(center);
    const t = tick * 0.08 * rate;
    const cycle = t % 2; // 0..2
    const dir = cycle < 1 ? cycle : 2 - cycle; // 0..1 triangle
    const barWidth = size * 0.45;
    const barCenter = dir * (size - barWidth) + barWidth / 2;
    const d = Math.abs(c - barCenter);
    if (r !== midR) {
      // Rail on neighbor rows
      if (Math.abs(r - midR) === 1) return { opacity: 0.06, scale: 0.2 };
      return { opacity: 0, scale: 0 };
    }
    if (d < barWidth / 2) {
      const edgeT = Math.max(0, 1 - d / (barWidth / 2));
      return { opacity: 0.4 + edgeT * 0.6, scale: 0.7 + edgeT * 0.3 };
    }
    return { opacity: 0.1, scale: 0.3 }; // dim rail
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
    // Per-column vertical trails like The Matrix — head bright, trail fades behind.
    const t = tick * 0.18 * rate;
    const colHash = ((c * 2654435761) >>> 0) / 4294967295;
    const speed = 0.6 + colHash * 0.7;
    const offset = colHash * size * 3;
    const head = ((t * speed + offset) % (size + 4)) - 1;
    const d = head - r; // positive = r is above head (trail)
    if (d < -0.5) return { opacity: 0.03, scale: 0.15 };
    if (d < 0.5) return { opacity: 1, scale: 0.95 }; // bright head
    if (d < 4) {
      const fade = 1 - d / 4;
      return { opacity: 0.1 + fade * 0.6, scale: 0.4 + fade * 0.4 };
    }
    return { opacity: 0.03, scale: 0.15 };
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
    const adv = tick * rate / 10;
    const glyphIdx = Math.floor(adv) % ASCII_CYCLE_GLYPHS.length;
    const glyph = ASCII_CYCLE_GLYPHS[glyphIdx];
    const sub = adv % 1;
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
    "pulse-size",
    phaseT,
    primary,
    inactive,
  );
  return { opacity: s.opacity, scale: s.scale, color: s.fill };
}

// ---------- Animation steppers ----------

interface StepArgs {
  pattern: SimplePattern;
  tick: number;
  fps: number;
  style: AnimStyle;
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
    const { nodes, edges } = stepNodeGraph(tick, args.area, fps);
    nodes.forEach((n, i) => {
      const el = refs.shapes[i];
      if (!el) return;
      el.setAttribute("transform", `translate(${args.pad + n.x} ${args.pad + n.y}) scale(${n.scale})`);
      el.style.opacity = String(n.opacity);
      el.style.fill = colors.primary;
    });
    // Update edge endpoints to follow the current node positions.
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
    const { positions, edges } = stepConstellation(args.constellationState, args.area, fps);
    positions.forEach((p, i) => {
      const el = refs.shapes[i];
      if (!el) return;
      el.setAttribute("transform", `translate(${args.pad + p.x} ${args.pad + p.y})`);
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
    const { nodes, edges } = stepNetworkPulse(tick, fps);
    const pts = pulseNodePositions(args.area);
    nodes.forEach((n, i) => {
      const el = refs.shapes[i];
      if (!el) return;
      const cx = args.pad + pts[i].x;
      const cy = args.pad + pts[i].y;
      el.setAttribute("transform", `translate(${cx} ${cy}) scale(${n.scale})`);
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
    const { center, satellites } = stepMolecular(tick, args.area, fps);
    const centerEl = refs.shapes[0];
    if (centerEl) {
      centerEl.setAttribute("transform", `translate(${args.pad + center.x} ${args.pad + center.y}) scale(${center.scale})`);
      centerEl.style.opacity = String(center.opacity);
      centerEl.style.fill = colors.primary;
    }
    satellites.forEach((s, i) => {
      const el = refs.shapes[i + 1];
      if (!el) return;
      el.setAttribute("transform", `translate(${args.pad + s.x} ${args.pad + s.y}) scale(${s.scale})`);
      el.style.opacity = String(s.opacity);
      el.style.fill = colors.primary;
    });
    // Bonds from center to each satellite
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
    const positions = stepScatter(args.scatterState, tick, args.scatterBound, fps);
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
      const s = applyStyle(args.style, phaseT, colors.primary, colors.inactiveCells);
      out = { opacity: s.opacity, scale: s.scale, color: s.fill };
    } else {
      out = evalGridPattern(pattern, cell.r, cell.c, args.size, tick, fps, t, colors.primary, colors.inactiveCells);
    }
    // iOS Safari mis-renders CSS-transformed ancestors + SVG `transform`
    // attributes on descendants. Drive size with concrete geometry attrs
    // instead of transforms — works on every SVG renderer.
    const baseSize = args.gridCells.cellSize;
    const drawn = baseSize * out.scale;
    writeCellGeometry(el, args.cellShape, cell.cx, cell.cy, drawn);
    el.style.opacity = String(out.opacity);
    // For patterns that don't set their own color, blend inactive → primary by activity
    // so the inactiveCells color actually shows on dim/off cells.
    el.style.fill = out.color ?? blendColor(colors.inactiveCells, colors.primary, Math.max(0, Math.min(1, out.opacity)));
  });
}

// ---------- Cell geometry writer (iOS-safe, no transforms) ----------

function writeCellGeometry(
  el: SVGGraphicsElement,
  shape: CellShape,
  cx: number,
  cy: number,
  size: number,
) {
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
    return;
  }
}

function polyPointsFor(shape: CellShape, cx: number, cy: number, size: number): string {
  const r = size / 2;
  if (shape === "diamond") {
    return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
  }
  if (shape === "hexagon") {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
    }
    return pts.join(" ");
  }
  // star
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`);
  }
  return pts.join(" ");
}

// ---------- Text effects (shimmer / shine) ----------

function ensureTextFxKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("simple-loader-text-fx-v3")) return;
  // Remove any older versions.
  document.getElementById("simple-loader-text-fx")?.remove();
  document.getElementById("simple-loader-text-fx-v2")?.remove();
  const el = document.createElement("style");
  el.id = "simple-loader-text-fx-v3";
  el.textContent = `
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
  `;
  document.head.appendChild(el);
}

function shimmerStyle(
  baseColor: string,
  speed: number,
  mode: Exclude<TextFxMode, "cursor">,
  highlight?: string,
  stops?: [string, string, string],
): React.CSSProperties {
  ensureTextFxKeyframes();
  const duration = Math.max(0.4, 2.5 / Math.max(0.2, speed));
  const peak = highlight || baseColor;
  const g = stops ?? ["#6CB4FF", "#BD93F9", "#F5A3C7"];
  const common: React.CSSProperties = {
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
      backgroundImage: `linear-gradient(100deg,
        ${baseColor}80 0%,
        ${baseColor}80 44%,
        ${peak} 50%,
        ${baseColor}80 56%,
        ${baseColor}80 100%)`,
      animation: `simple-shine ${duration * 1.4}s ease-in-out infinite`,
    };
  }
  if (mode === "gradient") {
    return {
      ...common,
      backgroundImage: `linear-gradient(90deg,
        ${baseColor} 0%,
        ${baseColor} 33%,
        ${g[0]} 40%,
        ${g[1]} 45%,
        ${g[2]} 50%,
        ${g[1]} 55%,
        ${g[0]} 60%,
        ${baseColor} 67%,
        ${baseColor} 100%)`,
      animation: `simple-shimmer ${duration * 1.4}s linear infinite`,
    };
  }
  return {
    ...common,
    backgroundImage: `linear-gradient(90deg,
      ${baseColor}80 0%,
      ${baseColor}80 30%,
      ${peak} 50%,
      ${baseColor}80 70%,
      ${baseColor}80 100%)`,
    animation: `simple-shimmer ${duration}s linear infinite`,
  };
}
