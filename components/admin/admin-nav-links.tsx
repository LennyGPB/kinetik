"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Film, LayoutDashboard, ScrollText, Users } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

export function AdminNavLinks() {
  const t = useDictionary();

  const LINKS = [
  { href: "/admin", label: t.copy["0d214ec700d5"], icon: LayoutDashboard },
  { href: "/admin/users", label: t.copy["23d3938b5ef0"], icon: Users },
  { href: "/admin/videos", label: t.locale === "fr" ? "Projets" : "Projects", icon: Film },
  { href: "/admin/logs", label: t.copy["43b7c75d56f0"], icon: ScrollText },
];

  const pathname = usePathname();
  return (
    <nav aria-label={"Admin"} className="flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-none">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
              active ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
            )}
          >
            <Icon className="size-4" />
            <span className="max-md:hidden">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
