"use client";


import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === "fr" ? "en" : "fr";
  return <button type="button" aria-label={next === "fr" ? "Switch to French" : "Passer en anglais"} title={next === "fr" ? "Français" : "English"} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-line bg-surface/60 px-2.5 text-xs font-semibold text-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" onClick={() => {
    router.replace(`${pathname}${window.location.search}${window.location.hash}`, { locale: next });
  }}><span className={locale === "fr" ? "text-fg" : "opacity-50"}>FR</span><span aria-hidden="true">/</span><span className={locale === "en" ? "text-fg" : "opacity-50"}>EN</span></button>;
}
