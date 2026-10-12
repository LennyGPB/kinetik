"use client";

import { useEffect, useRef, useState } from "react";
import type { UploadedFile } from "@/lib/storage/client";

export type WebsiteAnalysis = {
  url: string;
  status: "idle" | "loading" | "ready" | "error";
  files: UploadedFile[];
  colors: string[];
  error?: string;
};

function normalizedUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) return "";
    url.hash = "";
    return url.href;
  } catch { return ""; }
}

/** Lives in the wizard, so moving between steps does not repeat the capture. */
export function useWebsiteAnalysis(value: string) {
  const url = normalizedUrl(value);
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<WebsiteAnalysis>({ url: "", status: "idle", files: [], colors: [] });
  const cache = useRef(new Map<string, WebsiteAnalysis>());
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const cached = cache.current.get(url);
      if (cached) { setSnapshot(cached); return; }
      setSnapshot({ url, status: "loading", files: [], colors: [] });
      try {
        const response = await fetch("/api/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, format: "desktop" }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "capture_failed");
        if (controller.signal.aborted) return;
        const result: WebsiteAnalysis = { url, status: "ready", files: data.files, colors: data.colors ?? [] };
        cache.current.set(url, result);
        setSnapshot(result);
      } catch (error) {
        if (controller.signal.aborted) return;
        const code = error instanceof Error ? error.message : "";
        setSnapshot({ url, status: "error", files: [], colors: [], error: code === "rate_limited" ? "L’analyse est momentanément limitée. Réessaie dans quelques minutes." : "Impossible d’analyser ce site. Tu peux réessayer ou continuer avec tes propres médias et couleurs." });
      }
    }, 1200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [url, attempt]);
  const analysis: WebsiteAnalysis = !url ? { url: "", status: "idle", files: [], colors: [] }
    : snapshot.url === url ? snapshot : { url, status: "loading", files: [], colors: [] };
  return { analysis, retry: () => { cache.current.delete(url); setAttempt((n) => n + 1); } };
}
