"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Film, LayoutDashboard, LayoutTemplate, ScrollText, Sparkles, Users } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

export function AdminNavLinks() {
  const t = useDictionary();

  const LINKS = [
  { href: "/admin", label: t.copy["0d214ec700d5"], icon: LayoutDashboard },
  { href: "/admin/users", label: t.copy["23d3938b5ef0"], icon: Users },
  { href: "/admin/videos", label: t.locale === "fr" ? "Projets" : "Projects", icon: Film },
  { href: "/admin/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/admin/studio", label: "Claude privé", icon: Sparkles },
  { href: "/admin/logs", label: t.copy["43b7c75d56f0"], icon: ScrollText },
];

  const pathname = usePathname();
  return (
    <nav aria-label={"Admin"} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            title={label}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
              active ? "bg-surface-2 text-fg shadow-[inset_0_0_0_1px_var(--color-line)]" : "text-muted hover:bg-surface-2/50 hover:text-fg",
            )}
          >
            <Icon className="size-4" />
            <span className="max-lg:hidden">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
