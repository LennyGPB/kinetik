import { LegalDocument } from "@/components/legal/legal-document";
import { isLocale } from "@/lib/i18n";
import { legalMetadata } from "@/lib/legal/metadata";

export const generateMetadata = () => legalMetadata("cookies");

export default async function Page({ params }: PageProps<"/[locale]/cookies">) {
  const { locale } = await params;
  return <LegalDocument slug="cookies" locale={isLocale(locale) ? locale : "en"} />;
}
