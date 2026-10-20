import type { Metadata, Viewport } from "next";
import { Allura, Anton, Bricolage_Grotesque, Geist_Mono, Instrument_Serif, Poppins, Unbounded } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider, themeScript } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { siteConfig } from "@/config/site";
import { getDictionary, isLocale, locales } from "@/lib/i18n";
import { getLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import "../globals.css";

// Police de l'interface (textes et titres) : sobre et professionnelle
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
// Mots mis en valeur dans les grands titres (landing) : Poppins Thin italique, chargée à part (un seul fichier)
const poppinsThin = Poppins({ variable: "--font-poppins-thin", subsets: ["latin"], weight: "100", style: "italic" });
// Police secondaire, réservée aux grands titres (h1, accroches) : large, « tech », en mouvement
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], weight: ["200", "500", "600", "700"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Polices des aperçus de templates (Bricolage = typo « display » des vidéos ; Editorial, Luxe, Brutalist…)
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400" });
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });
// Écriture manuscrite de la miniature du template Cursive (non préchargée : seule la galerie l'utilise)
const allura = Allura({ variable: "--font-script", subsets: ["latin"], weight: "400", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(isLocale(locale) ? locale : "en");
  return {
  metadataBase: new URL(siteConfig.url),
  title: { default: t.meta.title, template: `%s · ${siteConfig.name}` },
  description: t.meta.description,
  openGraph: { title: t.meta.title, description: t.meta.description, siteName: siteConfig.name, type: "website" },
  };
}

export function generateStaticParams() { return locales.map((locale) => ({ locale })); }

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Clavier virtuel : la page se redimensionne (le champ du chat de l'éditeur reste visible au-dessus du clavier)
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#07070c" },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  return (
    <html
      lang={locale}
      data-theme="dark"
      suppressHydrationWarning
      className={`${poppins.variable} ${poppinsThin.variable} ${unbounded.variable} ${geistMono.variable} ${bricolage.variable} ${instrumentSerif.variable} ${anton.variable} ${allura.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg text-fg">
        <NextIntlClientProvider locale={locale} messages={dictionary} timeZone="Europe/Paris">
        <ThemeProvider>
          <Toaster>{children}</Toaster>
        </ThemeProvider>
        </NextIntlClientProvider>
        {/* Vercel Web Analytics : mesure d'audience sans cookie (voir politique cookies) */}
        <Analytics />
      </body>
    </html>
  );
}
