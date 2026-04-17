"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Plus, X } from "lucide-react";
import { useLoaderStore } from "@/lib/store";
import {
  CELL_SHAPES,
  PATTERNS,
  STYLES,
  BG_STYLES,
  type LoaderConfig,
} from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SectionHeader({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {children}
      </span>
      {action}
    </div>
  );
}

export default function SettingsPanel() {
  const selectedId = useLoaderStore((s) => s.selectedId);
  const loader = useLoaderStore((s) =>
    s.loaders.find((l) => l.id === selectedId) ?? null,
  );
  const index = useLoaderStore((s) =>
    selectedId ? s.loaders.findIndex((l) => l.id === selectedId) : -1,
  );
  const total = useLoaderStore((s) => s.loaders.length);
  const updateLoader = useLoaderStore((s) => s.updateLoader);
  const updateLoaderDeep = useLoaderStore((s) => s.updateLoaderDeep);
  const removeLoader = useLoaderStore((s) => s.removeLoader);

  if (!loader) {
    return (
      <aside className="w-80 shrink-0 border-l bg-background overflow-y-auto flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">Settings</h2>
        </div>
        <div className="p-6 text-sm text-muted-foreground">
          Select a loader on the canvas.
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 shrink-0 border-l bg-background overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h2 className="font-semibold text-sm">Settings</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">#{index + 1}</Badge>
          {total > 1 && (
            <button
              type="button"
              onClick={() => removeLoader(loader.id)}
              className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="Delete loader"
              title="Delete loader"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-5">
        <DisplayTextSection loader={loader} onChange={updateLoader} />
        <GridSection loader={loader} onChange={updateLoader} />
        <CellShapeSection loader={loader} onChange={updateLoader} />
        <Separator />
        <AnimationSection loader={loader} onChange={updateLoader} onChangeDeep={updateLoaderDeep} />
        <Separator />
        <TogglesSection loader={loader} onChangeDeep={updateLoaderDeep} />
        <Separator />
        <ColorsSection loader={loader} onChangeDeep={updateLoaderDeep} />
        <Separator />
        <TextShimmerSection loader={loader} onChangeDeep={updateLoaderDeep} />
        <Separator />
        <StubSection label="Image Mask" onKey="imageMask" loader={loader} onChangeDeep={updateLoaderDeep} />
        <StubSection label="AI Generation" onKey="aiGeneration" loader={loader} onChangeDeep={updateLoaderDeep} />
        <StubSection label="SVG Import" onKey="svgImport" loader={loader} onChangeDeep={updateLoaderDeep} beta />
      </div>
    </aside>
  );
}

type UpdateFn = (id: string, patch: Partial<LoaderConfig>) => void;
type DeepFn = (id: string, updater: (l: LoaderConfig) => LoaderConfig) => void;

function DisplayTextSection({ loader, onChange }: { loader: LoaderConfig; onChange: UpdateFn }) {
  return (
    <div>
      <SectionHeader>Display Text</SectionHeader>
      <Input
        value={loader.displayText}
        onChange={(e) => onChange(loader.id, { displayText: e.target.value })}
        maxLength={40}
      />
    </div>
  );
}

function GridSection({ loader, onChange }: { loader: LoaderConfig; onChange: UpdateFn }) {
  return (
    <div>
      <SectionHeader>Grid</SectionHeader>
      <div className="flex gap-1">
        {[3, 4, 5, 6, 7, 8].map((n) => {
          const active = loader.grid.size === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(loader.id, { grid: { size: n } })}
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
    </div>
  );
}

function CellShapeSection({ loader, onChange }: { loader: LoaderConfig; onChange: UpdateFn }) {
  return (
    <div>
      <SectionHeader>Cell Shape</SectionHeader>
      <Select
        value={loader.cellShape}
        onValueChange={(v) => onChange(loader.id, { cellShape: v as typeof loader.cellShape })}
      >
        <SelectTrigger className="w-full capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CELL_SHAPES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s.replace("-", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AnimationSection({
  loader,
  onChange,
  onChangeDeep,
}: {
  loader: LoaderConfig;
  onChange: UpdateFn;
  onChangeDeep: DeepFn;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader>Animation</SectionHeader>
      <div>
        <Label className="mb-1.5 text-xs">Pattern</Label>
        <Select
          value={loader.animation.pattern}
          onValueChange={(v) =>
            onChangeDeep(loader.id, (l) => ({
              ...l,
              animation: { ...l.animation, pattern: v as typeof l.animation.pattern },
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PATTERNS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs">FPS</Label>
          <span className="text-xs font-mono text-muted-foreground">
            {loader.animation.fps}
          </span>
        </div>
        <Slider
          min={3}
          max={60}
          step={1}
          value={loader.animation.fps}
          onValueChange={(v) => {
            const n = Array.isArray(v) ? v[0] : (v as number);
            onChangeDeep(loader.id, (l) => ({
              ...l,
              animation: { ...l.animation, fps: n },
            }));
          }}
        />
      </div>
      <div>
        <Label className="mb-1.5 text-xs">Animation Style</Label>
        <Select
          value={loader.animation.style}
          onValueChange={(v) =>
            onChangeDeep(loader.id, (l) => ({
              ...l,
              animation: { ...l.animation, style: v as typeof l.animation.style },
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STYLES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-1.5 text-xs">Background Style</Label>
        <Select
          value={loader.animation.backgroundStyle}
          onValueChange={(v) =>
            onChangeDeep(loader.id, (l) => ({
              ...l,
              animation: { ...l.animation, backgroundStyle: v as typeof l.animation.backgroundStyle },
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BG_STYLES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TogglesSection({
  loader,
  onChangeDeep,
}: {
  loader: LoaderConfig;
  onChangeDeep: DeepFn;
}) {
  return (
    <div className="space-y-3">
      <ToggleRow
        label="Builder"
        checked={loader.features.builder}
        onChange={(v) =>
          onChangeDeep(loader.id, (l) => ({
            ...l,
            features: { ...l.features, builder: v },
          }))
        }
      />
      <ToggleRow
        label="Effects"
        checked={loader.features.effects}
        onChange={(v) =>
          onChangeDeep(loader.id, (l) => ({
            ...l,
            features: { ...l.features, effects: v },
          }))
        }
      />
      <ToggleRow
        label="Nodes"
        checked={loader.features.nodes}
        onChange={(v) =>
          onChangeDeep(loader.id, (l) => ({
            ...l,
            features: { ...l.features, nodes: v },
          }))
        }
      />
    </div>
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

function ColorsSection({
  loader,
  onChangeDeep,
}: {
  loader: LoaderConfig;
  onChangeDeep: DeepFn;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const hasSecondary = typeof loader.colors.secondary === "string";
  return (
    <div>
      <SectionHeader
        action={
          !hasSecondary && (
            <button
              type="button"
              onClick={() =>
                onChangeDeep(loader.id, (l) => ({
                  ...l,
                  colors: { ...l.colors, secondary: "#3DFF77" },
                }))
              }
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Add secondary color"
              title="Add secondary color"
            >
              <Plus size={14} />
            </button>
          )
        }
      >
        Colors
      </SectionHeader>
      <div className="space-y-1">
        {(
          [
            ["primary", "Primary"],
            ...(hasSecondary ? [["secondary", "Secondary"] as const] : []),
            ["inactiveCells", "Inactive Cells"],
            ["background", "Background"],
            ["text", "Text"],
          ] as const
        ).map(([key, label]) => (
          <ColorRow
            key={key}
            label={label}
            hex={(loader.colors as unknown as Record<string, string>)[key] ?? "#000000"}
            expanded={expanded === key}
            onToggle={() => setExpanded(expanded === key ? null : key)}
            onChange={(hex) =>
              onChangeDeep(loader.id, (l) => ({
                ...l,
                colors: { ...l.colors, [key]: hex },
              }))
            }
          />
        ))}
      </div>
    </div>
  );
}

function TextShimmerSection({
  loader,
  onChangeDeep,
}: {
  loader: LoaderConfig;
  onChangeDeep: DeepFn;
}) {
  const { enabled, speed } = loader.features.textShimmer;
  return (
    <div className="space-y-3">
      <ToggleRow
        label="Text Shimmer"
        checked={enabled}
        onChange={(v) =>
          onChangeDeep(loader.id, (l) => ({
            ...l,
            features: {
              ...l.features,
              textShimmer: { ...l.features.textShimmer, enabled: v },
            },
          }))
        }
      />
      {enabled && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs">Speed</Label>
            <span className="text-xs font-mono text-muted-foreground">{speed.toFixed(1)}x</span>
          </div>
          <Slider
            min={0.2}
            max={3}
            step={0.1}
            value={speed}
            onValueChange={(v) => {
              const n = Array.isArray(v) ? v[0] : (v as number);
              onChangeDeep(loader.id, (l) => ({
                ...l,
                features: {
                  ...l.features,
                  textShimmer: { ...l.features.textShimmer, speed: n },
                },
              }));
            }}
          />
        </div>
      )}
    </div>
  );
}

type StubKey = "imageMask" | "aiGeneration" | "svgImport";

function StubSection({
  label,
  onKey,
  loader,
  onChangeDeep,
  beta,
}: {
  label: string;
  onKey: StubKey;
  loader: LoaderConfig;
  onChangeDeep: DeepFn;
  beta?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {beta && (
          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
            BETA
          </Badge>
        )}
      </div>
      <Switch
        checked={loader.features[onKey]}
        onCheckedChange={(v) =>
          onChangeDeep(loader.id, (l) => ({
            ...l,
            features: { ...l.features, [onKey]: v },
          }))
        }
      />
    </div>
  );
}
