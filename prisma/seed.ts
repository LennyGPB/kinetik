/**
 * Données de démo : `npm run db:seed`
 * Compte : demo@kinetik.app / kinetik-demo
 */
import { SIGNUP_BONUS_CREDITS } from "../config/credits";
import { hashPassword } from "../lib/auth/password";
import { db } from "../lib/db";
import { generateVideo, welcomeMessage } from "../lib/services/ai-mock";

const EMAIL = "demo@kinetik.app";

async function main() {
  await db.user.deleteMany({ where: { email: EMAIL } });

  const user = await db.user.create({
    data: { name: "Léa Martin", email: EMAIL, passwordHash: await hashPassword("kinetik-demo") },
  });

  await db.creditTransaction.createMany({
    data: [
      { userId: user.id, amount: SIGNUP_BONUS_CREDITS, type: "SIGNUP_BONUS", source: "PACK", description: "Bonus d'inscription" },
      { userId: user.id, amount: 300, type: "PURCHASE", source: "PACK", description: "Pack 300 crédits", reference: "demo-purchase" },
    ],
  });

  await db.brandKit.create({
    data: { userId: user.id, name: "Flowly", colors: ["#7c3aed", "#f472b6", "#0ea5e9"], headingFont: "Bricolage Grotesque", bodyFont: "Geist", isDefault: true },
  });

  const projects = [
    { appName: "Flowly", styleId: "gradient-flow", format: "LANDSCAPE", duration: 30, colors: ["#7c3aed", "#f472b6"], status: "READY", edits: ["Plus dynamique", "Mets le logo en avant"] },
    { appName: "Taskr", styleId: "kinetic-typo", format: "PORTRAIT", duration: 15, colors: ["#111111", "#ff4d2e"], status: "READY", edits: [] },
    { appName: "Nebula CRM", styleId: "corporate", format: "SQUARE", duration: 45, colors: ["#3b82f6", "#e2e8f0"], status: "DRAFT", edits: [] },
  ] as const;

  for (const p of projects) {
    const project = await db.project.create({
      data: {
        userId: user.id,
        name: p.appName,
        appName: p.appName,
        styleId: p.styleId,
        format: p.format,
        duration: p.duration,
        colors: [...p.colors],
        status: p.status,
        musicTrackId: "launch-day",
      },
    });
    if (p.status !== "READY") continue;
    await db.creditTransaction.create({
      data: { userId: user.id, amount: -10, type: "GENERATION", source: "PACK", description: `Génération · ${p.appName}`, reference: project.id },
    });

    const graph = await generateVideo({ appName: p.appName, duration: p.duration, musicTrackId: "launch-day" });
    await db.projectVersion.create({ data: { projectId: project.id, number: 1, scenes: graph, label: "Premier jet" } });
    await db.chatMessage.create({ data: { projectId: project.id, role: "ASSISTANT", content: welcomeMessage(p.appName) } });
  }

  console.log(`✔ Seed terminé — ${EMAIL} / kinetik-demo`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
