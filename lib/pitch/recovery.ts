import "server-only";
import { db } from "../db";
import { CREDIT_COSTS } from "../../config/credits";
import { refundCredits } from "../credits/ledger";
import { parseSceneGraph } from "../projects/scenes";

export async function recoverPitchCredits() {
  const projects = await db.project.findMany({ where: { videoType: "pitch-deck", status: "DRAFT", createdAt: { lt: new Date(Date.now() - 10 * 60_000) } },
    include: { versions: { orderBy: { number: "desc" }, take: 1 } }, take: 100 });
  let recovered = 0;
  for (const project of projects) {
    if (parseSceneGraph(project.versions[0]?.scenes).pitch?.state !== "analyzing") continue;
    await refundCredits(project.userId, { amount: CREDIT_COSTS.pitch.analysis, reference: project.id, description: "Pitch · interrupted analysis" });
    await db.project.update({ where: { id: project.id }, data: { status: "FAILED" } }); recovered++;
  }
  return recovered;
}
