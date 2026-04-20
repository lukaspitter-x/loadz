"use client";

import { useEffect, useState } from "react";
import { Download, Pause, Play, Plus, X } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { SimpleLoader } from "@/components/SimpleLoader";
import { ExportModal } from "@/components/ExportModal";
import {
  BG_STYLES,
  CELL_SHAPES,
  STYLES,
  type AnimStyle,
  type BgStyle,
  type CellShape,
  type LoaderColors,
} from "@/lib/types";
import {
  SIMPLE_PATTERNS,
  STATUS_DEFAULTS,
  type SimplePattern,
} from "@/lib/simple-loader/patterns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
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
  bg: BgStyle;
  fps: number;
  gridSize: number;
  cellSizeFactor: number;
  colors: LoaderColors;
  transparentBg: boolean;
  paused: boolean;
  glow: { enabled: boolean; size: number; intensity: number };
  shimmer: { enabled: boolean; speed: number; mode: "shimmer" | "shine" | "gradient" | "cursor" };
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
    bg: "none",
    fps: 24,
    gridSize: 5,
    cellSizeFactor: 1,
    colors: { ...DEFAULT_COLORS },
    transparentBg: false,
    paused: false,
    glow: { enabled: false, size: 0.8, intensity: 1.2 },
    shimmer: { enabled: false, speed: 1.2, mode: "shimmer" },
    ...overrides,
  };
}

const STORAGE_KEY = "simple-loader-sandbox-v1";

function seedInstances(): Instance[] {
  return [
    makeInstance({ id: "seed-1", displayText: "Loading…" }),
    makeInstance({ id: "seed-2", displayText: "Thinking…", pattern: "expanding-pulse", colors: { ...DEFAULT_COLORS, primary: "#BD93F9" } }),
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
    const filled = parsed.instances.map((i) => ({
      ...makeInstance({ id: i.id }),
      ...i,
    }));
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
  const [exportInstanceId, setExportInstanceId] = useState<string | null>(null);
  const exportInstance = instances.find((i) => i.id === exportInstanceId) ?? null;

  const update = (patch: Partial<Instance>) =>
    setInstances((arr) => arr.map((i) => (i.id === selectedId ? { ...i, ...patch } : i)));
  const updatePattern = (p: SimplePattern) => {
    const status = STATUS_DEFAULTS[p as keyof typeof STATUS_DEFAULTS];
    if (status) {
      update({ pattern: p, colors: { ...selected.colors, primary: status.primary, background: status.background } });
    } else {
      update({ pattern: p });
    }
  };
  const updateColor = (key: keyof LoaderColors, hex: string) =>
    setInstances((arr) =>
      arr.map((i) => (i.id === selectedId ? { ...i, colors: { ...i.colors, [key]: hex } } : i)),
    );
  const addInstance = () => {
    const n = makeInstance();
    setInstances((arr) => [...arr, n]);
    setSelectedId(n.id);
  };
  const removeInstance = (id: string) => {
    setInstances((arr) => {
      if (arr.length <= 1) return arr;
      const next = arr.filter((i) => i.id !== id);
      if (id === selectedId) setSelectedId(next[0].id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      <header className="h-12 shrink-0 border-b flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold">Simple Loader Sandbox</h1>
          <Badge variant="outline" className="font-mono text-[10px]">12×12</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">{instances.length} instance{instances.length === 1 ? "" : "s"}</span>
          <button
            type="button"
            onClick={addInstance}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-accent px-2.5 py-1 text-xs font-medium transition-colors"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-8">
          <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            {instances.map((inst, idx) => {
              const active = inst.id === selectedId;
              return (
                <div
                  key={inst.id}
                  onClick={() => setSelectedId(inst.id)}
                  className={`group flex items-center gap-8 rounded-lg border p-6 cursor-pointer transition-colors ${
                    active ? "border-primary/80 bg-accent/20" : "border-border hover:bg-accent/10"
                  }`}
                >
                  <div className="flex items-center justify-center shrink-0" style={{ width: 144, height: 144 }}>
                    <div style={{ transform: "scale(10)", transformOrigin: "center" }}>
                      <SimpleLoader
                        displayText=""
                        grid={{ size: inst.gridSize }}
                        cellShape={inst.shape}
                        animation={{ pattern: inst.pattern, style: inst.style, fps: inst.fps, backgroundStyle: inst.bg }}
                        colors={inst.colors}
                        transparentBg={inst.transparentBg}
                        glow={inst.glow}
                        cellSizeFactor={inst.cellSizeFactor}
                        shimmer={inst.shimmer}
                        paused={inst.paused}
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">#{idx + 1}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {inst.pattern} · {inst.style} · {inst.shape}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">actual 12×12</div>
                    <SimpleLoader
                      displayText={inst.displayText}
                      grid={{ size: inst.gridSize }}
                      cellShape={inst.shape}
                      animation={{ pattern: inst.pattern, style: inst.style, fps: inst.fps, backgroundStyle: inst.bg }}
                      colors={inst.colors}
                      transparentBg={inst.transparentBg}
                      glow={inst.glow}
                      cellSizeFactor={inst.cellSizeFactor}
                      shimmer={inst.shimmer}
                      paused={inst.paused}
                      dataId={inst.id}
                    />
                  </div>

                  <div className={`flex items-center gap-1 transition ${inst.paused ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInstances((arr) => arr.map((i) => (i.id === inst.id ? { ...i, paused: !i.paused } : i)));
                      }}
                      className={`rounded-md p-1 transition-colors ${inst.paused ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
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
                      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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
                        className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Delete loader"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        <aside className="w-80 shrink-0 border-l bg-background overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
            <h2 className="font-semibold text-sm">Settings</h2>
            <Badge variant="outline" className="font-mono">#{instances.findIndex((i) => i.id === selectedId) + 1}</Badge>
          </div>

          <div className="p-4 space-y-5">
            <Section title="Display Text">
              <Input value={selected.displayText} onChange={(e) => update({ displayText: e.target.value })} maxLength={40} />
            </Section>

            <Section title="Grid">
              <div className="flex gap-1">
                {[3, 4, 5, 6, 7, 8].map((n) => {
                  const active = selected.gridSize === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => update({ gridSize: n })}
                      className={`h-8 w-8 rounded-md border text-sm font-medium transition-colors ${
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
            </Section>

            <Section title="Cell Size">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs">Factor</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {selected.cellSizeFactor.toFixed(2)}×
                  </span>
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

            <Section title="Cell Shape">
              <SelectField
                value={selected.shape}
                onChange={(v) => update({ shape: v as CellShape })}
                options={CELL_SHAPES.map((s) => ({ value: s, label: s.replace("-", " ") }))}
                capitalize
              />
            </Section>

            <Separator />

            <Section title="Animation">
              <div className="space-y-4">
                <div>
                  <Label className="mb-1.5 text-xs">Pattern</Label>
                  <SelectField
                    value={selected.pattern}
                    onChange={(v) => updatePattern(v as SimplePattern)}
                    options={SIMPLE_PATTERNS.map((p) => ({ value: p.value, label: `${p.group} · ${p.label}` }))}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs">FPS</Label>
                    <span className="text-xs font-mono text-muted-foreground">{selected.fps}</span>
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
                <div>
                  <Label className="mb-1.5 text-xs">Background Style</Label>
                  <SelectField value={selected.bg} onChange={(v) => update({ bg: v as BgStyle })} options={BG_STYLES} />
                </div>
              </div>
            </Section>

            <Separator />

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
                        <span className="text-xs font-mono text-muted-foreground">
                          {selected.shimmer.speed.toFixed(1)}x
                        </span>
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
                  </>
                )}
              </div>
            </Section>

            <Separator />

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
                        <span className="text-xs font-mono text-muted-foreground">
                          {selected.glow.size.toFixed(1)}
                        </span>
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
                        <span className="text-xs font-mono text-muted-foreground">
                          {selected.glow.intensity.toFixed(1)}x
                        </span>
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

            <Separator />

            <Section title="Colors">
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-sm font-medium">Transparent background</Label>
                <Switch
                  checked={selected.transparentBg}
                  onCheckedChange={(v) => update({ transparentBg: v })}
                />
              </div>
              <div className="space-y-1">
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
          </div>
        </aside>
      </div>
      <ExportModal
        instance={exportInstance}
        open={!!exportInstance}
        onClose={() => setExportInstanceId(null)}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
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
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className={`w-full ${capitalize ? "capitalize" : ""}`}>
        <SelectValue />
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
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
      >
        <span
          className="w-5 h-5 rounded border border-border shrink-0"
          style={{ backgroundColor: hex }}
        />
        <span className="text-sm flex-1 text-left">{label}</span>
        <span className="text-xs font-mono text-muted-foreground uppercase">{hex}</span>
      </button>
      {expanded && (
        <div className="space-y-2 pl-2">
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
                  className="w-5 h-5 rounded border border-border"
                  style={{ backgroundColor: preset }}
                />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
