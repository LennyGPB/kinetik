import "server-only";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export async function localizedRedirect(href: string): Promise<never> {
  const locale = await getLocale();
  const path = /^\/(en|fr)(?:\/|$)/.test(href) ? href : `/${locale === "fr" ? "fr" : "en"}${href === "/" ? "" : href}`;
  redirect(path);
}
