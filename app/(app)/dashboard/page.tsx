import { ArrowRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { ProjectGrid } from "@/components/app/project-grid";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { buttonVariants } from "@/components/ui/button";
import { getStyle } from "@/config/styles";
import { requireUser } from "@/lib/auth/dal";
import { format, t } from "@/lib/i18n";
import { listProjects } from "@/lib/projects/queries";

export const metadata: Metadata = { title: t.app.nav.dashboard };

const d = t.app.dashboard;

/** Templates mis en avant dans le bloc de création (raccourci vers l'assistant, template présélectionné). */
const FEATURED = ["neon", "apple", "kinetic-typo"] as const;

async function DashboardContent() {
  const user = await requireUser();
  const projects = await listProjects(user.id);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:gap-12">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{format(d.greeting, { name: firstName })}</h1>
        <p className="mt-1 text-muted">{d.subtitle}</p>
      </div>

      {/* Bloc de création : l'action principale de l'app */}
      <section className="grid overflow-hidden rounded-2xl border border-line bg-bg-subtle lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-center gap-5 p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-accent-text uppercase">{d.hero.eyebrow}</p>
          <div>
            <h2 className="font-heading text-xl font-semibold text-balance sm:text-[1.7rem] sm:leading-tight">{d.hero.title}</h2>
            <p className="mt-2 max-w-md text-muted">{d.hero.text}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/create" className={buttonVariants({ size: "lg" })}>
              <Plus /> {d.newVideo}
            </Link>
            <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg">
              {d.hero.templates} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-2 sm:gap-3 sm:p-3 lg:pl-0">
          {FEATURED.map((id) => {
            const style = getStyle(id);
            if (!style) return null;
            return (
              <Link key={id} href={`/create?style=${id}`} className="group relative overflow-hidden rounded-xl border border-line">
                <div className="transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]">
                  {/* Nom affiché en légende : pas de texte dans l'aperçu (évite le doublon) */}
                  <VideoPlaceholder ratio="9:16" palette={style.palette} scene={style.recipe.background} label="" bare />
                </div>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2.5 text-xs font-semibold text-white">{style.name}</span>
              </Link>
            );
          })}
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
