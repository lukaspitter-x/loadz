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
  | "success"
  | "error"
  | "warning";

export const SIMPLE_PATTERNS: { value: SimplePattern; label: string; group: string }[] = [
  { value: "wave-diagonal", label: "Wave Diagonal", group: "Grid" },
  { value: "expanding-pulse", label: "Expanding Pulse", group: "Grid" },
  { value: "staircase", label: "Staircase", group: "Grid" },
  { value: "scatter", label: "Scatter", group: "Particle" },
  { value: "node-graph", label: "Node Graph", group: "Particle" },
  { value: "orbit", label: "Orbit", group: "Spinner" },
  { value: "ring", label: "Ring (Tail Spin)", group: "Spinner" },
  { value: "dot-pulse", label: "Dot Pulse (Typing)", group: "Dots" },
  { value: "dot-wave", label: "Dot Wave", group: "Dots" },
  { value: "cardio", label: "Cardio", group: "Line" },
  { value: "waveform", label: "Waveform", group: "Line" },
  { value: "ripples", label: "Ripples", group: "Radial" },
  { value: "ascii-cycle", label: "ASCII Cycle", group: "AI" },
  { value: "noise", label: "Noise (TV Static)", group: "AI" },
  { value: "success", label: "Success (Check)", group: "Status" },
  { value: "error", label: "Error (Cross)", group: "Status" },
  { value: "warning", label: "Warning", group: "Status" },
];

export const STATUS_DEFAULTS: Record<"success" | "error" | "warning", { primary: string; background: string }> = {
  success: { primary: "#22c55e", background: "#000000" },
  error: { primary: "#ef4444", background: "#000000" },
  warning: { primary: "#f59e0b", background: "#000000" },
};
