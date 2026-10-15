"use client";


import { createContext, useCallback, useContext, useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "kinetik-theme";

/** Script inline exécuté avant le premier paint (aucun flash). */
export const themeScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}")||"dark";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`;

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ── Store externe (localStorage + préférence système) ──

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {}
  // Kinetik est pensé en sombre : c'est le thème par défaut tant que l'utilisateur n'a rien choisi
  return "dark";
}

function resolve(preference: ThemePreference): ResolvedTheme {
  const DARK_QUERY = "(prefers-color-scheme: dark)";

  if (preference !== "system") return preference;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function apply(theme: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  const DARK_QUERY = "(prefers-color-scheme: dark)";

  listeners.add(listener);
  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (readPreference() === "system") apply(resolve("system"));
    emit();
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onSystemChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onSystemChange);
  };
}

const getResolved = () => resolve(readPreference());

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Valeurs serveur = valeurs par défaut du HTML ; React bascule sur les vraies après hydratation.
  const preference = useSyncExternalStore(subscribe, readPreference, () => "dark" as const);
  const resolved = useSyncExternalStore(subscribe, getResolved, () => "dark" as const);

  // En dev, le remount du Strict Mode réinitialise les attributs de <html> : on ré-applique avant le paint.
  useLayoutEffect(() => apply(getResolved()), []);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    apply(resolve(next));
    emit();
  }, []);

  const toggle = useCallback(() => setPreference(getResolved() === "dark" ? "light" : "dark"), [setPreference]);

  return <ThemeContext value={{ preference, resolved, setPreference, toggle }}>{children}</ThemeContext>;
}

export function useTheme() {

  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
