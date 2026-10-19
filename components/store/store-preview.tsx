"use client";
import { useId, useMemo } from "react";
import { STORE_SIZES, type StorePlatform } from "@/config/store-templates";
import type { StoreDocument } from "@/lib/store/document";
import { storeBannerSvg, storeSvg, type StoreMedia } from "@/lib/store/svg";
import { cn } from "@/lib/utils";

/** Same SVG as the export; the id prefix keeps several previews on one page independent. */
export function StorePreview({ document, index = 0, platform = "ios", media, className }: { document: StoreDocument; index?: number; platform?: StorePlatform; media?: Omit<StoreMedia, "uid">; className?: string }) {
  const uid = `st${useId().replace(/[^\w-]/g, "")}`;
  const svg = useMemo(() => platform === "banner" ? storeBannerSvg(document, { ...media, uid }) : storeSvg(document, index, platform, { ...media, uid }), [document, index, platform, media, uid]);
  const size = STORE_SIZES[platform];
  return <div className={cn("overflow-hidden [&>svg]:block [&>svg]:h-full [&>svg]:w-full", className)} style={{ aspectRatio: `${size.width}/${size.height}` }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
