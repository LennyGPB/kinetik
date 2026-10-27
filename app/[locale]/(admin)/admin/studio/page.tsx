import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/lib/i18n/navigation";
import { AdminHeader, AdminSkeleton, EmptyRow } from "@/components/admin/admin-ui";
import { NewMotionForm } from "@/components/admin/studio/new-motion-form";
import { requireAdmin } from "@/lib/admin/auth";
import { listStudio } from "@/lib/custom-motion/studio-queries";

export async function generateMetadata(): Promise<Metadata> { return { title: "Claude privé" }; }

async function StudioList() {
  await requireAdmin();
  const motions = await listStudio();
  return (
    <>
      <AdminHeader title="Claude privé" subtitle="Décris une animation à Claude, il l’écrit en code. Publie-la ensuite dans l’onglet « Créations » de la galerie.">
        <NewMotionForm />
      </AdminHeader>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {motions.length ? motions.map((motion) => (
          <li key={motion.id}>
            <Link href={`/admin/studio/${motion.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
              <span className="min-w-0 flex-1 truncate font-medium">{motion.name}</span>
              {motion.popular && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-text">Populaire</span>}
              <span className={motion.published ? "text-xs font-semibold text-green-500" : "text-xs text-muted"}>{motion.published ? "En ligne" : "Brouillon"}</span>
              <span className="w-24 text-right text-xs text-subtle tabular-nums">v{motion.versions}</span>
            </Link>
          </li>
        )) : <EmptyRow>Aucune vidéo pour l’instant.</EmptyRow>}
      </ul>
    </>
  );
}

export default function StudioPage() {
  return <Suspense fallback={<AdminSkeleton />}><StudioList /></Suspense>;
}
