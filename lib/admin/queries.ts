import "server-only";
import { getCreditBalance } from "@/lib/credits/ledger";
import { projectBalance } from "@/lib/credits/balance";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Lectures du tableau de bord admin. À n'appeler qu'après requireAdmin() (les pages admin le font avant tout).
 * Ne renvoie que les champs affichés : jamais de hash de mot de passe ni de jeton de session.
 */

export const ADMIN_PAGE_SIZE = 20;
const DAY = 24 * 60 * 60 * 1000;

/** Crédits consommés par l'usage (génération, modification, export), hors remboursements et ajustements. */
const USAGE_TYPES = ["GENERATION", "EDIT", "EXPORT"] as const;

export async function getAdminStats() {
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY);
  const since30 = new Date(now - 30 * DAY);
  const since14 = new Date(now - 13 * DAY);
  since14.setHours(0, 0, 0, 0);

  const [usersTotal, users7, users30, byPlan, admins, projectsTotal, projectsReady, rendersDone, renders30, spent30, refunded30, bought30, signups, recentUsers] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: since7 } } }),
      db.user.count({ where: { createdAt: { gte: since30 } } }),
      db.user.groupBy({ by: ["plan"], _count: { _all: true } }),
      db.user.count({ where: { role: "ADMIN" } }),
      db.project.count(),
      db.project.count({ where: { status: "READY" } }),
      db.render.count({ where: { status: "DONE" } }),
      db.render.count({ where: { status: "DONE", createdAt: { gte: since30 } } }),
      db.creditTransaction.aggregate({ where: { type: { in: [...USAGE_TYPES] }, amount: { lt: 0 }, createdAt: { gte: since30 } }, _sum: { amount: true } }),
      db.creditTransaction.aggregate({ where: { type: "REFUND", createdAt: { gte: since30 } }, _sum: { amount: true } }),
      db.creditTransaction.aggregate({ where: { type: { in: ["PURCHASE", "SUBSCRIPTION"] }, amount: { gt: 0 }, createdAt: { gte: since30 } }, _sum: { amount: true } }),
      db.user.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true } }),
      db.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, email: true, plan: true, createdAt: true } }),
    ]);

  const plans = { FREE: 0, STARTER: 0, PRO: 0 };
  for (const row of byPlan) plans[row.plan] = row._count._all;

  // Inscriptions par jour sur 14 jours (jour local du serveur)
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(since14.getTime() + i * DAY);
    return { date, count: 0 };
  });
  for (const { createdAt } of signups) {
    const index = Math.floor((createdAt.getTime() - since14.getTime()) / DAY);
    if (days[index]) days[index].count += 1;
  }

  return {
    users: { total: usersTotal, last7: users7, last30: users30, admins },
    subscribers: { total: plans.STARTER + plans.PRO, ...plans },
    projects: { total: projectsTotal, ready: projectsReady },
    renders: { done: rendersDone, last30: renders30 },
    credits: { spent30: Math.max(0, -(spent30._sum.amount ?? 0) - (refunded30._sum.amount ?? 0)), bought30: bought30._sum.amount ?? 0 },
    signupsByDay: days,
    recentUsers,
  };
}

export type UserFilter = "all" | "subscribers" | "admins";

export async function searchUsers({ q, page, filter }: { q: string; page: number; filter: UserFilter }) {
  const query = q.trim().slice(0, 100);
  const where: Prisma.UserWhereInput = {
    ...(query && { OR: [{ email: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }, { id: query }] }),
    ...(filter === "subscribers" && { plan: { not: "FREE" } }),
    ...(filter === "admins" && { role: "ADMIN" }),
  };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: { id: true, name: true, email: true, plan: true, role: true, createdAt: true, _count: { select: { projects: true } } },
    }),
  ]);

  // Même calcul des lots et échéances que le solde client, en une seule lecture pour la page.
  const sums = users.length
    ? await db.creditTransaction.findMany({ where: { userId: { in: users.map((u) => u.id) } }, select: { id: true, userId: true, source: true, type: true, amount: true, createdAt: true, expiresAt: true } })
    : [];
  const balance = (userId: string) => projectBalance(sums.filter((row) => row.userId === userId)).total;

  return { total, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)), users: users.map((u) => ({ ...u, projects: u._count.projects, credits: balance(u.id) })) };
}

export async function getAdminUser(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      role: true,
      planRenewsAt: true,
      emailVerified: true,
      createdAt: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
      _count: { select: { sessions: true } },
    },
  });
  if (!user) return null;
  const [balance, projects, transactions] = await Promise.all([
    getCreditBalance(id),
    db.project.findMany({
      where: { userId: id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, status: true, format: true, duration: true, createdAt: true, updatedAt: true, _count: { select: { versions: true, renders: true } } },
    }),
    db.creditTransaction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, amount: true, type: true, description: true, createdAt: true } }),
  ]);
  const { passwordHash, accounts, _count, ...rest } = user;
  return {
    ...rest,
    loginMethods: [...(passwordHash ? ["Mot de passe"] : []), ...accounts.map((a) => a.provider)],
    activeSessions: _count.sessions,
    balance,
    projects,
    transactions,
  };
}

export async function listAdminProjects({ q, page }: { q: string; page: number }) {
  const query = q.trim().slice(0, 100);
  const where: Prisma.ProjectWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { appName: { contains: query, mode: "insensitive" } },
          { user: { email: { contains: query, mode: "insensitive" } } },
          { id: query },
        ],
      }
    : {};
  const [total, projects] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        status: true,
        format: true,
        duration: true,
        createdAt: true,
        user: { select: { id: true, email: true } },
        _count: { select: { renders: true, versions: true } },
      },
    }),
  ]);
  return { total, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)), projects };
}

export async function listAdminLogs({ page }: { page: number }) {
  const [total, logs] = await Promise.all([
    db.adminLog.count(),
    db.adminLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE }),
  ]);
  return { total, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)), logs };
}

export function recentAdminLogs(take = 6) {
  return db.adminLog.findMany({ orderBy: { createdAt: "desc" }, take });
}

/** Numéro de page lu dans l'URL, borné. */
export function parsePage(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}
