import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { readSession } from "./session";

export type CurrentUser = {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  plan: "FREE" | "STARTER" | "PRO";
  planRenewsAt: Date | null;
  hasPassword: boolean;
};

/**
 * Data Access Layer : point d'entrée unique pour lire l'utilisateur connecté.
 * Dédupliqué par requête. Doit être appelé sous un <Suspense> (lecture des cookies).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, plan: true, planRenewsAt: true, passwordHash: true },
  });
  if (!user) return null;

  const { passwordHash, ...rest } = user;
  return { ...rest, sessionId: session.sessionId, hasPassword: Boolean(passwordHash) };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
