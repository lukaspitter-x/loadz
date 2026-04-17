import { create } from "zustand";
import type { LoaderConfig, AnimPattern, CellShape } from "./types";

const CARD_W = 280;
const CARD_H = 280;
const COLS = 2;
const GAP = 48;

function gridPosition(index: number) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: col * (CARD_W + GAP),
    y: row * (CARD_H + GAP),
  };
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

export const DEFAULT_LOADER = (
  id: string,
  name: string,
  index: number,
  pattern: AnimPattern = "wave-diagonal",
  shape: CellShape = "rounded-rect",
  primary: string = "#6CB4FF",
): LoaderConfig => ({
  id,
  displayText: name,
  grid: { size: 5 },
  cellShape: shape,
  animation: {
    pattern,
    fps: 24,
    style: "pulse-size",
    backgroundStyle: "breathe",
  },
  colors: {
    primary,
    inactiveCells: "#101820",
    background: "#000000",
    text: "#FFFFFF",
  },
  features: {
    builder: false,
    effects: false,
    nodes: pattern === "node-graph",
    textShimmer: { enabled: false, speed: 1 },
    imageMask: false,
    aiGeneration: false,
    svgImport: false,
  },
  position: gridPosition(index),
});

interface LoaderStore {
  loaders: LoaderConfig[];
  selectedId: string | null;
  theme: "dark" | "light";
  hydrated: boolean;
  addLoader: () => string;
  removeLoader: (id: string) => void;
  selectLoader: (id: string | null) => void;
  updateLoader: (id: string, patch: Partial<LoaderConfig>) => void;
  updateLoaderDeep: (id: string, updater: (l: LoaderConfig) => LoaderConfig) => void;
  moveLoader: (id: string, x: number, y: number) => void;
  toggleTheme: () => void;
  setTheme: (t: "dark" | "light") => void;
  hydrateFrom: (loaders: LoaderConfig[]) => void;
}

export const useLoaderStore = create<LoaderStore>((set) => ({
  loaders: [
    DEFAULT_LOADER("1", "Thinking", 0, "wave-diagonal", "rounded-rect", "#6CB4FF"),
    DEFAULT_LOADER("2", "Reading Docs", 1, "node-graph", "circle", "#3DFF77"),
    DEFAULT_LOADER("3", "Analysing", 2, "scatter", "circle", "#FFB347"),
    DEFAULT_LOADER("4", "Debugging", 3, "staircase", "square", "#BD93F9"),
  ],
  selectedId: "4",
  theme: "dark",
  hydrated: false,
  addLoader: () => {
    const id = newId();
    set((s) => {
      const index = s.loaders.length;
      const next = DEFAULT_LOADER(id, `Loader ${index + 1}`, index);
      return { loaders: [...s.loaders, next], selectedId: id };
    });
    return id;
  },
  removeLoader: (id) =>
    set((s) => {
      const loaders = s.loaders.filter((l) => l.id !== id);
      const selectedId =
        s.selectedId === id ? (loaders[loaders.length - 1]?.id ?? null) : s.selectedId;
      return { loaders, selectedId };
    }),
  selectLoader: (id) => set({ selectedId: id }),
  updateLoader: (id, patch) =>
    set((s) => ({
      loaders: s.loaders.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),
  updateLoaderDeep: (id, updater) =>
    set((s) => ({
      loaders: s.loaders.map((l) => (l.id === id ? updater(l) : l)),
    })),
  moveLoader: (id, x, y) =>
    set((s) => ({
      loaders: s.loaders.map((l) => (l.id === id ? { ...l, position: { x, y } } : l)),
    })),
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  setTheme: (theme) => set({ theme }),
  hydrateFrom: (loaders) =>
    set({ loaders, selectedId: loaders[0]?.id ?? null, hydrated: true }),
}));

export const CARD_SIZE = { w: CARD_W, h: CARD_H };
