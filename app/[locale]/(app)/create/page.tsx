import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { MotionCreateFlow } from "@/components/create/motion-create-flow";
import { CreatePicker } from "@/components/create/create-picker";
import { PhysicalProductCreate } from "@/components/create/physical-product-create";
import { PlatDuJourCreate } from "@/components/resto/plat-du-jour-create";
import { MenuSemaineCreate } from "@/components/resto/menu-semaine-create";
import { FormuleMidiCreate } from "@/components/resto/formule-midi-create";
import { AfficheCreate } from "@/components/resto/affiche-create";
import type { AfficheTemplateId } from "@/lib/resto/affiche";
import { canUseResto, needsRestoOffer } from "@/lib/resto/access";
import { RecordingCreate } from "@/components/recordings/recording-create";
import { PostForm } from "@/components/posts/post-form";
import { StoreForm } from "@/components/store/store-form";
import { DecorGallery } from "@/components/decors/decor-gallery";
import { requireUser } from "@/lib/auth/dal";
import { getCreditBalance } from "@/lib/credits/ledger";
import { localizedRedirect } from "@/lib/i18n/redirect";
import { isFeatureEnabled } from "@/config/features";

import { getDefaultBrandKit } from "@/lib/projects/queries";

export const maxDuration = 180;

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.app.create.title }; }

async function CreateContent({ searchParams }: { searchParams: PageProps<"/[locale]/create">["searchParams"] }) {
  const user = await requireUser();
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  // Feature cachée (config/features.ts) : retour au choix des formats
  const hiddenKind = { decor: "decor", product: "product", post: "post", store: "store", recording: "recording" } as const;
  const askedKind = first(params.kind) as keyof typeof hiddenKind | undefined;
  const askedFlow = first(params.flow);
  if ((askedKind && Object.hasOwn(hiddenKind, askedKind) && !isFeatureEnabled(hiddenKind[askedKind])) || (askedFlow === "logo" && !isFeatureEnabled("signature")) || (askedFlow === "pitch" && !isFeatureEnabled("pitch"))) return <CreatePicker />;
  // Sans choix précis : le carrousel des formats (?pick=motion ou ?kind=motion ouvre directement les choix Motion)
  const bareMotion = first(params.kind) === "motion" && !first(params.style) && !first(params.flow) && !first(params.analysis);
  if (bareMotion || (!first(params.kind) && !first(params.style) && !first(params.flow) && !first(params.analysis))) return <CreatePicker initialGroup={bareMotion || first(params.pick) === "motion" ? "motion" : null} resto={canUseResto(user)} />;
  // Contenu Resto sans aucune offre : direction l'offre Resto (avant la règle « aucun crédit → page Crédits »)
  const restoKinds = ["dish", "week", "lunch", "happyhour", "event", "reviews", "hours", "intro"];
  if (restoKinds.includes(first(params.kind) ?? "") && canUseResto(user) && needsRestoOffer(user)) await localizedRedirect("/resto/offre");
  const [balance, brandKit] = await Promise.all([getCreditBalance(user.id), getDefaultBrandKit(user.id)]);
  // Aucun crédit : rien n'est créable, on envoie vers la page Crédits (message affiché là-bas)
  if (balance.total <= 0) await localizedRedirect("/credits?insufficient=1");
  // Niche Resto : plat du jour (masqué aux non-admins tant que la feature n'est pas publiée)
  if (first(params.kind) === "dish") return canUseResto(user) ? <PlatDuJourCreate brandKit={brandKit ? { name: brandKit.name, logo: brandKit.logo } : null} /> : <CreatePicker />;
  // Affiches animées du pack du lundi
  const affiches: Record<string, AfficheTemplateId> = { happyhour: "happy-hour", event: "evenement", reviews: "avis", hours: "horaires", intro: "presentation" };
  const affiche = affiches[first(params.kind) ?? ""];
  if (affiche) return canUseResto(user) ? <AfficheCreate key={affiche} template={affiche} brandKit={brandKit ? { name: brandKit.name, logo: brandKit.logo } : null} /> : <CreatePicker />;
  if (first(params.kind) === "lunch") return canUseResto(user) ? <FormuleMidiCreate brandKit={brandKit ? { name: brandKit.name, logo: brandKit.logo } : null} /> : <CreatePicker />;
  if (first(params.kind) === "week") return canUseResto(user) ? <MenuSemaineCreate brandKit={brandKit ? { name: brandKit.name, logo: brandKit.logo } : null} /> : <CreatePicker />;
  if (first(params.kind) === "product") return <PhysicalProductCreate balance={balance.total} initialStyleId={first(params.style)} />;
  if (first(params.kind) === "decor") return <div className="mx-auto max-w-6xl"><DecorGallery /></div>;

  const kind = first(params.kind) === "recording" ? "recording" : first(params.kind) === "post" ? "post" : first(params.kind) === "store" ? "store" : "motion";
  return (
    <div className="mx-auto max-w-6xl">
    {kind === "recording" ? <RecordingCreate balance={balance.total} /> : kind === "store" ? <StoreForm balance={balance.total} brandKit={brandKit} initialAppName={first(params.app)?.slice(0, 30)} initialStyleId={first(params.style)} /> : kind === "post" ? <PostForm balance={balance.total} brandKit={brandKit} initialAppName={first(params.app)?.slice(0, 40)} initialStyleId={first(params.style)} /> :
    <MotionCreateFlow
      balance={balance.total}
      brandKit={brandKit}
      initialAppName={first(params.app)?.slice(0, 40)}
      initialStyleId={first(params.style)}
      initialFlow={first(params.flow)}
      initialAnalysisId={first(params.analysis)?.slice(0, 100)}
    />}
    </div>
  );
}

export default function CreatePage({ searchParams }: PageProps<"/[locale]/create">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CreateContent searchParams={searchParams} />
    </Suspense>
  );
}
