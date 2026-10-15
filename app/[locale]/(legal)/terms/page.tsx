import { LegalDocument } from "@/components/legal/legal-document";
import { isLocale } from "@/lib/i18n";
import { legalMetadata } from "@/lib/legal/metadata";

export const generateMetadata = () => legalMetadata("terms");

export default async function Page({ params }: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  return <LegalDocument slug="terms" locale={isLocale(locale) ? locale : "en"} />;
}
