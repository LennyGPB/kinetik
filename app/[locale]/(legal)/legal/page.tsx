import { LegalDocument } from "@/components/legal/legal-document";
import { isLocale } from "@/lib/i18n";
import { legalMetadata } from "@/lib/legal/metadata";

export const generateMetadata = () => legalMetadata("legal");

export default async function Page({ params }: PageProps<"/[locale]/legal">) {
  const { locale } = await params;
  return <LegalDocument slug="legal" locale={isLocale(locale) ? locale : "en"} />;
}
