import { CreateContentButton } from "@/components/create/create-content-button";
import { getServerDictionary } from "@/lib/i18n/server";
import { ArrowRight, Coins, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/lib/i18n/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { ProjectGrid } from "@/components/app/project-grid";
import { CreateShortcuts } from "@/components/app/create-shortcuts";
import { Starfield } from "@/components/landing/starfield";
import { buttonVariants } from "@/components/ui/button";
import { CREDIT_COSTS } from "@/config/credits";
import { requireUser } from "@/lib/auth/dal";
import { getCreditBalance } from "@/lib/credits/ledger";
import { format } from "@/lib/i18n";
import { listProjects } from "@/lib/projects/queries";
import { cn } from "@/lib/utils";
import { getPostGenerationCost } from "@/config/credits";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.app.nav.dashboard }; }

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

      {/* Bloc de création : l'action principale de l'app, dans l'esprit du hero de la landing */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-line bg-bg-subtle">
        {/* Fond : étoiles en mouvement + halo violet, comme la landing */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <Starfield className="absolute inset-0 size-full mask-fade-b" />
          <div className="absolute -top-40 left-1/2 h-[30rem] w-[60rem] max-w-[160%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-glow),transparent)] opacity-70" />
        </div>
        <div className="flex flex-col gap-8 p-6 sm:p-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5">
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
                <h2 className="font-display text-[clamp(1.9rem,4.6vw,3.4rem)] leading-[1.05] font-extrabold tracking-[-0.04em]">
                  <span>{d.hero.titleLine1}</span>{" "}
                  <span className="font-heading text-[0.82em] font-extralight tracking-normal whitespace-nowrap text-accent-text">{d.hero.titleLine2}</span>
                </h2>
                <p className="mt-3 max-w-xl text-muted">{d.hero.text}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <CreateContentButton className={buttonVariants({ size: "lg", variant: "purple" })}>
                <Plus /> {t.app.nav.create}
              </CreateContentButton>
              <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg">
                {d.hero.templates} <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">{d.hero.shortcuts}</p>
            <CreateShortcuts />
          </div>
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
