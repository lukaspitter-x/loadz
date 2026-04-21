import type { AnimPattern } from "../types";

export type SimplePattern =
  | AnimPattern
  | "orbit"
  | "ring"
  | "dot-pulse"
  | "dot-wave"
  | "cardio"
  | "waveform"
  | "ripples"
  | "ascii-cycle"
  | "noise"
  | "constellation"
  | "network-pulse"
  | "molecular"
  // Physics
  | "bouncing-ball"
  | "pendulum"
  | "elastic-bar"
  // Path
  | "spiral"
  | "snake"
  | "checker"
  // Natural
  | "flame"
  | "rain"
  | "breath"
  // Tech
  | "progress-bar"
  | "scan-line"
  | "matrix-rain"
  | "success"
  | "error"
  | "warning";

export const SIMPLE_PATTERNS: { value: SimplePattern; label: string; group: string }[] = [
  { value: "wave-diagonal", label: "Grid Wave Diagonal", group: "Grid" },
  { value: "expanding-pulse", label: "Grid Expanding Pulse", group: "Grid" },
  { value: "staircase", label: "Grid Staircase", group: "Grid" },
  { value: "scatter", label: "Particle Scatter", group: "Particle" },
  { value: "node-graph", label: "Network Graph", group: "Network" },
  { value: "constellation", label: "Network Constellation", group: "Network" },
  { value: "network-pulse", label: "Network Pulse", group: "Network" },
  { value: "molecular", label: "Network Molecular", group: "Network" },
  { value: "orbit", label: "Spinner Orbit", group: "Spinner" },
  { value: "ring", label: "Spinner Ring", group: "Spinner" },
  { value: "dot-pulse", label: "Dot Pulse", group: "Dots" },
  { value: "dot-wave", label: "Dot Wave", group: "Dots" },
  { value: "cardio", label: "Line Cardio", group: "Line" },
  { value: "waveform", label: "Line Waveform", group: "Line" },
  { value: "ripples", label: "Radial Ripples", group: "Radial" },
  { value: "ascii-cycle", label: "AI ASCII Cycle", group: "AI" },
  { value: "noise", label: "AI Noise", group: "AI" },
  { value: "bouncing-ball", label: "Physics Bouncing Ball", group: "Physics" },
  { value: "pendulum", label: "Physics Pendulum", group: "Physics" },
  { value: "elastic-bar", label: "Physics Elastic Bar", group: "Physics" },
  { value: "spiral", label: "Path Spiral", group: "Path" },
  { value: "snake", label: "Path Snake", group: "Path" },
  { value: "checker", label: "Path Checker", group: "Path" },
  { value: "flame", label: "Natural Flame", group: "Natural" },
  { value: "rain", label: "Natural Rain", group: "Natural" },
  { value: "breath", label: "Natural Breath", group: "Natural" },
  { value: "progress-bar", label: "Tech Progress Bar", group: "Tech" },
  { value: "scan-line", label: "Tech Scan Line", group: "Tech" },
  { value: "matrix-rain", label: "Tech Matrix Rain", group: "Tech" },
  { value: "success", label: "Status Success", group: "Status" },
  { value: "error", label: "Status Error", group: "Status" },
  { value: "warning", label: "Status Warning", group: "Status" },
];

export const STATUS_DEFAULTS: Record<"success" | "error" | "warning", { primary: string; background: string }> = {
  success: { primary: "#22c55e", background: "#000000" },
  error: { primary: "#ef4444", background: "#000000" },
  warning: { primary: "#f59e0b", background: "#000000" },
};
