export type CellShape =
  | "rounded-rect"
  | "square"
  | "circle"
  | "diamond"
  | "hexagon"
  | "star"
  // Internal shapes used by the triangular grid tessellations. Not exposed in
  // the user-facing Cell Shape picker.
  // - triangle-up / triangle-down: isoceles (base = height = cell size), used
  //   by the "rows" tessellation (horizontal strips).
  // - triangle-ur / triangle-dl: right triangles that are the upper-right and
  //   lower-left halves of a square split along the ↘ diagonal (TL→BR), used
  //   by the "diagonal" tessellation.
  | "triangle-up"
  | "triangle-down"
  // Right triangles — halves of a square split along a diagonal. Naming
  // indicates which corner of the square the triangle's right-angle occupies:
  // -ur / -dl are halves of a ↘ (TL→BR) split; -ul / -dr are halves of a ↗
  // (BL→TR) split.
  | "triangle-ur"
  | "triangle-dl"
  | "triangle-ul"
  | "triangle-dr";

export type TriangularTessellation =
  | "rows"
  | "diagonal-bl-tr"   // ↘ split: triangles occupy BL + TR corners of each cell
  | "diagonal-br-tl"   // ↗ split: triangles occupy BR + TL corners of each cell
  | "diagonal-switch"; // alternates BL-TR / BR-TL in a checkerboard

export const TRIANGULAR_TESSELLATIONS: { value: TriangularTessellation; label: string }[] = [
  { value: "rows", label: "Rows" },
  { value: "diagonal-bl-tr", label: "Diagonal BL TR" },
  { value: "diagonal-br-tl", label: "Diagonal BR TL" },
  { value: "diagonal-switch", label: "Diagonal Switch" },
];

export type GridType = "square" | "triangular";

export const GRID_TYPES: { value: GridType; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "triangular", label: "Triangular" },
];

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
