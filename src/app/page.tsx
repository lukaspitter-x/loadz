"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, Eye, Pause, Play, Plus, Trash2, X } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { SimpleLoader } from "@/components/SimpleLoader";
import { ExportModal } from "@/components/ExportModal";
import {
  CELL_SHAPES,
  GRID_TYPES,
  STYLES,
  TRIANGULAR_TESSELLATIONS,
  type AnimStyle,
  type CellShape,
  type GridType,
  type LoaderColors,
  type TriangularTessellation,
} from "@/lib/types";
import {
  SIMPLE_PATTERNS,
  STATUS_DEFAULTS,
  type SimplePattern,
} from "@/lib/simple-loader/patterns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  paused: boolean;
  glow: { enabled: boolean; size: number; intensity: number };
  shimmer: {
    enabled: boolean;
    speed: number;
    mode: "shimmer" | "shine" | "gradient" | "cursor";
    base?: string;
    highlight?: string;
    stops?: [string, string, string];
  };
}

const DEFAULT_COLORS: LoaderColors = {
  primary: "#6CB4FF",
  inactiveCells: "#1f2937",
  background: "#101820",
  text: "#F5F5F5",
};

function freshId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function makeInstance(overrides: Partial<Instance> & { id?: string } = {}): Instance {
  return {
    id: overrides.id ?? freshId(),
    displayText: "Loading…",
    pattern: "wave-diagonal",
    style: "pulse-size",
    shape: "rounded-rect",
    fps: 24,
    size: 12,
    padding: 1,
    gridSize: 5,
    gridType: "square",
    triangularTessellation: "rows",
    cellSizeFactor: 0.5,
    colors: { ...DEFAULT_COLORS },
    transparentBg: false,
    paused: false,
    glow: { enabled: false, size: 0.8, intensity: 1.2 },
    shimmer: { enabled: false, speed: 1.2, mode: "shimmer" },
    ...overrides,
  };
}

const STORAGE_KEY = "simple-loader-sandbox-v1";

type PreviewMode = "default" | "large-off" | "original-only" | "large-only";
const PREVIEW_MODE_LABELS: Record<PreviewMode, string> = {
  "default": "Default",
  "large-off": "Large off",
  "original-only": "Original only",
  "large-only": "Large only",
};

// ---------- Random beautiful config ----------

const RANDOM_TEXTS = [
  "Loading…",
  "Thinking…",
  "Saving…",
  "Processing…",
  "Almost there…",
  "Just a moment…",
  "Working on it…",
  "Crunching…",
  "Syncing…",
  "Rendering…",
  "Warming up…",
  "Analyzing…",
  "Contemplating…",
  "Brewing…",
  "Spinning up…",
  "One sec…",
  "Hang tight…",
  "Fetching…",
  "Computing…",
  "Reticulating splines…",
];

// ---------- Palette library ----------
// Hand-tuned "vibe" palettes researched from cyberpunk / synthwave / vaporwave /
// Y2K / juice-pop references. Each carries its own GLOW profile — because glow is
// a taste decision: neon wants bloom, minimalist wants crisp, warm wants subtle.

type GlowProfile = { enabled: boolean; size: number; intensity: number };
type Palette = LoaderColors & { glow: GlowProfile; vibe: string };

const PALETTE_LIBRARY: Palette[] = [
  // Cyberpunk — full bloom, pink/cyan on black
  { vibe: "cyberpunk hot pink",   primary: "#FF2DAA", inactiveCells: "#00E5FF", background: "#050010", text: "#FFE5F8", glow: { enabled: true,  size: 1.4, intensity: 2.0 } },
  { vibe: "cyberpunk magenta",    primary: "#EA00D9", inactiveCells: "#0ABDC6", background: "#091833", text: "#F0E5FF", glow: { enabled: true,  size: 1.3, intensity: 2.2 } },
  { vibe: "neon alley",           primary: "#FF1493", inactiveCells: "#00F5FF", background: "#05030F", text: "#FFE5F0", glow: { enabled: true,  size: 1.5, intensity: 2.0 } },
  { vibe: "grid mirage",          primary: "#FF4F9A", inactiveCells: "#4A3FFF", background: "#090720", text: "#FFE5EF", glow: { enabled: true,  size: 1.3, intensity: 1.8 } },

  // Synthwave sunsets
  { vibe: "synthwave horizon",    primary: "#FF8BA7", inactiveCells: "#6B4EFF", background: "#120426", text: "#FFE5EF", glow: { enabled: true,  size: 1.0, intensity: 1.6 } },
  { vibe: "miami sunset",         primary: "#FF5C8A", inactiveCells: "#FFB347", background: "#1A0520", text: "#FFE5EF", glow: { enabled: true,  size: 1.1, intensity: 1.5 } },
  { vibe: "bubblegum highway",    primary: "#FF71CE", inactiveCells: "#FFA500", background: "#1A0820", text: "#FFECFF", glow: { enabled: true,  size: 1.2, intensity: 1.6 } },

  // Vaporwave — softer, pastel-on-dark
  { vibe: "vaporwave candy",      primary: "#FF71CE", inactiveCells: "#05FFA1", background: "#140028", text: "#F0D4FF", glow: { enabled: true,  size: 0.7, intensity: 1.2 } },
  { vibe: "vaporwave sky",        primary: "#01CDFE", inactiveCells: "#B967FF", background: "#0F0C29", text: "#E5FBFF", glow: { enabled: true,  size: 0.8, intensity: 1.3 } },
  { vibe: "neo lemon",            primary: "#FFFB96", inactiveCells: "#FF71CE", background: "#120020", text: "#FFFBE0", glow: { enabled: true,  size: 0.8, intensity: 1.3 } },

  // Acid pop — extreme chroma
  { vibe: "acid lime",            primary: "#39FF14", inactiveCells: "#FF006E", background: "#050505", text: "#E5FFE5", glow: { enabled: true,  size: 1.4, intensity: 2.2 } },
  { vibe: "toxic blaze",          primary: "#CCFF00", inactiveCells: "#FF3D00", background: "#0A0A00", text: "#F5FFE0", glow: { enabled: true,  size: 1.3, intensity: 2.0 } },
  { vibe: "electric iris",        primary: "#FFE500", inactiveCells: "#8338EC", background: "#0A0514", text: "#FFFCE5", glow: { enabled: true,  size: 1.2, intensity: 1.9 } },

  // Ocean electric
  { vibe: "arctic coral",         primary: "#4EE1D6", inactiveCells: "#FF6B9D", background: "#021024", text: "#E0FFFB", glow: { enabled: true,  size: 0.9, intensity: 1.4 } },
  { vibe: "azure pop",            primary: "#00D1FF", inactiveCells: "#FF006E", background: "#001933", text: "#E0F5FF", glow: { enabled: true,  size: 1.1, intensity: 1.6 } },
  { vibe: "glacier gold",         primary: "#7DD3FC", inactiveCells: "#FBBF24", background: "#0C1A2B", text: "#E0F2FE", glow: { enabled: false, size: 0.6, intensity: 1.0 } },

  // Blood moon / red family
  { vibe: "blood moon",           primary: "#FF0059", inactiveCells: "#FFB703", background: "#1A0005", text: "#FFE5EC", glow: { enabled: true,  size: 1.1, intensity: 1.8 } },
  { vibe: "scarlet ember",        primary: "#E63946", inactiveCells: "#F77F00", background: "#1A0008", text: "#FFE0E0", glow: { enabled: true,  size: 0.9, intensity: 1.5 } },

  // Forest / nature neon
  { vibe: "deep forest glow",     primary: "#3DFF77", inactiveCells: "#00B4D8", background: "#002114", text: "#D0FFD8", glow: { enabled: true,  size: 1.0, intensity: 1.5 } },
  { vibe: "moss & amber",         primary: "#A7F432", inactiveCells: "#FF9F1C", background: "#0A1400", text: "#ECFFD0", glow: { enabled: false, size: 0.6, intensity: 1.0 } },

  // Royal / luxurious
  { vibe: "royal gold",           primary: "#FFD700", inactiveCells: "#3A0CA3", background: "#000014", text: "#FFF8DC", glow: { enabled: true,  size: 0.9, intensity: 1.3 } },
  { vibe: "velvet lavender",      primary: "#A78BFA", inactiveCells: "#F9C54E", background: "#0D0822", text: "#F0EBFF", glow: { enabled: true,  size: 0.8, intensity: 1.2 } },
  { vibe: "champagne noir",       primary: "#F5E6D3", inactiveCells: "#B08968", background: "#0D0A08", text: "#F5E6D3", glow: { enabled: false, size: 0.5, intensity: 1.0 } },

  // Minimalist sharp — NO glow, pure contrast
  { vibe: "monochrome pop",       primary: "#FFFFFF", inactiveCells: "#3A3A3A", background: "#000000", text: "#F5F5F5", glow: { enabled: false, size: 0.6, intensity: 1.0 } },
  { vibe: "inked paper",          primary: "#111111", inactiveCells: "#555555", background: "#F5F5F5", text: "#111111", glow: { enabled: false, size: 0.6, intensity: 1.0 } },
  { vibe: "solar blackprint",     primary: "#FFB000", inactiveCells: "#D2691E", background: "#0A0705", text: "#FFF3D6", glow: { enabled: false, size: 0.6, intensity: 1.0 } },

  // Juice spectrum
  { vibe: "watermelon",           primary: "#FF3E6B", inactiveCells: "#3EE06A", background: "#14030A", text: "#FFE0E8", glow: { enabled: true,  size: 0.9, intensity: 1.5 } },
  { vibe: "mango tango",          primary: "#FF8C42", inactiveCells: "#FF3E6B", background: "#170A03", text: "#FFECD6", glow: { enabled: true,  size: 0.8, intensity: 1.3 } },
  { vibe: "lychee",               primary: "#FF477E", inactiveCells: "#FFD6E0", background: "#1A0712", text: "#FFE0EA", glow: { enabled: true,  size: 0.7, intensity: 1.2 } },
  { vibe: "tropical punch",       primary: "#FF1493", inactiveCells: "#FFD93D", background: "#100016", text: "#FFE5F0", glow: { enabled: true,  size: 1.1, intensity: 1.8 } },
];

// HSL→hex (for the procedural fallback)
function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = lN - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

type HarmonyScheme = "analogous" | "complementary" | "triadic" | "split";

function partnerHue(base: number, scheme: HarmonyScheme): number {
  switch (scheme) {
    case "analogous":     return (base + (Math.random() > 0.5 ? 30 : -30) + 360) % 360;
    case "complementary": return (base + 180) % 360;
    case "triadic":       return (base + (Math.random() > 0.5 ? 120 : 240)) % 360;
    case "split":         return (base + (Math.random() > 0.5 ? 150 : 210)) % 360;
  }
}

// Procedural fallback — biased toward HIGH chroma, real harmony, and high contrast.
function proceduralPalette(): Palette {
  const hue = Math.floor(Math.random() * 360);
  const scheme = pick(["analogous", "complementary", "complementary", "triadic", "split"] as const);
  const primary = hslToHex(hue, 78 + Math.random() * 18, 55 + Math.random() * 13);
  const inactiveHue = partnerHue(hue, scheme);
  const inactive = hslToHex(inactiveHue, 68 + Math.random() * 25, 48 + Math.random() * 17);
  const bgHue = Math.random() < 0.25 ? (hue + 180) % 360 : hue;
  const background = hslToHex(bgHue, 25 + Math.random() * 30, 3 + Math.random() * 5);
  const text = hslToHex(hue, 18 + Math.random() * 22, 90 + Math.random() * 7);
  const glow = Math.random() < 0.7
    ? { enabled: true, size: 0.8 + Math.random() * 0.8, intensity: 1.3 + Math.random() * 1.0 }
    : { enabled: false, size: 0.6, intensity: 1.0 };
  return { primary, inactiveCells: inactive, background, text, glow, vibe: `procedural-${scheme}` };
}

// 70% curated palette for guaranteed taste, 30% procedural for surprise.
function randomBeautifulPalette(): Palette {
  return Math.random() < 0.7 ? pick(PALETTE_LIBRARY) : proceduralPalette();
}

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hDeg = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hDeg = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: hDeg = (b - r) / d + 2; break;
      case b: hDeg = (r - g) / d + 4; break;
    }
    hDeg *= 60;
  }
  return [hDeg, s * 100, l * 100];
}

// Derive highlight options and a gradient trio from the palette's primary so
// text effects stay chromatically related to the loader animation.
function harmonizedFxColors(primary: string, text: string): {
  bases: string[];
  highlights: string[];
  trio: [string, string, string];
} {
  const [h, s, l] = hexToHsl(primary);
  const sClamped = Math.max(55, Math.min(95, s));
  const bright = hslToHex(h, sClamped, Math.min(85, l + 25));
  const light = hslToHex(h, Math.max(30, sClamped - 25), 92);
  const mutedPrimary = hslToHex(h, Math.max(25, sClamped - 35), Math.min(82, l + 18));
  const tintedText = hslToHex(h, 20, 88);
  const bases = [text, tintedText, mutedPrimary, light];
  const highlights = [bright, light, text, "#FFFFFF"];
  const trio: [string, string, string] = [
    hslToHex((h + 330) % 360, sClamped, Math.min(75, l + 15)),
    hslToHex(h, sClamped, Math.min(70, l + 10)),
    hslToHex((h + 40) % 360, sClamped, Math.min(78, l + 20)),
  ];
  return { bases, highlights, trio };
}

const TEXT_FX_MODES: ("shimmer" | "shine" | "gradient" | "cursor")[] = [
  "shimmer",
  "shine",
  "gradient",
  "cursor",
];

type Inheritable = Pick<Instance, "size" | "padding" | "cellSizeFactor" | "shape" | "gridSize" | "gridType" | "triangularTessellation">;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// The label sits on the app's dark chrome, not the palette background, so very
// dark text (e.g. the "inked paper" palette's #111) would be invisible. Floor
// the perceived luminance to keep labels readable.
function ensureReadableText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#F5F5F5";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.55 ? "#F5F5F5" : hex;
}

function randomBeautifulConfig(base: Inheritable, excludePattern?: SimplePattern): Partial<Instance> {
  // Pattern: any non-status (status glyphs carry semantic meaning; don't autogen),
  // and never the same as the caller's last pattern — back-to-back duplicates feel unintentional.
  // Particle/Network patterns are visually heavier and less broadly appealing;
  // keep them in the pool but at ~1/8 the weight of other patterns.
  const DEPRIORITIZED: SimplePattern[] = ["scatter", "node-graph", "constellation", "network-pulse", "molecular"];
  const candidates = SIMPLE_PATTERNS
    .filter((p) => p.group !== "Status" && p.value !== excludePattern)
    .flatMap((p) => DEPRIORITIZED.includes(p.value) ? [p.value] : [p.value, p.value, p.value, p.value, p.value, p.value, p.value, p.value]);
  const pattern = pick(candidates);
  const style = pick(["pulse-size", "pulse-opacity", "pulse-color"] as const);
  const fps = pick([18, 20, 24, 24, 24, 30, 36]);
  const palette = randomBeautifulPalette();
  // 20% chance to still override the palette's suggested glow with a surprise tweak
  const glow = Math.random() < 0.2
    ? (palette.glow.enabled
        ? { enabled: false, size: 0.8, intensity: 1.2 }                                           // flip bloom off occasionally
        : { enabled: true,  size: 0.8 + Math.random() * 0.6, intensity: 1.2 + Math.random() * 0.8 }) // or bloom a minimal palette
    : palette.glow;
  const displayText = pick(RANDOM_TEXTS);
  const shimmer = Math.random() < 0.5
    ? (() => {
        const mode = pick(TEXT_FX_MODES);
        const base = { enabled: true as const, speed: 0.8 + Math.random() * 1.4, mode };
        const fx = harmonizedFxColors(palette.primary, palette.text);
        if (mode === "shimmer" || mode === "shine") {
          return { ...base, base: pick(fx.bases), highlight: pick(fx.highlights) };
        }
        if (mode === "gradient") {
          return { ...base, stops: fx.trio };
        }
        return base;
      })()
    : { enabled: false, speed: 1.2, mode: "shimmer" as const };

  return {
    displayText,
    pattern,
    style,
    fps,
    gridSize: base.gridSize,
    colors: {
      primary: palette.primary,
      inactiveCells: palette.inactiveCells,
      background: palette.background,
      text: ensureReadableText(palette.text),
    },
    glow,
    shimmer,
    // inherited geometry
    size: base.size,
    padding: base.padding,
    cellSizeFactor: base.cellSizeFactor,
    shape: base.shape,
    gridType: base.gridType,
    triangularTessellation: base.triangularTessellation,
    transparentBg: false,
    paused: false,
  };
}

const DEFAULT_INSTANCE_OVERRIDES: Partial<Instance> = {
  displayText: "Thinking…",
  pattern: "flame",
  style: "pulse-opacity",
  shape: "rounded-rect",
  fps: 24,
  size: 12,
  padding: 1,
  gridSize: 4,
  gridType: "triangular",
  triangularTessellation: "rows",
  cellSizeFactor: 0.75,
  transparentBg: false,
  colors: {
    primary: "#F4C10A",
    inactiveCells: "#C54718",
    background: "#350101",
    text: "#FDA349",
  },
  glow: { enabled: true, size: 1.3, intensity: 1.8 },
  shimmer: { enabled: true, speed: 1.2, mode: "shimmer" },
};

const SECOND_DEFAULT_INSTANCE_OVERRIDES: Partial<Instance> = {
  displayText: "Syncing…",
  pattern: "ripples",
  style: "pulse-size",
  shape: "rounded-rect",
  fps: 20,
  size: 24,
  padding: 1,
  gridSize: 7,
  gridType: "square",
  cellSizeFactor: 0.5,
  transparentBg: false,
  colors: {
    primary: "#3DFF77",
    inactiveCells: "#00B4D8",
    background: "#002114",
    text: "#D0FFD8",
  },
  glow: { enabled: true, size: 1, intensity: 1.5 },
  shimmer: { enabled: false, speed: 1.2, mode: "shimmer" },
};

const THIRD_DEFAULT_INSTANCE_OVERRIDES: Partial<Instance> = {
  displayText: "Processing…",
  pattern: "ring",
  style: "pulse-size",
  shape: "rounded-rect",
  fps: 36,
  size: 8,
  padding: 1,
  gridSize: 3,
  gridType: "triangular",
  triangularTessellation: "diagonal-switch",
  cellSizeFactor: 0.75,
  transparentBg: false,
  colors: {
    primary: "#FF0059",
    inactiveCells: "#FFB703",
    background: "#1A0005",
    text: "#e1587d",
  },
  glow: { enabled: true, size: 1.1, intensity: 1.5 },
  shimmer: { enabled: true, speed: 1.2, mode: "shine" },
};

function seedInstances(): Instance[] {
  return [
    makeInstance({ id: "seed-1", ...DEFAULT_INSTANCE_OVERRIDES }),
    makeInstance({ id: "seed-2", ...SECOND_DEFAULT_INSTANCE_OVERRIDES }),
    makeInstance({ id: "seed-3", ...THIRD_DEFAULT_INSTANCE_OVERRIDES }),
  ];
}

interface PersistedState {
  instances: Instance[];
  selectedId: string;
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed?.instances?.length) return null;
    // Backfill any fields that may be missing if schema evolved
    const filled = parsed.instances.map((i) => {
      const merged: Instance = { ...makeInstance({ id: i.id }), ...i };
      // Migrate legacy tessellation value shipped briefly before the BL-TR /
      // BR-TL / Switch split.
      if ((merged.triangularTessellation as string) === "diagonal") {
        merged.triangularTessellation = "diagonal-bl-tr";
      }
      return merged;
    });
    const selectedId = filled.some((i) => i.id === parsed.selectedId)
      ? parsed.selectedId
      : filled[0].id;
    return { instances: filled, selectedId };
  } catch {
    return null;
  }
}

export default function Sandbox() {
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);

  // SSR/hydration must match → always start with deterministic seeds.
  // Persisted state is hydrated in a client-only effect after mount.
  const [instances, setInstances] = useState<Instance[]>(() => seedInstances());
  const [selectedId, setSelectedId] = useState<string>(instances[0].id);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted) {
      setInstances(persisted.instances);
      setSelectedId(persisted.selectedId);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ instances, selectedId } satisfies PersistedState),
      );
    } catch {
      // ignore quota / private-mode errors
    }
  }, [hydrated, instances, selectedId]);
  const selected = instances.find((i) => i.id === selectedId) ?? instances[0];
  const [expandedColor, setExpandedColor] = useState<keyof LoaderColors | null>(null);
  const [expandedFxColor, setExpandedFxColor] = useState<"base" | "highlight" | "stop0" | "stop1" | "stop2" | null>(null);
  const [exportInstanceId, setExportInstanceId] = useState<string | null>(null);
  const exportInstance = instances.find((i) => i.id === exportInstanceId) ?? null;
  const [previewMode, setPreviewMode] = useState<PreviewMode>("default");
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const previewMenuRef = useRef<HTMLDivElement | null>(null);
  const showLarge = previewMode === "default" || previewMode === "large-only";
  const showOriginal = previewMode === "default" || previewMode === "large-off" || previewMode === "original-only";
  const showChrome = previewMode === "default" || previewMode === "large-off";
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  // When the bottom-sheet is open on mobile, shrink each tile so the full
  // tile (controls + preview + label) fits in the slice of viewport above
  // the sheet.
  const compactTiles = isMobile && settingsOpen;

  // Keep the selected tile visible when editing — scroll it into the viewport
  // above the bottom-sheet on mobile, and into a comfortable center on desktop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = document.querySelector(`[data-inst-tile="${selectedId}"]`);
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      el.scrollIntoView({ behavior: "smooth", block: isMobile && settingsOpen ? "end" : "center" });
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedId, settingsOpen]);
  useEffect(() => {
    const v = window.localStorage.getItem("simple-loader-preview-mode");
    if (v === "default" || v === "large-off" || v === "original-only" || v === "large-only") {
      setPreviewMode(v);
      return;
    }
    // migrate old boolean key
    const legacy = window.localStorage.getItem("simple-loader-show-preview");
    if (legacy !== null) {
      setPreviewMode(legacy === "1" ? "default" : "large-off");
      window.localStorage.removeItem("simple-loader-show-preview");
    }
  }, []);
  useEffect(() => {
    window.localStorage.setItem("simple-loader-preview-mode", previewMode);
  }, [previewMode]);
  useEffect(() => {
    if (!previewMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!previewMenuRef.current?.contains(e.target as Node)) setPreviewMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [previewMenuOpen]);

  const [confirmingClear, setConfirmingClear] = useState(false);
  useEffect(() => {
    if (!confirmingClear) return;
    const t = setTimeout(() => setConfirmingClear(false), 5000);
    return () => clearTimeout(t);
  }, [confirmingClear]);
  const clearAll = () => {
    const fresh = seedInstances();
    setInstances(fresh);
    setSelectedId(fresh[0].id);
    setConfirmingClear(false);
  };

  const update = (patch: Partial<Instance>) =>
    setInstances((arr) => arr.map((i) => (i.id === selectedId ? { ...i, ...patch } : i)));
  const updatePattern = (p: SimplePattern) => {
    update({ pattern: p });
  };
  const updateColor = (key: keyof LoaderColors, hex: string) =>
    setInstances((arr) =>
      arr.map((i) => (i.id === selectedId ? { ...i, colors: { ...i.colors, [key]: hex } } : i)),
    );
  const addInstance = () => {
    const base: Inheritable = {
      size: selected.size,
      padding: selected.padding,
      cellSizeFactor: selected.cellSizeFactor,
      shape: selected.shape,
      gridSize: selected.gridSize,
      gridType: selected.gridType,
      triangularTessellation: selected.triangularTessellation,
    };
    const last = instances[instances.length - 1];
    const n = makeInstance(randomBeautifulConfig(base, last?.pattern));
    setInstances((arr) => [...arr, n]);
    setSelectedId(n.id);
  };
  const removeInstance = (id: string) => {
    setInstances((arr) => {
      if (arr.length <= 1) return arr;
      const idx = arr.findIndex((i) => i.id === id);
      const next = arr.filter((i) => i.id !== id);
      if (id === selectedId) {
        const neighbor = next[Math.max(0, idx - 1)] ?? next[0];
        setSelectedId(neighbor.id);
      }
      return next;
    });
  };

  // Backspace / Delete removes the selected loader (unless typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      // Don't delete if there's only one instance left or modal/picker is open.
      if (instances.length <= 1) return;
      if (exportInstanceId) return;
      if (expandedColor) return;
      e.preventDefault();
      removeInstance(selectedId);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [instances.length, selectedId, exportInstanceId, expandedColor]);

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-background text-foreground">
      <header className="h-12 shrink-0 border-b flex items-center px-4 justify-between sticky top-0 z-[60] bg-background">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold">Loadz</h1>
          <a
            href="https://github.com/lukaspitter-x/loadz"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.73.5.67 5.56.67 11.83c0 4.99 3.24 9.22 7.73 10.72.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.14.68-3.8-1.34-3.8-1.34-.51-1.3-1.26-1.65-1.26-1.65-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.74 2.66 1.24 3.31.95.1-.73.4-1.24.72-1.52-2.51-.29-5.15-1.26-5.15-5.6 0-1.24.44-2.25 1.17-3.04-.12-.29-.51-1.44.11-3 0 0 .95-.3 3.12 1.16.9-.25 1.87-.37 2.83-.38.96 0 1.93.13 2.83.38 2.17-1.47 3.12-1.16 3.12-1.16.62 1.56.23 2.71.11 3 .73.79 1.17 1.8 1.17 3.04 0 4.35-2.65 5.3-5.17 5.58.41.36.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.13 0 .3.2.66.79.55 4.49-1.5 7.72-5.73 7.72-10.72C23.33 5.56 18.27.5 12 .5z"/>
            </svg>
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] text-muted-foreground font-mono">{instances.length} instance{instances.length === 1 ? "" : "s"}</span>
          <div ref={previewMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setPreviewMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background hover:bg-accent min-h-10 px-3 text-xs font-medium transition-colors md:min-h-0 md:px-2.5 md:py-1"
              title="Preview mode"
              aria-haspopup="menu"
              aria-expanded={previewMenuOpen}
            >
              <Eye size={12} />
              <span className="hidden sm:inline">{PREVIEW_MODE_LABELS[previewMode]}</span>
            </button>
            {previewMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-[60] mt-1 w-44 rounded-md border border-border bg-popover shadow-md overflow-hidden"
              >
                {(Object.keys(PREVIEW_MODE_LABELS) as PreviewMode[]).map((mode) => {
                  const active = mode === previewMode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => { setPreviewMode(mode); setPreviewMenuOpen(false); }}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${active ? "bg-accent text-foreground" : "hover:bg-accent/50"}`}
                    >
                      <span>{PREVIEW_MODE_LABELS[mode]}</span>
                      {active && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {confirmingClear ? (
            <div className="inline-flex items-center gap-1 rounded-md border border-destructive/60 bg-destructive/10 min-h-10 px-3 md:min-h-0 md:px-2.5 md:py-1">
              <span className="text-xs text-destructive font-medium">Clear all?</span>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                aria-label="Cancel"
                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-xs font-medium hover:bg-background transition-colors md:h-auto md:w-auto md:px-2 md:py-0.5"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={clearAll}
                aria-label="Clear"
                className="inline-flex items-center justify-center rounded-md border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 w-8 text-xs font-medium transition-colors md:h-auto md:w-auto md:px-2 md:py-0.5"
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              disabled={instances.length <= 1}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed min-h-10 px-3 text-xs font-medium transition-colors md:min-h-0 md:px-2.5 md:py-1"
              title="Clear all loaders"
            >
              <Trash2 size={12} /> <span className="hidden sm:inline">Clear</span>
            </button>
          )}
          <button
            type="button"
            onClick={addInstance}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background hover:bg-accent min-h-10 px-3 text-xs font-medium transition-colors md:min-h-0 md:px-2.5 md:py-1"
          >
            <Plus size={12} /> <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className={`flex-1 overflow-auto p-4 md:p-6 md:pb-6 ${settingsOpen ? "pb-[65vh]" : "pb-24"}`}>
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: showLarge
                ? "repeat(auto-fill, minmax(260px, 1fr))"
                : "repeat(auto-fill, minmax(220px, 1fr))",
            }}
          >
            {instances.map((inst, idx) => {
              const active = inst.id === selectedId;
              return (
                <div
                  key={inst.id}
                  data-inst-tile={inst.id}
                  style={{
                    scrollMarginTop: 16,
                    // On mobile with the settings sheet open, reserve the
                    // sheet's height (60vh) plus a comfy gap so the tile
                    // settles above the sheet, fully visible.
                    scrollMarginBottom: settingsOpen ? "calc(60vh + 16px)" : 24,
                  }}
                  onClick={() => {
                    setSelectedId(inst.id);
                    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
                      setSettingsOpen(true);
                    }
                  }}
                  className={
                    showChrome
                      ? `group flex flex-col gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                          active ? "border-primary/80 bg-accent/20" : "border-border hover:bg-accent/10"
                        }`
                      : `group flex flex-col ${previewMode === "original-only" ? "items-start" : "items-center"} justify-center gap-2 p-4 cursor-pointer rounded-lg transition-colors ${active ? "ring-1 ring-primary/80" : ""}`
                  }
                >
                  {showChrome && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="font-mono text-[10px] mr-1 text-muted-foreground">#{idx + 1}</Badge>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextPaused = !inst.paused;
                        setInstances((arr) => arr.map((i) => (i.id === inst.id ? { ...i, paused: nextPaused } : i)));
                      }}
                      className={`inline-flex items-center justify-center rounded-md min-h-10 min-w-10 p-2.5 transition-colors md:min-h-0 md:min-w-0 md:p-1 ${inst.paused ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                      aria-label={inst.paused ? "Resume" : "Pause"}
                      title={inst.paused ? "Resume" : "Pause (freeze frame)"}
                    >
                      {inst.paused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExportInstanceId(inst.id);
                      }}
                      className="inline-flex items-center justify-center rounded-md min-h-10 min-w-10 p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:min-h-0 md:min-w-0 md:p-1"
                      aria-label="Export loader"
                      title="Export loader"
                    >
                      <Download size={14} />
                    </button>
                    {instances.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeInstance(inst.id);
                        }}
                        className="inline-flex items-center justify-center rounded-md min-h-10 min-w-10 p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors md:min-h-0 md:min-w-0 md:p-1"
                        aria-label="Delete loader"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  )}

                  {showLarge && (
                    <div
                      className="flex items-center justify-center"
                      style={{ height: compactTiles ? 88 : 144 }}
                    >
                      <SimpleLoader
                        displayText=""
                        grid={{ size: inst.gridSize }}
                        gridType={inst.gridType}
                        triangularTessellation={inst.triangularTessellation}
                        cellShape={inst.shape}
                        animation={{ pattern: inst.pattern, style: inst.style, fps: inst.fps }}
                        colors={inst.colors}
                        transparentBg={inst.transparentBg}
                        glow={inst.glow}
                        size={inst.size}
                        padding={inst.padding}
                        cellSizeFactor={inst.cellSizeFactor}
                        shimmer={inst.shimmer}
                        paused={inst.paused}
                        displayPx={compactTiles ? 72 : 120}
                      />
                    </div>
                  )}

                  {showOriginal && (
                    <div className="min-h-[20px] overflow-hidden">
                      <SimpleLoader
                        displayText={inst.displayText}
                        grid={{ size: inst.gridSize }}
                        gridType={inst.gridType}
                        triangularTessellation={inst.triangularTessellation}
                        cellShape={inst.shape}
                        animation={{ pattern: inst.pattern, style: inst.style, fps: inst.fps }}
                        colors={inst.colors}
                        transparentBg={inst.transparentBg}
                        glow={inst.glow}
                        size={inst.size}
                        padding={inst.padding}
                        cellSizeFactor={inst.cellSizeFactor}
                        shimmer={inst.shimmer}
                        paused={inst.paused}
                        dataId={inst.id}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={addInstance}
              style={{ minHeight: showLarge ? (compactTiles ? 180 : 240) : 88 }}
              className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/60 hover:text-foreground hover:bg-accent/10 transition-colors cursor-pointer h-full"
              aria-label="Add loader"
              title="Add loader"
            >
              <Plus size={28} strokeWidth={1.5} />
            </button>
          </div>
        </main>

        <aside
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          className={`flex flex-col bg-zinc-900 md:bg-background
            md:static md:w-80 md:shrink-0 md:border-l md:h-auto md:max-h-none md:rounded-none md:translate-y-0 md:overflow-y-auto
            fixed inset-x-0 bottom-0 z-50 max-h-[60vh] rounded-t-xl border-t border-border overflow-y-auto
            transition-transform duration-300 ease-out
            ${settingsOpen ? "translate-y-0" : "translate-y-full md:translate-y-0"}`}
        >
          <div className="flex items-center justify-between pl-4 pr-1 py-2 border-b sticky top-0 bg-zinc-900 md:bg-background z-10">
            <h2 className="text-sm font-semibold">Settings</h2>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="md:hidden inline-flex items-center justify-center h-12 w-12 -mr-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors rounded-md"
              aria-label="Close settings"
            >
              <X size={22} />
            </button>
          </div>

          <div className="p-3 space-y-2">
            <Section title="Display Text">
              <Input value={selected.displayText} onChange={(e) => update({ displayText: e.target.value })} maxLength={40} />
            </Section>

            <Group title="Persisting">
            <Section title="Loader Size">
              <div className="flex gap-1 flex-wrap">
                {[8, 12, 16, 20, 24, 28, 32].map((n) => {
                  const active = selected.size === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        const maxPad = Math.floor((n - 2) / 2);
                        const clampedPad = Math.min(selected.padding, maxPad);
                        update({ size: n, padding: clampedPad });
                      }}
                      className={`h-11 px-3 min-w-11 md:h-8 md:px-2 md:min-w-8 rounded-md border text-sm md:text-xs font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent border-border text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">Divisible by 4 · pixel-art canvas</p>
            </Section>

            <Section title="Padding">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs">Inner padding</Label>
                  <NumberField
                    value={selected.padding}
                    min={0}
                    max={Math.floor((selected.size - 2) / 2)}
                    step={1}
                    decimals={0}
                    suffix="px"
                    onChange={(n) => update({ padding: n })}
                  />
                </div>
                <Slider
                  min={0}
                  max={Math.floor((selected.size - 2) / 2)}
                  step={1}
                  value={selected.padding}
                  onValueChange={(v) => update({ padding: Array.isArray(v) ? v[0] : (v as number) })}
                />
              </div>
            </Section>

            <Section title="Grid">
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                    const active = selected.gridSize === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => update({ gridSize: n })}
                        className={`h-11 w-11 md:h-8 md:w-8 rounded-md border text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-accent border-border text-foreground"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1">
                  {GRID_TYPES.map((gt) => {
                    const active = selected.gridType === gt.value;
                    return (
                      <button
                        key={gt.value}
                        type="button"
                        onClick={() => update({ gridType: gt.value })}
                        className={`flex-1 h-11 md:h-8 rounded-md border text-sm md:text-xs font-medium transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-accent border-border text-foreground"
                        }`}
                      >
                        {gt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Section>

            <Section title="Cell Size">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs">Factor</Label>
                  <NumberField
                    value={selected.cellSizeFactor}
                    min={0.3}
                    max={1.5}
                    step={0.05}
                    decimals={2}
                    suffix="×"
                    onChange={(n) => update({ cellSizeFactor: n })}
                  />
                </div>
                <Slider
                  min={0.3}
                  max={1.5}
                  step={0.05}
                  value={selected.cellSizeFactor}
                  onValueChange={(v) =>
                    update({ cellSizeFactor: Array.isArray(v) ? v[0] : (v as number) })
                  }
                />
              </div>
            </Section>

            {selected.gridType === "triangular" ? (
              <Section title="Cell Shape">
                <SelectField
                  value={selected.triangularTessellation}
                  onChange={(v) => update({ triangularTessellation: v as TriangularTessellation })}
                  options={TRIANGULAR_TESSELLATIONS.map((t) => ({ value: t.value, label: t.label }))}
                />
              </Section>
            ) : (
              <Section title="Cell Shape">
                <SelectField
                  value={selected.shape}
                  onChange={(v) => update({ shape: v as CellShape })}
                  options={CELL_SHAPES.map((s) => ({ value: s, label: s.replace("-", " ") }))}
                  capitalize
                />
              </Section>
            )}
            </Group>

            <Group title="Randomly changed">
            <Section title="Animation">
              <div className="space-y-4">
                <div className="rounded-md border border-primary/40 bg-primary/5 p-2.5 space-y-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Pattern</Label>
                  <SelectField
                    value={selected.pattern}
                    onChange={(v) => updatePattern(v as SimplePattern)}
                    options={SIMPLE_PATTERNS.map((p) => ({ value: p.value, label: p.label }))}
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const i = SIMPLE_PATTERNS.findIndex((p) => p.value === selected.pattern);
                        const next = SIMPLE_PATTERNS[(i - 1 + SIMPLE_PATTERNS.length) % SIMPLE_PATTERNS.length];
                        updatePattern(next.value);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-11 md:h-7 rounded-md border border-border bg-background hover:bg-accent text-sm md:text-xs font-medium transition-colors"
                      aria-label="Previous pattern"
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const i = SIMPLE_PATTERNS.findIndex((p) => p.value === selected.pattern);
                        const next = SIMPLE_PATTERNS[(i + 1) % SIMPLE_PATTERNS.length];
                        updatePattern(next.value);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 h-11 md:h-7 rounded-md border border-border bg-background hover:bg-accent text-sm md:text-xs font-medium transition-colors"
                      aria-label="Next pattern"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs">FPS</Label>
                    <NumberField
                      value={selected.fps}
                      min={3}
                      max={60}
                      step={1}
                      decimals={0}
                      onChange={(n) => update({ fps: n })}
                    />
                  </div>
                  <Slider
                    min={3}
                    max={60}
                    step={1}
                    value={selected.fps}
                    onValueChange={(v) => update({ fps: Array.isArray(v) ? v[0] : (v as number) })}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs">Animation Style</Label>
                  <SelectField value={selected.style} onChange={(v) => update({ style: v as AnimStyle })} options={STYLES} />
                </div>
              </div>
            </Section>


            <Section title="Text Effect">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Enabled</Label>
                  <Switch
                    checked={selected.shimmer.enabled}
                    onCheckedChange={(v) => update({ shimmer: { ...selected.shimmer, enabled: v } })}
                  />
                </div>
                {selected.shimmer.enabled && (
                  <>
                    <div>
                      <Label className="mb-1.5 text-xs">Mode</Label>
                      <SelectField
                        value={selected.shimmer.mode}
                        onChange={(v) => update({ shimmer: { ...selected.shimmer, mode: v as "shimmer" | "shine" | "gradient" | "cursor" } })}
                        options={[
                          { value: "shimmer", label: "Shimmer (brightness wave)" },
                          { value: "shine", label: "Shine (dim base + bright pulse)" },
                          { value: "gradient", label: "Gradient (multi-hue sweep)" },
                          { value: "cursor", label: "Blinking cursor" },
                        ]}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs">Speed</Label>
                        <NumberField
                          value={selected.shimmer.speed}
                          min={0.2}
                          max={3}
                          step={0.1}
                          decimals={1}
                          suffix="x"
                          onChange={(n) => update({ shimmer: { ...selected.shimmer, speed: n } })}
                        />
                      </div>
                      <Slider
                        min={0.2}
                        max={3}
                        step={0.1}
                        value={selected.shimmer.speed}
                        onValueChange={(v) =>
                          update({
                            shimmer: {
                              ...selected.shimmer,
                              speed: Array.isArray(v) ? v[0] : (v as number),
                            },
                          })
                        }
                      />
                    </div>
                    {(selected.shimmer.mode === "shimmer" || selected.shimmer.mode === "shine") && (
                      <div className="space-y-2">
                        <Label className="text-xs">Text Effect Colors</Label>
                        <ColorRow
                          label="Base 50%"
                          hex={selected.shimmer.base ?? selected.colors.text}
                          expanded={expandedFxColor === "base"}
                          onToggle={() => setExpandedFxColor(expandedFxColor === "base" ? null : "base")}
                          onChange={(hex) => update({ shimmer: { ...selected.shimmer, base: hex } })}
                        />
                        <ColorRow
                          label="Highlight"
                          hex={selected.shimmer.highlight ?? selected.colors.text}
                          expanded={expandedFxColor === "highlight"}
                          onToggle={() => setExpandedFxColor(expandedFxColor === "highlight" ? null : "highlight")}
                          onChange={(hex) => update({ shimmer: { ...selected.shimmer, highlight: hex } })}
                        />
                      </div>
                    )}
                    {selected.shimmer.mode === "gradient" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Gradient Colors</Label>
                        {([0, 1, 2] as const).map((i) => {
                          const defaults: [string, string, string] = ["#6CB4FF", "#BD93F9", "#F5A3C7"];
                          const stops = selected.shimmer.stops ?? defaults;
                          const key = (`stop${i}`) as "stop0" | "stop1" | "stop2";
                          return (
                            <ColorRow
                              key={key}
                              label={`Color ${i + 1}`}
                              hex={stops[i]}
                              expanded={expandedFxColor === key}
                              onToggle={() => setExpandedFxColor(expandedFxColor === key ? null : key)}
                              onChange={(hex) => {
                                const next: [string, string, string] = [...stops];
                                next[i] = hex;
                                update({ shimmer: { ...selected.shimmer, stops: next } });
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </Section>


            <Section title="Glow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Enabled</Label>
                  <Switch
                    checked={selected.glow.enabled}
                    onCheckedChange={(v) => update({ glow: { ...selected.glow, enabled: v } })}
                  />
                </div>
                {selected.glow.enabled && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs">Size</Label>
                        <NumberField
                          value={selected.glow.size}
                          min={0.1}
                          max={3}
                          step={0.1}
                          decimals={1}
                          onChange={(n) => update({ glow: { ...selected.glow, size: n } })}
                        />
                      </div>
                      <Slider
                        min={0.1}
                        max={3}
                        step={0.1}
                        value={selected.glow.size}
                        onValueChange={(v) =>
                          update({
                            glow: { ...selected.glow, size: Array.isArray(v) ? v[0] : (v as number) },
                          })
                        }
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs">Intensity</Label>
                        <NumberField
                          value={selected.glow.intensity}
                          min={0.2}
                          max={4}
                          step={0.1}
                          decimals={1}
                          suffix="x"
                          onChange={(n) => update({ glow: { ...selected.glow, intensity: n } })}
                        />
                      </div>
                      <Slider
                        min={0.2}
                        max={4}
                        step={0.1}
                        value={selected.glow.intensity}
                        onValueChange={(v) =>
                          update({
                            glow: {
                              ...selected.glow,
                              intensity: Array.isArray(v) ? v[0] : (v as number),
                            },
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </Section>


            <Section title="Colors">
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-sm font-medium">Transparent background</Label>
                <Switch
                  checked={selected.transparentBg}
                  onCheckedChange={(v) => update({ transparentBg: v })}
                />
              </div>
              <div className="space-y-2">
                {(
                  [
                    ["primary", "Primary"],
                    ["inactiveCells", "Inactive Cells"],
                    ...(selected.transparentBg ? [] : [["background", "Background"] as const]),
                    ["text", "Text"],
                  ] as const
                ).map(([key, label]) => (
                  <ColorRow
                    key={key}
                    label={label}
                    hex={selected.colors[key] ?? "#000000"}
                    expanded={expandedColor === key}
                    onToggle={() => setExpandedColor(expandedColor === key ? null : key)}
                    onChange={(hex) => updateColor(key, hex)}
                  />
                ))}
              </div>
            </Section>
            </Group>
          </div>
        </aside>
      </div>
      {!settingsOpen && (
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="md:hidden fixed bottom-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-border bg-background shadow-lg px-4 py-2.5 text-xs font-medium hover:bg-accent transition-colors"
          aria-label="Open settings"
        >
          Settings
        </button>
      )}
      <ExportModal
        instance={exportInstance}
        open={!!exportInstance}
        onClose={() => setExportInstanceId(null)}
      />
    </div>
  );
}

function NumberField({
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  decimals,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  suffix?: string;
  decimals: number;
}) {
  const format = (n: number) => (decimals > 0 ? n.toFixed(decimals) : String(Math.round(n)));
  const [draft, setDraft] = useState<string>(format(value));
  useEffect(() => {
    setDraft(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals]);
  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) {
      setDraft(format(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    const snapped = Math.round(clamped / step) * step;
    const rounded = decimals > 0 ? parseFloat(snapped.toFixed(decimals)) : Math.round(snapped);
    onChange(rounded);
    setDraft(format(rounded));
  };
  return (
    <div className="inline-flex items-center gap-0.5">
      <input
        suppressHydrationWarning
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(format(value));
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="h-5 w-10 rounded-sm border border-border bg-background px-1 text-right text-[10px] font-mono text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/40"
      />
      {suffix && <span className="text-[10px] font-mono text-muted-foreground">{suffix}</span>}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 pt-1">
      <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/70">
        {title}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-card/40">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/70">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function SelectField<T extends string>({
  value,
  onChange,
  options,
  capitalize,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  capitalize?: boolean;
}) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className={`w-full ${capitalize ? "capitalize" : ""}`}>
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className={capitalize ? "capitalize" : ""}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ColorRow({
  label,
  hex,
  onChange,
  expanded,
  onToggle,
}: {
  label: string;
  hex: string;
  onChange: (hex: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-md border transition-colors ${
        expanded ? "border-border bg-accent/30" : "border-transparent"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 rounded-md px-2 py-2 transition-colors ${
          expanded ? "bg-accent/40" : "hover:bg-accent/40"
        }`}
      >
        <span
          className="w-5 h-5 rounded border border-border shrink-0"
          style={{ backgroundColor: hex }}
        />
        <span className={`text-sm flex-1 text-left ${expanded ? "font-medium" : ""}`}>{label}</span>
        <span className="text-xs font-mono text-muted-foreground uppercase">{hex}</span>
        {expanded && (
          <X size={14} className="text-muted-foreground shrink-0" aria-hidden />
        )}
      </button>
      {expanded && (
        <div className="space-y-2 px-3 pb-3 pt-1 border-t border-border/60">
          <div className="[&_.react-colorful]:w-full [&_.react-colorful]:h-40">
            <HexColorPicker color={hex} onChange={onChange} />
          </div>
          <Input
            value={hex}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) {
                onChange(v.startsWith("#") ? v : `#${v}`);
              }
            }}
            className="font-mono text-xs"
          />
          <div className="flex gap-1 flex-wrap">
            {["#6CB4FF", "#BD93F9", "#3DFF77", "#FFB347", "#FF6B6B", "#F5F5F5", "#101820", "#000000"].map(
              (preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange(preset)}
                  className="w-9 h-9 md:w-5 md:h-5 rounded border border-border"
                  style={{ backgroundColor: preset }}
                  aria-label={preset}
                />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
