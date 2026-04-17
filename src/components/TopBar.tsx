"use client";

import { useCallback, useState } from "react";
import { Sun, Moon, Share2, Download, Check } from "lucide-react";
import { useLoaderStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { encodeState } from "@/lib/share";

export default function TopBar() {
  const theme = useLoaderStore((s) => s.theme);
  const toggleTheme = useLoaderStore((s) => s.toggleTheme);
  const [copied, setCopied] = useState(false);

  const onShare = useCallback(async () => {
    const loaders = useLoaderStore.getState().loaders;
    const hash = encodeState(loaders);
    const url = `${location.origin}${location.pathname}#${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      history.replaceState(null, "", `#${hash}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      prompt("Shareable URL", url);
    }
  }, []);

  const onExport = useCallback(async () => {
    const selectedId = useLoaderStore.getState().selectedId;
    if (!selectedId) {
      alert("Select a loader first.");
      return;
    }
    const scene = (window as unknown as { __loaderScene?: import("@/lib/pixi/SceneController").SceneController }).__loaderScene;
    if (!scene) {
      alert("Canvas not ready.");
      return;
    }
    const dataUrl = await scene.exportLoaderPng(selectedId);
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `loader-${selectedId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b bg-background/80 backdrop-blur h-12">
      <div className="flex items-center gap-2 w-48">
        <span className="text-sm font-semibold tracking-tight">Loader Builder</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Reset View</span>
        <kbd className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-foreground bg-muted">
          R
        </kbd>
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={onShare}>
          {copied ? <Check size={14} /> : <Share2 size={14} />}
          <span className="ml-1.5">{copied ? "Copied" : "Share"}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download size={14} />
          <span className="ml-1.5">Export</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>
    </header>
  );
}
