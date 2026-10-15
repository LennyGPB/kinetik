import { LegalDocument } from "@/components/legal/legal-document";
import { isLocale } from "@/lib/i18n";
import { legalMetadata } from "@/lib/legal/metadata";

export const generateMetadata = () => legalMetadata("privacy");

export default async function Page({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  return <LegalDocument slug="privacy" locale={isLocale(locale) ? locale : "en"} />;
}
