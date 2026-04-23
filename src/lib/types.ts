export type CellShape =
  | "rounded-rect"
  | "square"
  | "circle"
  | "diamond"
  | "hexagon"
  | "star";

export type AnimStyle = "pulse-size" | "pulse-opacity" | "pulse-color";

export interface LoaderColors {
  primary: string;
  inactiveCells: string;
  background: string;
  text: string;
}

export const CELL_SHAPES: CellShape[] = [
  "rounded-rect",
  "square",
  "circle",
  "diamond",
  "hexagon",
  "star",
];

export const STYLES: { value: AnimStyle; label: string }[] = [
  { value: "pulse-size", label: "Pulse Size" },
  { value: "pulse-opacity", label: "Pulse Opacity" },
  { value: "pulse-color", label: "Pulse Color" },
];
