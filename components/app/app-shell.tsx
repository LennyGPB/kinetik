"use client";
import { CreateContentButton } from "@/components/create/create-content-button";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Coins, LayoutGrid, LayoutTemplate, MessageSquareHeart, Palette, Plus, Settings } from "lucide-react";
import { motion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { usePathname } from "@/lib/i18n/navigation";
import type { ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import "./nav-featured.css";

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  sidebarAccount,
  mobileAccount,
  children,
}: {
  sidebarAccount: ReactNode;
  mobileAccount: ReactNode;
  children: ReactNode;
}) {
  const t = useDictionary();

  const NAV = [
  { href: "/dashboard", label: t.app.nav.dashboard, icon: LayoutGrid },
  // Mis en avant (teinte violette + tag « New ») même quand on n'est pas sur la page
  { href: "/templates", label: t.app.nav.templates, icon: LayoutTemplate, featured: true },
  { href: "/brand-kit", label: t.app.nav.brandKit, icon: Palette },
  { href: "/credits", label: t.app.nav.credits, icon: Coins },
  { href: "/settings", label: t.app.nav.settings, icon: Settings },
  { href: "/feedback", label: t.app.nav.feedback, icon: MessageSquareHeart },
];

  const isActive = useIsActive();

  return (
    <div className="min-h-dvh lg:pl-60">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-bg p-3 lg:flex">
        <div className="flex items-center justify-between px-2 py-1">
          <Link href="/dashboard" aria-label={t.app.nav.dashboard} className="rounded-full">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="px-2 pt-2"><LanguageToggle /></div>

        <CreateContentButton className={buttonVariants({ variant: "purple", className: "mt-5 w-full rounded-xl" })}>
          <Plus /> {t.app.nav.create}
        </CreateContentButton>

        <nav aria-label={t.a11y.appNav} className="mt-6">
          <ul className="flex flex-col gap-0.5">
            {NAV.map(({ href, label, icon: Icon, featured }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      featured && "nav-featured",
                      active || featured ? "text-fg" : "text-muted hover:bg-surface hover:text-fg",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-surface-2"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                    <Icon className={cn("relative size-[18px]", (active || featured) && "text-accent-text", featured && "nav-featured-icon")} />
                    <span className="relative">{label}</span>
                    {featured && (
                      <span className="nav-featured-tag relative ml-auto rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wide text-white uppercase">
                        New
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto">{sidebarAccount}</div>
      </aside>

      {/* Barre supérieure mobile */}
      <header className="glass sticky top-0 z-40 flex h-14 min-w-0 items-center justify-between gap-2 border-b border-line px-3 sm:px-4 lg:hidden">
        <Link href="/dashboard" aria-label={t.app.nav.dashboard} className="shrink-0 rounded-full">
          <span className="sm:hidden"><LogoMark /></span>
          <span className="hidden sm:inline-flex"><Logo /></span>
        </Link>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <LanguageToggle />
          <ThemeToggle />
          {mobileAccount}
        </div>
      </header>

      <main className="min-w-0 px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>

      {/* Onglets mobile */}
      <nav
        aria-label={t.a11y.appNav}
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
          {/* Mobile : Paramètres reste accessible depuis le menu de l'avatar */}
          {[NAV[0], NAV[1], null, NAV[2], NAV[3]].map((item, i) => {
            if (!item) {
              return (
                <li key="create" className="flex justify-center">
                  <CreateContentButton
                    aria-label={t.app.nav.create}
                    className={buttonVariants({ variant: "purple", size: "icon", className: "size-12 -translate-y-3 rounded-2xl [&_svg]:size-6" })}
                  >
                    <Plus className="size-6" />
                  </CreateContentButton>
                </li>
              );
            }
            const { href, label, icon: Icon, featured } = item;
            const active = isActive(href);
            return (
              <li key={href ?? i}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors", active ? "text-fg" : "text-subtle")}
                >
                  <span className="relative grid h-7 w-12 place-items-center">
                    {active && (
                      <motion.span
                        layoutId="tab-active"
                        className="absolute inset-0 rounded-full bg-accent-soft"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                    <Icon className={cn("relative size-5", (active || featured) && "text-accent-text")} />
                    {featured && <span aria-hidden className="nav-featured-tag absolute top-0 right-2.5 size-2 rounded-full ring-2 ring-bg" />}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
