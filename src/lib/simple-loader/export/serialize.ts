import type { AnimStyle, CellShape, GridType, LoaderColors, TriangularTessellation } from "@/lib/types";
import type { SimplePattern } from "../patterns";
import { REACT_TEMPLATE, CONFIG_MARKER } from "./react-template";

export interface PortableConfig {
  displayText: string;
  size: number;
  padding: number;
  grid: { size: number };
  gridType: GridType;
  triangularTessellation: TriangularTessellation;
  cellShape: CellShape;
  cellSizeFactor: number;
  animation: {
    pattern: SimplePattern;
    style: AnimStyle;
    fps: number;
  };
  colors: LoaderColors;
  transparentBg: boolean;
  glow: { enabled: boolean; size: number; intensity: number };
  shimmer: { enabled: boolean; speed: number; mode: "shimmer" | "shine" | "gradient" | "cursor"; base?: string; highlight?: string; stops?: [string, string, string] };
}

// Sandbox Instance shape — kept loose to avoid circular type imports.
interface Instance {
  id: string;
  displayText: string;
  pattern: SimplePattern;
  style: AnimStyle;
  shape: CellShape;
  fps: number;
  size: number;
  padding: number;
  gridSize: number;
  gridType: GridType;
  triangularTessellation: TriangularTessellation;
  cellSizeFactor: number;
  colors: LoaderColors;
  transparentBg: boolean;
  glow: { enabled: boolean; size: number; intensity: number };
  shimmer: { enabled: boolean; speed: number; mode: "shimmer" | "shine" | "gradient" | "cursor"; base?: string; highlight?: string; stops?: [string, string, string] };
}

export function instanceToConfig(inst: Instance): PortableConfig {
  return {
    displayText: inst.displayText,
    size: inst.size,
    padding: inst.padding,
    grid: { size: inst.gridSize },
    gridType: inst.gridType,
    triangularTessellation: inst.triangularTessellation,
    cellShape: inst.shape,
    cellSizeFactor: inst.cellSizeFactor,
    animation: {
      pattern: inst.pattern,
      style: inst.style,
      fps: inst.fps,
    },
    colors: inst.colors,
    transparentBg: inst.transparentBg,
    glow: inst.glow,
    shimmer: inst.shimmer,
  };
}

export function formatJson(config: PortableConfig): string {
  return JSON.stringify(config, null, 2);
}

export function buildReactSnippet(config: PortableConfig): string {
  const configLiteral = formatJson(config);
  return REACT_TEMPLATE.replace(CONFIG_MARKER, configLiteral);
}

export function buildHtmlSnippet(_config: PortableConfig): string {
  return `<!--\n  HTML export is coming soon. For now use the React tab\n  or paste the JSON config into your own runtime.\n-->\n`;
}
