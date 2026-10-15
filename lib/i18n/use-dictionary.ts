import { useLocale } from "next-intl";
import { getDictionary, isLocale } from "./index";

export function useDictionary() {
  const value = useLocale();
  return getDictionary(isLocale(value) ? value : "en");
}
