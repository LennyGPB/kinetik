import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { ArrowRight, ArrowUpRight, ChevronRight, BookOpen, CalendarCheck, CalendarDays, Clock, Gift, PartyPopper, Settings2, Soup, Sparkles, Star, UtensilsCrossed, Wine, type LucideIcon } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { SilentRefresh } from "@/components/resto/wait-for-plan";
import { currentPack, preparePack, type PackItem, type PackSkipped } from "@/lib/resto/pack";
import { RetryPackButton } from "@/components/resto/retry-pack-button";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getServerDictionary } from "@/lib/i18n/server";
import { canUseResto } from "@/lib/resto/access";
import { getRestaurant, getRestoAllowance, RESTO_WELCOME_BRIEF } from "@/lib/resto/billing";
import { weekdayName } from "@/lib/resto/model";
import { countLabel, spaceCopy } from "@/lib/resto/space-copy";
import { cn } from "@/lib/utils";
import { ContentGrid, type ContentItem } from "@/components/resto/content-grid";
import { RESTO_PLAN, featurePlan } from "@/config/pricing";
import { getRestoTemplate } from "@/config/resto-templates";
import { getEditorProject } from "@/lib/projects/queries";
import { buildVideoProps } from "@/lib/projects/video-props";

/** Le premier pack (ou un pack manqué par le cron) se prépare après l'affichage de la page. */
export const maxDuration = 120;

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: spaceCopy(t.locale).space.helloAnon }; }

const SHORTCUTS: { key: keyof ReturnType<typeof spaceCopy>["space"]["shortcuts"]; href: string; icon: LucideIcon }[] = [
  { key: "dish", href: "/create?kind=dish", icon: Soup },
  { key: "week", href: "/create?kind=week", icon: CalendarDays },
  { key: "lunch", href: "/create?kind=lunch", icon: UtensilsCrossed },
  { key: "happyhour", href: "/create?kind=happyhour", icon: Wine },
  { key: "event", href: "/create?kind=event", icon: PartyPopper },
  { key: "reviews", href: "/create?kind=reviews", icon: Star },
  { key: "hours", href: "/create?kind=hours", icon: Clock },
  { key: "carte", href: "/resto/carte", icon: BookOpen },
];

async function Space() {
  const user = await requireUser();
  if (!canUseResto(user)) notFound();
  const t = await getServerDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const s = spaceCopy(locale).space;
  // Les admins voient l'espace comme un abonné (packs, compteur), sans payer
  const subscriber = user.plan === "RESTO" || user.role === "ADMIN";
  const restaurant = await getRestaurant(user.id);
  if (user.plan === "RESTO" && !restaurant?.onboardedAt) redirect("/resto/bienvenue");

  const [allowance, projects] = await Promise.all([
    subscriber ? getRestoAllowance(user.id) : null,
    db.project.findMany({
      where: { userId: user.id, kind: "MOTION", videoType: { startsWith: "resto-" } },
      orderBy: { updatedAt: "desc" }, take: 16,
      select: { id: true, brief: true, restoPackId: true },
    }),
  ]);
  // Les contenus d'un pack sont montrés dans le pack ; ici les vidéos de bienvenue et les dernières créations
  const welcomeIds = projects.filter((p) => p.brief === RESTO_WELCOME_BRIEF).map((p) => p.id);
  const recentIds = projects.filter((p) => p.brief !== RESTO_WELCOME_BRIEF && !p.restoPackId).slice(0, 10).map((p) => p.id);
  const { watermark } = featurePlan(user);
  const toItem = async (id: string): Promise<ContentItem | null> => {
    const project = await getEditorProject(user.id, id);
    const version = project?.versions.at(-1);
    const template = version?.graph.resto?.template;
    if (!project || !version || !template) return null;
    return { id, name: project.name, type: getRestoTemplate(template)?.name[locale] ?? "", welcome: welcomeIds.includes(id), videoProps: buildVideoProps(project, version.graph, watermark) };
  };
  const loaded = (await Promise.all([...welcomeIds, ...recentIds].map(toItem))).filter((i): i is ContentItem => i !== null);
  const welcome = loaded.filter((i) => i.welcome);
  const recent = loaded.filter((i) => !i.welcome);
  const current = restaurant?.onboardedAt ? await currentPack(user.id) : null;
  if (current?.missing && restaurant) after(() => preparePack(restaurant.id).catch((error) => console.error("[resto:pack.visit]", error)));
  const pack = current?.missing ? null : current?.pack ?? null;
  const p = spaceCopy(locale).pack;
  const lowBalance = allowance && restaurant && !restaurant.autoTopUp && allowance.balance < RESTO_PLAN.packCredits;
  const dateTag = locale === "fr" ? "fr-FR" : "en-GB";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 pb-16">
      {/* Téléphone : titre plus compact, réglages en bouton rond à côté ; ordinateur : bouton avec libellé */}
      <header className="flex items-start justify-between gap-4 sm:items-end">
        <div className="min-w-0">
          <h1 className="text-[1.65rem] leading-tight font-semibold tracking-tight text-balance sm:text-4xl">{restaurant?.name ? s.hello.replace("{name}", restaurant.name) : s.helloAnon}</h1>
          <p className="mt-1.5 text-sm text-muted sm:text-base">{s.subtitle}</p>
        </div>
        {restaurant?.onboardedAt && (
          <Link href="/resto/reglages" aria-label={spaceCopy(locale).settings.title}
            className="grid size-12 shrink-0 place-items-center rounded-2xl border border-violet-500/40 bg-violet-500/10 text-accent-text transition-colors hover:bg-violet-600 hover:text-white sm:inline-flex sm:size-auto sm:h-11 sm:gap-2 sm:rounded-full sm:px-5 sm:text-sm sm:font-semibold">
            <Settings2 className="size-5 sm:size-4" /><span className="hidden sm:inline">{spaceCopy(locale).settings.link}</span>
          </Link>
        )}
      </header>

      {/* Accueil pas encore fait (admin en essai) : un appel bien visible */}
      {!restaurant?.onboardedAt && user.role === "ADMIN" && (
        <Link href="/resto/bienvenue" className="group relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-3xl bg-[linear-gradient(155deg,#9061f9_0%,#7c3aed_40%,#4c1d95_100%)] p-6 text-center text-white sm:text-left shadow-[0_0_0_1px_rgb(196_181_253/0.6),0_30px_90px_-20px_rgb(139_92_246/0.8)] transition-transform duration-300 hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl ring-1 ring-white/25 ring-inset">
            <span className="absolute -top-28 left-1/2 h-60 w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.22),transparent)]" />
            <span className="absolute inset-0 animate-sweep bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.2)_50%,transparent_65%)] [animation-duration:4.5s] motion-reduce:hidden" />
          </span>
          <span className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur"><Sparkles className="size-6" /></span>
            <span>
              <span className="block text-lg font-semibold sm:text-xl">{s.onboardTitle}</span>
              <span className="mt-1 block max-w-lg text-sm text-white/80">{s.onboardHint}</span>
            </span>
          </span>
          <span className="inline-flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-base font-semibold text-violet-700 sm:h-12 sm:w-auto shadow-[0_12px_30px_-10px_rgb(0_0_0/0.5)]">
            {s.onboard}<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </Link>
      )}

      {allowance ? (
        <section className="rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-6 text-white shadow-[0_24px_60px_-30px_rgb(139_92_246/0.9)] sm:p-8">
          <p className="text-xl font-semibold text-balance sm:text-2xl">
            {s.left.replace("{packs}", countLabel(s.pack, allowance.packsLeft)).replace("{plats}", countLabel(s.plat, allowance.platsLeft))}
          </p>
          <div className="mt-3 flex flex-col gap-1 text-sm text-white/85">
            {allowance.packsMissing > 0 && <p>{s.missing.replace("{n}", countLabel(s.pack, allowance.packsMissing))}</p>}
            {restaurant?.packEnabled && <p>{s.nextPack.replace("{day}", weekdayName(restaurant.packDay, locale))}</p>}
            {allowance.renewsAt && <p>{s.renews.replace("{date}", new Intl.DateTimeFormat(dateTag, { day: "numeric", month: "long" }).format(allowance.renewsAt))}</p>}
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-3xl border border-violet-500/40 bg-gradient-to-br from-violet-600/15 via-surface to-fuchsia-600/10 p-6 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-violet-600/25 blur-3xl" />
          {/* Téléphone : centré, gros bouton sur toute la largeur ; ordinateur : texte à gauche, bouton à droite */}
          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg"><CalendarCheck className="size-6" /></span>
              <div>
                <p className="text-lg font-semibold">{s.noPlanTitle}</p>
                <p className="mt-1 max-w-lg text-sm text-muted">{s.noPlanHint}</p>
              </div>
            </div>
            <Link href="/resto/offre" className={cn(buttonVariants({ variant: "purple", size: "lg" }), "h-14 w-full shrink-0 text-base sm:h-12 sm:w-auto")}>{s.seeOffer}<ArrowRight /></Link>
          </div>
        </section>
      )}

      {current && (current.missing || pack) && (
        <section className="flex flex-col gap-4 rounded-3xl border-2 border-violet-500/40 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          {current.missing || pack?.status === "PREPARING" ? <>
            <div><p className="font-semibold">{p.preparing}</p><p className="text-sm text-muted">{p.preparingHint}</p></div>
            <SilentRefresh />
          </> : pack?.status === "READY" ? <>
            <div>
              <p className="font-semibold">{p.ready.replace("{n}", countLabel(p.item, (pack.items as PackItem[]).length))}</p>
              {lowBalance && <p className="mt-1 text-sm text-danger">{p.lowBalance} <Link href="/resto/reglages" className="font-medium underline">{spaceCopy(locale).settings.link}</Link></p>}
            </div>
            <Link href={`/resto/pack/${pack.id}`} className={buttonVariants({ variant: "purple", size: "lg" })}>{p.review}</Link>
          </> : pack?.status === "VALIDATED" ? <>
            <p className="font-semibold">{p.validated}</p>
            <Link href={`/resto/pack/${pack.id}`} className={buttonVariants({ variant: "outline" })}>{p.open}</Link>
          </> : <div className="flex w-full flex-col gap-4">
            {/* Pack sauté : on dit pourquoi, et on peut relancer une fois la carte ou les réglages corrigés */}
            <div>
              <p className="font-semibold">{pack?.reason === "closed" ? p.closed : p.empty}</p>
              {(pack?.skipped as PackSkipped[] | undefined)?.length ? (
                <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                  {(pack!.skipped as PackSkipped[]).map((x) => <li key={x.template}>· {x.reason === "create_once" ? `${getRestoTemplate(x.template)?.name[locale]} : ${p.skipped.create_once}` : p.skipped[x.reason]}</li>)}
                </ul>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/resto/carte" className={buttonVariants({ variant: "outline" })}>{p.carte}</Link>
              <Link href="/resto/reglages" className={buttonVariants({ variant: "outline" })}>{spaceCopy(locale).settings.title}</Link>
              <RetryPackButton label={p.retry} />
            </div>
          </div>}
        </section>
      )}

      {welcome.length > 0 && (
        <section className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-[radial-gradient(ellipse_at_85%_0%,rgb(139_92_246/0.22),transparent_60%)] p-5 sm:p-8">
          <div className="grid items-center gap-5 sm:gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:flex sm:flex-col sm:items-start sm:gap-3">
              <span className="row-span-2 grid size-11 place-items-center rounded-2xl bg-[linear-gradient(145deg,#a78bfa,#7c3aed)] text-white shadow-[0_10px_24px_-8px_rgb(139_92_246)]"><Gift className="size-5" /></span>
              <h2 className="text-lg font-semibold sm:text-2xl">{s.welcomeTitle}</h2>
              <p className="text-sm text-muted sm:text-base">{s.welcomeHint}</p>
            </div>
            <ContentGrid items={welcome} badge={spaceCopy(locale).quote.welcome} fan />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{s.createTitle}</h2>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          {SHORTCUTS.map(({ key, href, icon: Icon }) => {
            const hero = key === "dish";
            return (
              <li key={key} className={cn(hero && "sm:col-span-2 lg:row-span-2", key === "carte" && "sm:col-span-2")}>
                {/* Restaurant accueilli : le plat du jour passe par le parcours express */}
                <Link href={hero && restaurant?.onboardedAt ? "/resto/plat" : href}
                  className={cn("group relative isolate flex h-full overflow-hidden rounded-3xl p-5 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5",
                    hero
                      ? "flex-col justify-between gap-4 bg-[linear-gradient(155deg,#9061f9_0%,#7c3aed_40%,#4c1d95_100%)] text-white shadow-[0_0_0_1px_rgb(196_181_253/0.5),0_30px_70px_-30px_rgb(139_92_246/0.9)] sm:min-h-48 sm:p-7"
                      : "flex-row items-center gap-4 rounded-2xl px-4 py-3.5 sm:flex-col sm:items-start sm:gap-3 sm:rounded-3xl sm:p-5 border border-white/[0.07] bg-[linear-gradient(180deg,rgb(255_255_255/0.05),rgb(255_255_255/0.01))] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] [background-color:var(--bg-subtle)] hover:border-violet-400/70 hover:shadow-[0_18px_40px_-24px_rgb(139_92_246/0.8)]")}>
                  {hero && <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl"><span className="absolute -top-24 -right-16 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.25),transparent)]" /><span className="absolute inset-0 animate-sweep bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.18)_50%,transparent_65%)] [animation-duration:4.5s] motion-reduce:hidden" /></span>}
                  <span className={cn("grid shrink-0 place-items-center rounded-2xl transition-[background-color,color] duration-300", hero ? "size-12 bg-white/15 backdrop-blur sm:size-14" : "size-11 bg-white/[0.05] text-accent-text group-hover:bg-[linear-gradient(145deg,#a78bfa,#7c3aed)] group-hover:text-white")}><Icon className={hero ? "size-7" : "size-5"} /></span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-none sm:gap-1">
                    <span className={cn("font-semibold", hero ? "text-xl sm:text-2xl" : "text-[15px]")}>{s.shortcuts[key][0]}</span>
                    <span className={cn("leading-snug", hero ? "text-white/80" : "text-sm text-muted")}>{s.shortcuts[key][1]}</span>
                  </span>
                  {hero
                    ? <span className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-violet-700 sm:h-11 sm:w-auto sm:self-start">{s.dishCta}<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" /></span>
                    : <><ChevronRight className="size-5 shrink-0 text-muted sm:hidden" /><ArrowUpRight className="absolute top-5 right-5 hidden size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100 sm:block" /></>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{s.recentTitle}</h2>
        {recent.length ? <ContentGrid items={recent} /> : <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">{s.empty}</p>}
      </section>
    </div>
  );
}

/** Espace Resto : ce qu'il reste ce mois-ci (en packs et plats du jour), les vidéos offertes, les créations. */
export default function RestoSpacePage() {
  return <Suspense fallback={<PageSkeleton />}><Space /></Suspense>;
}
