"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import type { AnimStyle, CellShape, GridType, LoaderColors, TriangularTessellation } from "@/lib/types";
import type { SimplePattern } from "@/lib/simple-loader/patterns";
import {
  buildHtmlSnippet,
  buildReactSnippet,
  formatJson,
  instanceToConfig,
} from "@/lib/simple-loader/export/serialize";

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
  shimmer: { enabled: boolean; speed: number; mode: "shimmer" | "shine" | "gradient" | "cursor"; base?: string; highlight?: string; stops?: [string, string, string] };
}

type Tab = "json" | "react" | "html" | "svg" | "png";

const TABS: { id: Tab; label: string; filename: string | null }[] = [
  { id: "json", label: "JSON", filename: "loader.json" },
  { id: "react", label: "React (.tsx)", filename: "SimpleLoader.tsx" },
  { id: "html", label: "HTML", filename: null },
  { id: "svg", label: "SVG (frozen)", filename: "loader.svg" },
  { id: "png", label: "PNG (frozen)", filename: "loader.png" },
];

const PNG_SIZES = [48, 96, 192, 384, 768];

export function ExportModal({
  instance,
  open,
  onClose,
}: {
  instance: Instance | null;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("react");
  const [copied, setCopied] = useState(false);
  const [pngSize, setPngSize] = useState(192);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    setCopied(false);
    setPngDataUrl(null);
  }, [tab, instance?.id]);

  const liveSvg = useMemo(() => {
    if (!instance || !open) return "";
    if (typeof document === "undefined") return "";
    if (tab !== "svg" && tab !== "png") return "";
    const el = document.querySelector<SVGSVGElement>(`svg[data-loader-id="${instance.id}"]`);
    if (!el) return "";
    return serializeSvgWithInlineStyles(el);
  }, [tab, instance, open, pngSize]);

  const codeSnippet = useMemo(() => {
    if (!instance) return "";
    const config = instanceToConfig(instance);
    if (tab === "json") return formatJson(config);
    if (tab === "react") return buildReactSnippet(config);
    if (tab === "html") return buildHtmlSnippet(config);
    return "";
  }, [tab, instance]);

  // Rasterize SVG → PNG when the PNG tab is active
  useEffect(() => {
    if (tab !== "png" || !liveSvg || !instance) {
      setPngDataUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const dataUrl = await svgToPngDataUrl(liveSvg, pngSize, pngSize, instance.transparentBg);
        if (!cancelled) setPngDataUrl(dataUrl);
      } catch {
        if (!cancelled) setPngDataUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, liveSvg, pngSize, instance]);

  const snippet =
    tab === "svg" ? liveSvg :
    tab === "png" ? "" :
    codeSnippet;

  const lines = snippet ? snippet.split("\n").length : 0;
  const bytes = snippet ? new Blob([snippet]).size : 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  const handleDownload = () => {
    const meta = TABS.find((t) => t.id === tab);
    if (!meta?.filename) return;
    if (tab === "png" && pngDataUrl) {
      const a = document.createElement("a");
      a.href = pngDataUrl;
      a.download = meta.filename;
      a.click();
      return;
    }
    const blob = new Blob([snippet], { type: tab === "svg" ? "image/svg+xml" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = meta.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open || !instance) return null;

  const isGraphicTab = tab === "svg" || tab === "png";
  const missingLiveSvg = isGraphicTab && !liveSvg;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-lg border border-border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 h-12 border-b shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Export Loader</h2>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {instance.pattern} · {instance.shape}
            </span>
            {isGraphicTab && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {instance.paused ? "snapshot: paused frame" : "snapshot: live frame"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex items-center gap-1 px-4 pt-2 border-b">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto bg-muted/30">
          {tab === "html" ? (
            <div className="p-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Vanilla HTML export is coming soon.</p>
              <p>For now, use the <strong>React</strong> tab — the generated file has zero project-specific imports and works in any React 18+ app.</p>
            </div>
          ) : missingLiveSvg ? (
            <div className="p-6 text-sm text-muted-foreground">
              Couldn&apos;t find the rendered loader in the DOM. Close and re-open the export modal from an instance that&apos;s on screen.
            </div>
          ) : tab === "png" ? (
            <div className="p-6 flex flex-col items-center gap-4">
              <div
                className="rounded-md border border-border p-4 flex items-center justify-center"
                style={{ background: "repeating-conic-gradient(#333 0 90deg, #222 90deg 180deg) 0 0/12px 12px" }}
              >
                {pngDataUrl ? (
                  <img src={pngDataUrl} alt="rendered loader" width={pngSize} height={pngSize} style={{ imageRendering: "pixelated" }} />
                ) : (
                  <div className="text-xs text-muted-foreground w-24 h-24 flex items-center justify-center">rendering…</div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {PNG_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPngSize(s)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                      pngSize === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent border-border text-foreground"
                    }`}
                  >
                    {s}px
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">
                {instance.paused ? "pause toggle is ON — frame is frozen" : "pause the loader to capture a specific frame"}
              </p>
            </div>
          ) : tab === "svg" ? (
            <div className="flex flex-col">
              <div
                className="flex items-center justify-center p-6 border-b border-border/60"
                style={{ background: "repeating-conic-gradient(#333 0 90deg, #222 90deg 180deg) 0 0/12px 12px" }}
              >
                {liveSvg ? (
                  <div
                    aria-label="SVG preview"
                    style={{ width: 192, height: 192, display: "flex", alignItems: "center", justifyContent: "center" }}
                    dangerouslySetInnerHTML={{
                      __html: liveSvg.replace(
                        /<svg([^>]*)>/,
                        '<svg$1 width="192" height="192" preserveAspectRatio="xMidYMid meet">',
                      ),
                    }}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground">no preview</div>
                )}
              </div>
              <pre className="p-4 text-[11px] leading-snug font-mono whitespace-pre overflow-auto">
                <code>{snippet}</code>
              </pre>
            </div>
          ) : (
            <pre className="p-4 text-[11px] leading-snug font-mono whitespace-pre overflow-auto">
              <code>{snippet}</code>
            </pre>
          )}
        </div>

        <footer className="flex items-center justify-between px-4 h-12 border-t shrink-0 bg-background">
          <span className="text-[10px] font-mono text-muted-foreground">
            {tab === "png" && pngDataUrl && `${pngSize}×${pngSize} · ${(pngDataUrl.length * 0.75 / 1024).toFixed(1)} KB`}
            {tab === "svg" && liveSvg && `${lines.toLocaleString()} lines · ${(bytes / 1024).toFixed(1)} KB`}
            {(tab === "json" || tab === "react") && `${lines.toLocaleString()} lines · ${(bytes / 1024).toFixed(1)} KB`}
          </span>
          <div className="flex items-center gap-2">
            {tab !== "html" && TABS.find((t) => t.id === tab)?.filename && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={tab === "png" ? !pngDataUrl : !snippet}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 text-xs font-medium transition-colors"
              >
                <Download size={12} /> Download
              </button>
            )}
            {tab !== "html" && tab !== "png" && (
              <button
                type="button"
                onClick={handleCopy}
                disabled={!snippet}
                className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 text-xs font-medium transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

// ---------- helpers ----------

function serializeSvgWithInlineStyles(src: SVGSVGElement): string {
  const clone = src.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  // Bake inline CSS styles on shape nodes into SVG attributes (standalone
  // renderers like Figma / <img> don't honor transform-box:fill-box or
  // transform-origin:center that the live component relies on).
  const shapeSelector = "circle, rect, polygon, polyline, path, line";
  const srcNodes = Array.from(src.querySelectorAll<SVGGraphicsElement>(shapeSelector));
  const cloneNodes = Array.from(clone.querySelectorAll<SVGGraphicsElement>(shapeSelector));
  srcNodes.forEach((srcEl, i) => {
    const target = cloneNodes[i];
    if (!target) return;
    const style = srcEl.style;
    const opacity = style.opacity;
    const fill = style.fill;
    const stroke = style.stroke;
    const strokeOpacity = style.strokeOpacity;
    const cssTransform = style.transform;

    if (opacity) target.setAttribute("opacity", opacity);
    if (fill) target.setAttribute("fill", fill);
    if (stroke) target.setAttribute("stroke", stroke);
    if (strokeOpacity) target.setAttribute("stroke-opacity", strokeOpacity);

    if (cssTransform && cssTransform !== "none") {
      const scaleMatch = cssTransform.match(/scale\(([^)]+)\)/);
      const translateMatch = cssTransform.match(/translate\(([^)]+)\)/);
      let bakedTransform = "";
      if (translateMatch) {
        bakedTransform += `translate(${translateMatch[1].replace(/,/g, " ")}) `;
      }
      if (scaleMatch) {
        const s = parseFloat(scaleMatch[1]);
        let cx = 0, cy = 0;
        try {
          const bb = srcEl.getBBox();
          cx = bb.x + bb.width / 2;
          cy = bb.y + bb.height / 2;
        } catch {
          // ignore
        }
        bakedTransform += `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;
      }
      if (bakedTransform.trim()) {
        target.setAttribute("transform", bakedTransform.trim());
      }
    }

    target.removeAttribute("style");
  });

  // Standalone renderers (Figma, <img>, some browsers) sometimes mishandle the
  // feMerge+SourceGraphic trick used to composite sharp shapes on top of their
  // own blur. Duplicate any filtered group as an unfiltered sibling so the
  // sharp cells always draw on top of the glow.
  const filteredGroups = Array.from(clone.querySelectorAll<SVGGElement>("g[filter]"));
  filteredGroups.forEach((g) => {
    const dup = g.cloneNode(true) as SVGGElement;
    dup.removeAttribute("filter");
    g.parentNode?.insertBefore(dup, g.nextSibling);
  });

  // Insert background rect AFTER the style-baking loop so it doesn't offset
  // the src/clone node index alignment.
  const srcBg = src.style.background;
  if (srcBg && srcBg !== "transparent" && !srcBg.startsWith("rgba(0, 0, 0, 0)")) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const w = parseFloat(clone.getAttribute("width") || "12");
    const h = parseFloat(clone.getAttribute("height") || "12");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", String(w));
    rect.setAttribute("height", String(h));
    rect.setAttribute("fill", srcBg);
    rect.setAttribute("rx", "2");
    // Insert as the very first child so it renders behind everything.
    clone.insertBefore(rect, clone.firstChild);
  }

  const xml = new XMLSerializer().serializeToString(clone);
  return xml.replace(/></g, ">\n<");
}

async function svgToPngDataUrl(svgXml: string, width: number, height: number, transparent: boolean): Promise<string> {
  const blob = new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    if (!transparent) {
      // Fill checker background NO — respect SVG's own bg rect. Just leave transparent canvas.
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
