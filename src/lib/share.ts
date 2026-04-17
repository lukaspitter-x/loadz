import type { LoaderConfig } from "./types";

export function encodeState(loaders: LoaderConfig[]): string {
  const json = JSON.stringify(loaders);
  if (typeof window === "undefined") return "";
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeState(hash: string): LoaderConfig[] | null {
  try {
    const padded =
      hash.replace(/-/g, "+").replace(/_/g, "/") +
      "===".slice((hash.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed as LoaderConfig[];
  } catch {
    return null;
  }
}
