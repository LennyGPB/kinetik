import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-skeleton";
import { FeedbackForm } from "@/components/app/feedback-form";
import { requireUser } from "@/lib/auth/dal";
import { getServerDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.app.feedback.title }; }

export default async function FeedbackPage() {
  await requireUser();
  const t = await getServerDictionary();
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title={t.app.feedback.title} subtitle={t.app.feedback.subtitle} />
      <FeedbackForm />
    </div>
  );
}
