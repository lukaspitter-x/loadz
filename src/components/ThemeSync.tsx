"use client";

import { useEffect } from "react";
import { useLoaderStore } from "@/lib/store";
import { decodeState } from "@/lib/share";

export default function ThemeSync() {
  const theme = useLoaderStore((s) => s.theme);
  const hydrateFrom = useLoaderStore((s) => s.hydrateFrom);

  useEffect(() => {
    const hash = location.hash.slice(1);
    if (hash) {
      const decoded = decodeState(hash);
      if (decoded && decoded.length) hydrateFrom(decoded);
    }
  }, [hydrateFrom]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  return null;
}
