import "server-only";
import { db } from "@/lib/db";
import type { CustomDemo, CustomMotionMeta } from "./contract";
import { parseAssets, parseDemo, parseMeta } from "./queries";

/** État d'une vidéo dans le studio admin (envoyé au client). */
export type StudioView = {
  id: string;
  name: string;
  source: string;
  compiled: string;
  meta: CustomMotionMeta | null;
  demo: CustomDemo | null;
  assets: Record<string, string>;
  thumbnail: string | null;
  published: boolean;
  popular: boolean;
  versions: { number: number; createdAt: string; projects: number }[];
  messages: { id: string; role: "user" | "assistant"; content: string; createdAt: string; restorable: boolean }[];
};

export async function getStudio(id: string): Promise<StudioView | null> {
  const motion = await db.customMotion.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { number: "desc" }, select: { id: true, number: true, createdAt: true } },
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true, createdAt: true, source: true } },
    },
  });
  if (!motion) return null;
  const usage = motion.versions.length ? await db.project.groupBy({ by: ["styleId"], where: { styleId: { in: motion.versions.map((v) => `community:${v.id}`) } }, _count: true }) : [];
  return {
    id: motion.id, name: motion.name, source: motion.source, compiled: motion.compiled,
    meta: parseMeta(motion.meta), demo: parseDemo(motion.demo), assets: parseAssets(motion.assets),
    thumbnail: motion.thumbnail, published: motion.published, popular: motion.popular,
    versions: motion.versions.map((v) => ({ number: v.number, createdAt: v.createdAt.toISOString(), projects: usage.find((u) => u.styleId === `community:${v.id}`)?._count ?? 0 })),
    messages: motion.messages.map((m) => ({ id: m.id, role: m.role === "user" ? "user" : "assistant", content: m.content, createdAt: m.createdAt.toISOString(), restorable: m.role !== "user" && m.source !== null })),
  };
}

export async function listStudio() {
  const motions = await db.customMotion.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true, published: true, popular: true, updatedAt: true, _count: { select: { versions: true } } } });
  return motions.map((m) => ({ id: m.id, name: m.name, published: m.published, popular: m.popular, updatedAt: m.updatedAt.toISOString(), versions: m._count.versions }));
}
