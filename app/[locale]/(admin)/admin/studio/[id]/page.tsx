import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminSkeleton } from "@/components/admin/admin-ui";
import { Studio } from "@/components/admin/studio/studio";
import { requireAdmin } from "@/lib/admin/auth";
import { getStudio } from "@/lib/custom-motion/studio-queries";

/** Server Actions du studio : un message à Claude privé peut enchaîner plusieurs longues réponses et des aperçus Lambda. */
export const maxDuration = 300;

export async function generateMetadata(): Promise<Metadata> { return { title: "Claude privé" }; }

async function StudioLoader({ params }: { params: PageProps<"/[locale]/admin/studio/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const studio = await getStudio(id);
  if (!studio) notFound();
  return <Studio initial={studio} />;
}

export default function StudioMotionPage({ params }: PageProps<"/[locale]/admin/studio/[id]">) {
  return <Suspense fallback={<AdminSkeleton />}><StudioLoader params={params} /></Suspense>;
}
