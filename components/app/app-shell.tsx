"use client";

import { Coins, LayoutGrid, LayoutTemplate, Palette, Plus, Settings } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: t.app.nav.dashboard, icon: LayoutGrid },
  { href: "/templates", label: t.app.nav.templates, icon: LayoutTemplate },
  { href: "/brand-kit", label: t.app.nav.brandKit, icon: Palette },
  { href: "/credits", label: t.app.nav.credits, icon: Coins },
  { href: "/settings", label: t.app.nav.settings, icon: Settings },
];

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

        <Link href="/create" className={buttonVariants({ className: "mt-5 w-full rounded-xl" })}>
          <Plus /> {t.app.nav.create}
        </Link>

        <nav aria-label={t.a11y.appNav} className="mt-6">
          <ul className="flex flex-col gap-0.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "text-fg" : "text-muted hover:bg-surface hover:text-fg",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-surface-2"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                    <Icon className={cn("relative size-[18px]", active && "text-accent-text")} />
                    <span className="relative">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto">{sidebarAccount}</div>
      </aside>

      {/* Barre supérieure mobile */}
      <header className="glass sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line px-4 lg:hidden">
        <Link href="/dashboard" aria-label={t.app.nav.dashboard} className="rounded-full">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {mobileAccount}
        </div>
      </header>

      <main className="px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>

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
                  <Link
                    href="/create"
                    aria-label={t.app.nav.create}
                    className="grid size-12 -translate-y-3 place-items-center rounded-2xl bg-accent text-white transition-transform active:scale-95"
                  >
                    <Plus className="size-6" />
                  </Link>
                </li>
              );
            }
            const { href, label, icon: Icon } = item;
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
                    <Icon className={cn("relative size-5", active && "text-accent-text")} />
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
