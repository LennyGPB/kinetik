import { CollectionBackground, COLLECTION_BACKGROUNDS, type CollectionBackgroundKind } from "../../remotion/video/collection-backgrounds";

export function isCollectionTemplate(id?: string): id is CollectionBackgroundKind {
  return Boolean(id && (COLLECTION_BACKGROUNDS as readonly string[]).includes(id));
}

export function CollectionThumbnail({ id, label, bare }: { id: CollectionBackgroundKind; label: string; bare?: boolean }) {

  const light = id === "monolith" || id === "papercut";
  return <div className="absolute inset-0 overflow-hidden [container-type:size]">
    <CollectionBackground kind={id} palette={["var(--vp-bg)", "var(--vp-main)", "var(--vp-accent)"]} />
    {!bare && <div className={`absolute inset-x-[10%] top-[38%] ${id === "monolith" || id === "prism" ? "text-left" : "text-center"}`}>
      <span className={`block break-words text-[15cqmin] leading-[1.1] tracking-[-0.025em] ${id === "papercut" ? "font-serif" : "font-video font-semibold"}`} style={{ color: light ? "#181a18" : "#f4f3ef" }}>{label}</span>
      <div className={`mt-[6cqmin] h-px w-[15%] bg-[var(--vp-main)] ${id === "monolith" || id === "prism" ? "" : "mx-auto"}`} />
    </div>}
  </div>;
}
