export type CellShape =
  | "rounded-rect"
  | "square"
  | "circle"
  | "diamond"
  | "hexagon"
  | "star";

export type AnimPattern =
  | "wave-diagonal"
  | "expanding-pulse"
  | "staircase"
  | "scatter"
  | "node-graph";

export type AnimStyle = "pulse-size" | "pulse-opacity" | "pulse-color";
export type BgStyle = "breathe" | "none";

export interface LoaderColors {
  primary: string;
  secondary?: string;
  inactiveCells: string;
  background: string;
  text: string;
}

export interface LoaderConfig {
  id: string;
  displayText: string;
  grid: { size: number };
  cellShape: CellShape;
  animation: {
    pattern: AnimPattern;
    fps: number;
    style: AnimStyle;
    backgroundStyle: BgStyle;
  };
  colors: LoaderColors;
  features: {
    builder: boolean;
    effects: boolean;
    nodes: boolean;
    textShimmer: { enabled: boolean; speed: number };
    imageMask: boolean;
    aiGeneration: boolean;
    svgImport: boolean;
  };
  position: { x: number; y: number };
}

export const CELL_SHAPES: CellShape[] = [
  "rounded-rect",
  "square",
  "circle",
  "diamond",
  "hexagon",
  "star",
];

export const PATTERNS: { value: AnimPattern; label: string }[] = [
  { value: "wave-diagonal", label: "Wave Diagonal" },
  { value: "expanding-pulse", label: "Expanding Pulse" },
  { value: "staircase", label: "Staircase" },
  { value: "scatter", label: "Scatter" },
  { value: "node-graph", label: "Node Graph" },
];

export const STYLES: { value: AnimStyle; label: string }[] = [
  { value: "pulse-size", label: "Pulse Size" },
  { value: "pulse-opacity", label: "Pulse Opacity" },
  { value: "pulse-color", label: "Pulse Color" },
];

export const BG_STYLES: { value: BgStyle; label: string }[] = [
  { value: "breathe", label: "Breathe" },
  { value: "none", label: "None" },
];
