"use client";
import Link from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { postCopy } from "@/lib/posts/copy";
import { Clapperboard, Images, MonitorUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ContentKind({ kind }: { kind: "motion" | "post" | "recording" }) {
  const locale = useDictionary().locale;
  const c = postCopy(useDictionary().locale);
  return <nav aria-label={c.newContent} className="mb-8 flex flex-wrap gap-2">
    {([{ id: "motion", label: c.motion, Icon: Clapperboard }, { id: "post", label: c.posts, Icon: Images }, { id: "recording", label: locale === "fr" ? "Démo d’écran" : "Screen demo", Icon: MonitorUp }] as const).map(({ id, label, Icon }) => <Link key={id} href={`/create?kind=${id}`} aria-current={kind === id ? "page" : undefined} className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors", kind === id ? "border-accent bg-accent-soft text-accent-text" : "border-line bg-surface text-muted hover:text-fg")}><Icon className="size-4" />{label}</Link>)}
  </nav>;
}
