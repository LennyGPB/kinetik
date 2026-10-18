import { CreateContentButton } from "@/components/create/create-content-button";
import { getServerDictionary } from "@/lib/i18n/server";
import { ArrowRight, Coins, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/lib/i18n/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { ProjectGrid } from "@/components/app/project-grid";
import { TemplateShowcase } from "@/components/app/template-showcase";
import { buttonVariants } from "@/components/ui/button";
import { CREDIT_COSTS } from "@/config/credits";
import { requireUser } from "@/lib/auth/dal";
import { getCreditBalance } from "@/lib/credits/ledger";
import { format } from "@/lib/i18n";
import { listProjects } from "@/lib/projects/queries";
import { cn } from "@/lib/utils";
import { postCopy } from "@/lib/posts/copy";
import { getPostGenerationCost } from "@/config/credits";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.app.nav.dashboard }; }

/** Templates mis en avant dans le bloc de création (raccourci vers l'assistant, template présélectionné). */
const FEATURED = ["apple", "kinetic-typo", "neon"] as const;

async function DashboardContent() {
  const t = await getServerDictionary();

  const d = t.app.dashboard;

  const user = await requireUser();
  const [projects, balance] = await Promise.all([listProjects(user.id), getCreditBalance(user.id)]);
  const canGenerate = balance.total >= getPostGenerationCost(1);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:gap-12">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{format(d.greeting, { name: firstName })}</h1>
        <p className="mt-1 text-muted">{d.subtitle}</p>
      </div>

      {/* Bloc de création : l'action principale de l'app */}
      <section className="relative grid items-center overflow-hidden rounded-3xl border border-line bg-bg-subtle lg:grid-cols-[1.1fr_1fr]">
        {/* Halo derrière l'éventail de templates */}
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-32 size-[28rem] rounded-full bg-accent opacity-20 blur-3xl" />
        <div className="relative flex flex-col justify-center gap-6 p-6 sm:p-10">
          {/* Coût d'une vidéo et solde : on sait avant de cliquer si la génération passera */}
          <Link
            href="/credits"
            className={cn(
              "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              canGenerate ? "border-line bg-surface text-muted hover:text-fg" : "border-accent bg-accent-soft text-accent-text",
            )}
          >
            <Coins className="size-3.5" />
            {format(canGenerate ? d.hero.cost : d.hero.lowBalance, { cost: canGenerate ? CREDIT_COSTS.generation : getPostGenerationCost(1), postCost: getPostGenerationCost(1), balance: balance.total })}
          </Link>
          <div>
            <h2 className="font-heading text-2xl font-semibold text-balance sm:text-[2rem] sm:leading-[1.1]">{d.hero.title}</h2>
            <p className="mt-3 max-w-md text-muted">{d.hero.text}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <CreateContentButton className={buttonVariants({ size: "lg", variant: "purple" })}>
              <Plus /> {d.newVideo} · {CREDIT_COSTS.generation} {t.common.credits}
            </CreateContentButton>
            <Link href="/create?kind=post" className={buttonVariants({ size: "lg", variant: "outline" })}>
              <Plus /> {postCopy(t.locale).create} · {getPostGenerationCost(1)} {postCopy(t.locale).credits}
            </Link>
            <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg">
              {d.hero.templates} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="relative px-4 pt-2 pb-8 sm:px-8 lg:py-10">
          <TemplateShowcase ids={FEATURED} />
          <p className="mt-6 text-center text-xs text-subtle">{d.hero.showcaseHint}</p>
        </div>
      </section>

      <ProjectGrid projects={projects} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
