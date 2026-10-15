import "server-only";
import { getLocale } from "next-intl/server";
import { getDictionary, isLocale } from "./index";
export async function getServerDictionary() {
  const value = await getLocale();
  return getDictionary(isLocale(value) ? value : "en");
}
