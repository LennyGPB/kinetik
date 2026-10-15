import { getRequestConfig } from "next-intl/server";
import * as rootParams from "next/root-params";
import { getDictionary, isLocale } from "./index";

export default getRequestConfig(async ({ locale: override, requestLocale }) => {
  const value = override ?? await rootLocale() ?? await requestLocale;
  const locale = isLocale(value) ? value : "en";
  return { locale, messages: getDictionary(locale), timeZone: "Europe/Paris" };
});

/** next/root-params n'est pas disponible dans les Server Actions ni les Route Handlers : on retombe alors sur la locale posée par le proxy. */
async function rootLocale() {
  try {
    return await rootParams.locale();
  } catch {
    return undefined;
  }
}
