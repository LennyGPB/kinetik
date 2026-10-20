"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { Logo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

export function SiteHeader({ homeLinks = false }: { homeLinks?: boolean }) {
  const t = useDictionary();

  const NAV = [
  { href: `${homeLinks ? "/" : ""}#styles`, label: t.nav.styles },
  { href: `${homeLinks ? "/" : ""}#pricing`, label: t.nav.pricing },
  { href: "/support", label: t.nav.support },
];

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <div
        className={cn(
          // Desktop : grille 1fr / auto / 1fr pour centrer la navigation sur la page, quelle que soit la largeur des côtés
          "mx-auto flex h-14 max-w-7xl items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr] rounded-full border px-3 pl-4 transition-[background-color,border-color,box-shadow] duration-300 sm:px-4 sm:pl-5",
          scrolled || open ? "glass border-line shadow-[var(--shadow-soft)]" : "border-transparent",
        )}
      >
        <div className="flex items-center gap-3 justify-self-start sm:gap-4">
          <Link href="/" aria-label={t.a11y.home} className="rounded-full" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
          <div className="flex items-center gap-2"><LanguageToggle /><ThemeToggle /></div>
        </div>

        <nav aria-label={t.a11y.mainNav} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} className="rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg">
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm", className: "hidden sm:inline-flex" })}>
            {t.common.login}
          </Link>
          <Link href="/register" className={buttonVariants({ variant: "purple", size: "sm", className: "hidden sm:inline-flex" })}>
            {t.common.getStarted}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.common.closeMenu : t.common.openMenu}
            className="relative grid size-9 place-items-center rounded-full border border-line bg-surface/60 lg:hidden"
          >
            <span className="sr-only">{t.common.menu}</span>
            <motion.span
              className="absolute h-[1.5px] w-4 rounded-full bg-fg"
              animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -3.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
            <motion.span
              className="absolute h-[1.5px] w-4 rounded-full bg-fg"
              animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 3.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { delay: 0.15 } }}
            className="fixed inset-0 top-0 -z-10 bg-bg/95 backdrop-blur-xl lg:hidden"
          >
            <motion.nav
              aria-label={t.a11y.mobileNav}
              className="flex h-full flex-col px-6 pt-28 pb-[max(2rem,env(safe-area-inset-bottom))]"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{ hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } }, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
            >
              <ul className="flex flex-col">
                {NAV.map((item) => (
                  <motion.li
                    key={item.href}
                    variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } } }}
                  >
                    <NavLink
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="group flex items-center justify-between border-b border-line py-4 font-display text-3xl font-semibold tracking-tight"
                    >
                      {item.label}
                      <ArrowRight className="size-5 -translate-x-2 text-accent-text opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </NavLink>
                  </motion.li>
                ))}
              </ul>
              <motion.div
                className="mt-auto grid grid-cols-2 gap-3"
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
              >
                <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  {t.common.login}
                </Link>
                <Link href="/register" className={buttonVariants({ variant: "purple", size: "lg" })}>
                  {t.common.getStarted}
                </Link>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/** Ancres de la landing en lien simple ; pages (« /support ») via le Link localisé. */
function NavLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  return href.startsWith("/") ? <Link href={href} {...props} /> : <a href={href} {...props} />;
}
