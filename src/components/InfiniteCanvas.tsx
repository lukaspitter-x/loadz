"use client";

import { useEffect, useRef } from "react";
import { useLoaderStore } from "@/lib/store";
import { SceneController } from "@/lib/pixi/SceneController";

export default function InfiniteCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneController | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    let cancelled = false;
    const host = hostRef.current;

    const scene = new SceneController(host, {
      onSelect: (id) => useLoaderStore.getState().selectLoader(id),
      onMove: (id, x, y) => useLoaderStore.getState().moveLoader(id, x, y),
    });

    const { loaders, theme, selectedId } = useLoaderStore.getState();
    scene.init(theme, loaders).then(() => {
      if (cancelled) return;
      sceneRef.current = scene;
      scene.setSelected(selectedId);
    });

    const unsubLoaders = useLoaderStore.subscribe((state, prev) => {
      const s = sceneRef.current;
      if (!s) return;
      if (state.loaders !== prev.loaders) {
        const prevIds = new Set(prev.loaders.map((l) => l.id));
        const nextIds = new Set(state.loaders.map((l) => l.id));
        prev.loaders.forEach((l) => {
          if (!nextIds.has(l.id)) s.removeLoader(l.id);
        });
        state.loaders.forEach((l) => {
          if (!prevIds.has(l.id)) s.addLoader(l);
          else s.updateLoader(l);
        });
      }
      if (state.selectedId !== prev.selectedId) {
        s.setSelected(state.selectedId);
      }
      if (state.theme !== prev.theme) {
        s.setTheme(state.theme);
      }
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;
      if (e.key === "r" || e.key === "R") {
        sceneRef.current?.resetView();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      unsubLoaders();
      if (sceneRef.current) {
        sceneRef.current.destroy();
        sceneRef.current = null;
      } else {
        scene.destroy();
      }
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 overflow-hidden" />;
}
