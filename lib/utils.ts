import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatage de date stable serveur/client (fuseau fixe pour éviter les écarts d'hydratation). */
export function formatDate(date: Date | string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }, locale: "en" | "fr" = "en") {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", ...options }).format(new Date(date));
}

export function formatNumber(value: number, locale: "en" | "fr" = "en") {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB").format(value);
}

/** mm:ss */
export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
