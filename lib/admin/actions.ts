"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ADMIN_UNLOCK_MS, adminForAction, type Admin, checkAdminPassword, getAdminState, isAdminPasswordConfigured, logAdmin } from "@/lib/admin/auth";
import { getCreditBalance, grantCredits, InsufficientCreditsError, spendCredits } from "@/lib/credits/ledger";
import { db } from "@/lib/db";
import { deleteUserWithFiles } from "@/lib/account/delete-user";
import { rateLimitAll, resetRateLimit } from "@/lib/rate-limit";
import { LIMITS, limitKey, requestIp, tooMany } from "@/lib/security/limits";
import { isTemplateKind, MAX_POPULAR, templatesOfKind } from "@/config/template-catalog";
import { TEMPLATE_SETTINGS_TAG } from "@/lib/templates/settings";

/**
 * Actions du tableau de bord admin. Chacune revérifie l'accès (rôle ADMIN + mot de passe admin saisi pour cette session) :
 * une Server Action est appelable directement en POST, la vérification de la page ne la protège pas.
 */

export type AdminFormState = { ok?: boolean; error?: string; message?: string };

const DENIED: AdminFormState = { error: "Accès refusé. Déverrouille l’espace admin." };

/** Admin déverrouillé ET sous sa limite de fréquence ; sinon l'état d'erreur à renvoyer. */
async function guard(): Promise<{ admin: Admin; denied?: undefined } | { admin?: undefined; denied: AdminFormState }> {
  const admin = await adminForAction();
  if (!admin) return { denied: DENIED };
  const limited = await limitKey("admin", admin.id, LIMITS.admin);
  if (!limited.ok) return { denied: { error: tooMany(limited) } };
  return { admin };
}

// ───────────── Déverrouillage ─────────────

export async function unlockAdmin(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const state = await getAdminState();
  if (!state) redirect("/login");
  // Un compte non admin ne voit jamais l'espace admin : même réponse qu'un mauvais mot de passe
  if (!state.isAdmin) return { error: "Mot de passe incorrect." };
  if (!isAdminPasswordConfigured()) return { error: "Mot de passe admin non configuré sur le serveur (ADMIN_PASSWORD_HASH)." };

  const key = `admin-unlock:${state.user.id}`;
  const limited = await rateLimitAll([
    [key, LIMITS.adminUnlock.user],
    [`admin-unlock-ip:${await requestIp()}`, LIMITS.adminUnlock.ip],
  ]);
  if (!limited.ok) return { error: tooMany(limited) };

  const password = String(formData.get("password") ?? "").slice(0, 200);
  if (!(await checkAdminPassword(password))) {
    await logAdmin(state.user, "unlock.failed");
    return { error: "Mot de passe incorrect." };
  }

  await resetRateLimit(key, LIMITS.adminUnlock.user);
  await db.session.update({ where: { id: state.user.sessionId }, data: { adminUntil: new Date(Date.now() + ADMIN_UNLOCK_MS) } });
  await logAdmin(state.user, "unlock");
  redirect("/admin");
}

export async function lockAdmin() {
  const state = await getAdminState();
  if (state) await db.session.update({ where: { id: state.user.sessionId }, data: { adminUntil: null } });
  redirect("/dashboard");
}

// ───────────── Crédits ─────────────

const creditsSchema = z.object({
  userId: z.string().min(1).max(64),
  direction: z.enum(["grant", "revoke"]),
  amount: z.coerce.number().int().min(1).max(100_000),
  reason: z.string().trim().min(3).max(200),
});

export async function adjustCredits(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { admin, denied } = await guard();
  if (denied) return denied;
  const parsed = creditsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Montant (1 à 100 000) et motif (3 caractères minimum) requis." };
  const { userId, direction, amount, reason } = parsed.data;

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!target) return { error: "Utilisateur introuvable." };

  const description = `Ajustement admin · ${reason}`;
  try {
    if (direction === "grant") await grantCredits(userId, { amount, type: "ADJUSTMENT", source: "PACK", description });
    else await spendCredits(userId, { amount, type: "ADJUSTMENT", description });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) return { error: `Solde insuffisant : ${error.available} crédits disponibles.` };
    throw error;
  }

  await logAdmin(admin, direction === "grant" ? "credits.grant" : "credits.revoke", { type: "user", id: userId, label: target.email }, { amount, reason });
  const balance = await getCreditBalance(userId);
  refresh();
  return { ok: true, message: `${direction === "grant" ? "+" : "−"}${amount} crédits · nouveau solde : ${balance.total}` };
}

// ───────────── Suppressions ─────────────

export async function deleteUserAdmin(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { admin, denied } = await guard();
  if (denied) return denied;
  const userId = String(formData.get("userId") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase();

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, _count: { select: { projects: true } } } });
  if (!target) return { error: "Utilisateur introuvable." };
  if (target.id === admin.id) return { error: "Tu ne peux pas supprimer ton propre compte depuis l’admin." };
  if (target.role === "ADMIN") return { error: "Un compte admin ne peut pas être supprimé ici. Retire-lui d’abord le rôle en base." };
  if (confirm !== target.email.toLowerCase()) return { error: "Recopie l’email exact du compte pour confirmer." };

  // Cascade : sessions, projets (versions, rendus, médias), brand kits et transactions de crédits ; fichiers effacés ensuite
  await deleteUserWithFiles(target.id);
  await logAdmin(admin, "user.delete", { type: "user", id: target.id, label: target.email }, { projects: target._count.projects });
  redirect("/admin/users");
}

export async function deleteProjectAdmin(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { admin, denied } = await guard();
  if (denied) return denied;
  const projectId = String(formData.get("projectId") ?? "");
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true, name: true, user: { select: { email: true } } } });
  if (!project) return { error: "Vidéo introuvable." };

  await db.project.delete({ where: { id: project.id } });
  await logAdmin(admin, "project.delete", { type: "project", id: project.id, label: `${project.name} · ${project.user.email}` });
  refresh();
  return { ok: true, message: `« ${project.name} » supprimée.` };
}

// ───────────── Templates ─────────────

const templateSettingSchema = z.object({
  kind: z.string().refine(isTemplateKind),
  templateId: z.string().min(1).max(100),
  field: z.enum(["hidden", "popular"]),
  value: z.boolean(),
});

/** Masque / réaffiche un template, ou le met en « Populaire » (8 max par catégorie). */
export async function setTemplateSetting(input: { kind: string; templateId: string; field: "hidden" | "popular"; value: boolean }): Promise<AdminFormState> {
  const { admin, denied } = await guard();
  if (denied) return denied;
  const parsed = templateSettingSchema.safeParse(input);
  if (!parsed.success || !isTemplateKind(parsed.data.kind)) return { error: "Requête invalide." };
  const { templateId, field, value } = parsed.data;
  const kind = parsed.data.kind;
  const template = templatesOfKind(kind, "fr").find((item) => item.id === templateId);
  if (!template) return { error: "Template introuvable." };

  const key = { kind_templateId: { kind, templateId } };
  if (field === "popular" && value) {
    const result = await db.$transaction(async (tx) => {
      const current = await tx.templateSetting.findUnique({ where: key });
      if (current?.hidden) return { error: "Réaffiche ce template avant de le mettre en populaire." };
      const count = await tx.templateSetting.count({ where: { kind, popular: true, hidden: false, NOT: { templateId } } });
      if (count >= MAX_POPULAR) return { error: `${MAX_POPULAR} templates populaires maximum dans cette catégorie. Retires-en un d’abord.` };
      await tx.templateSetting.upsert({ where: key, create: { kind, templateId, popular: true }, update: { popular: true } });
      return null;
    }, { isolationLevel: "Serializable" });
    if (result) return result;
  } else {
    // Masquer retire aussi le badge « Populaire »
    const data = field === "hidden" ? { hidden: value, ...(value ? { popular: false } : {}) } : { popular: false };
    await db.templateSetting.upsert({ where: key, create: { kind, templateId, ...data }, update: data });
  }

  const action = field === "hidden" ? (value ? "template.hide" : "template.show") : value ? "template.popular" : "template.unpopular";
  await logAdmin(admin, action, { type: "template", id: `${kind}:${templateId}`, label: template.name });
  updateTag(TEMPLATE_SETTINGS_TAG);
  refresh();
  const label = field === "hidden" ? (value ? "masqué" : "réaffiché") : value ? "mis en populaire" : "retiré des populaires";
  return { ok: true, message: `« ${template.name} » ${label}.` };
}
