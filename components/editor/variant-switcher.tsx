"use client";

import { Clock, Loader2, Plus, RectangleHorizontal, RectangleVertical, Square } from "lucide-react";
import { useTransition } from "react";
import { useToast } from "@/components/ui/toaster";
import { FORMAT_IDS, VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import Link, { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { createVariants, syncFormat } from "@/lib/projects/actions";
import type { ProjectVariant } from "@/lib/projects/types";
import { variantKind, type VariantKind } from "@/lib/projects/variants";
import { cn } from "@/lib/utils";

const ICONS = { PORTRAIT: RectangleVertical, SQUARE: Square, LANDSCAPE: RectangleHorizontal, short: Clock } satisfies Record<VariantKind, unknown>;
const pill = "flex h-6 items-center gap-1 rounded-full px-2 font-mono text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-accent";

/**
 * Formats de la vidéo, posés sur la vidéo à côté du temps : les 3 formats sont toujours proposés.
 * Un format déjà décliné s'ouvre en reprenant les modifications du format actuel ; un format manquant est créé (gratuit) puis ouvert.
 * La version courte apparaît si elle existe.
 */
/** `column` : pile verticale hors de la vidéo (mobile, aperçu étroit en 9:16 ou 1:1), aux couleurs de l'interface. */
export function VariantSwitcher({ variants, currentId, canCreate, column = false }: { variants: ProjectVariant[]; currentId: string; canCreate: boolean; column?: boolean }) {
  const t = useDictionary();
  const v = t.app.variants;
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const byFormat = new Map(variants.filter((item) => !item.short).map((item) => [item.format, item]));
  const short = variants.find((item) => item.short);

  function create(format: VideoFormatId) {
    startTransition(async () => {
      // Depuis la version courte, un nouveau format part de la vidéo complète (l'original, en tête de liste)
      const source = variants.find((item) => item.id === currentId)?.short ? variants[0].id : currentId;
      const result = await createVariants(source, [format]);
      const created = result.ok ? result.projects[0] : undefined;
      if (!created) return toast({ title: !result.ok && result.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error, tone: "error" });
      router.push(`/project/${created.id}`);
    });
  }

  /** Opening another format first carries over every change made on the current one (short version excluded). */
  function open(event: React.MouseEvent, variant: ProjectVariant) {
    const fromShort = variants.find((item) => item.id === currentId)?.short;
    if (variant.id === currentId || variant.short || fromShort || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    startTransition(async () => {
      const result = await syncFormat(currentId, variant.id).catch(() => null);
      if (!result?.ok) toast({ title: result && !result.ok && result.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error, tone: "error" });
      router.push(`/project/${variant.id}`);
    });
  }

  const link = (variant: ProjectVariant) => {
    const kind = variantKind(variant);
    const Icon = ICONS[kind];
    const current = variant.id === currentId;
    return (
      <Link
        key={variant.id}
        href={`/project/${variant.id}`}
        onClick={(event) => open(event, variant)}
        aria-disabled={pending || undefined}
        aria-current={current ? "page" : undefined}
        title={v.kinds[kind].title}
        className={cn(pill, column && "size-7 justify-center px-0 [&_svg]:size-3.5", current ? (column ? "bg-fg text-bg" : "bg-white text-black") : (column ? "text-muted hover:bg-surface-2 hover:text-fg" : "text-white/80 hover:bg-white/15 hover:text-white"))}
      >
        <Icon className="size-3" aria-hidden />
        <span className={cn(column && "sr-only")}>{variant.short ? v.shortSuffix : VIDEO_FORMATS[variant.format].ratio}</span>
      </Link>
    );
  };

  return (
    <nav aria-label={v.switcher} className={column ? "flex flex-col gap-0.5 rounded-xl border border-line bg-surface p-0.5" : "flex items-center gap-0.5 rounded-full bg-black/45 p-0.5 backdrop-blur"}>
      {FORMAT_IDS.map((format) => {
        const existing = byFormat.get(format);
        if (existing) return link(existing);
        const Icon = ICONS[format];
        return (
          <button
            key={format}
            type="button"
            disabled={!canCreate || pending}
            onClick={() => create(format)}
            title={`${v.createOne} · ${v.kinds[format].title}`}
            className={cn(pill, column ? "size-7 justify-center border border-dashed border-line-strong px-0 text-muted [&_svg]:size-3.5 hover:text-fg disabled:opacity-40" : "border border-dashed border-white/25 text-white/55 hover:border-white/50 hover:text-white disabled:opacity-40")}
          >
            {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : !column && <Plus className="size-3" aria-hidden />}
            {!(column && pending) && <Icon className="size-3" aria-hidden />}
            <span className={cn(column && "sr-only")}>{VIDEO_FORMATS[format].ratio}</span>
          </button>
        );
      })}
      {short && link(short)}
    </nav>
  );
}
