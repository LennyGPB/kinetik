/** Optional live smoke test. Uses a synthetic PDF and incurs one Claude API call. */
import { mkdir, writeFile } from "node:fs/promises";
import { analyzePitch } from "../lib/pitch/analyze";
import { samplePdf } from "../lib/pitch/test-fixtures";
import { z } from "zod";

async function main() {
  const lines = [["Studio", "Scheduling for small teams", "Launch in less than a day"], ["The problem", "Small teams lose 5 hours a week managing bookings.", "Customer survey 2025: 100 respondents."], ["The solution", "One shared booking page.", "Automatic reminders and a shared team calendar."], ["Traction", "Active teams: 2023: 100, 2024: 250, 2025: 600.", "Monthly retention: 92 percent."], ["Team", "Alex Martin, CEO. Sam Lee, CTO.", "Fictional company for a technical test."], ["Next step", "Book a demo at studio.example", "hello@studio.example"]];
  const result = await analyzePitch({ pdf: samplePdf(6, lines), pages: 6, fonts: ["Helvetica"] },
    { duration: 30, tone: "customers", locale: "fr", format: "LANDSCAPE" }, { userId: "pitch-synthetic-smoke", plan: "PRO" });
  await mkdir("out/pitch-review", { recursive: true });
  await writeFile("out/pitch-review/synthetic-plan.json", JSON.stringify(result.plan, null, 2));
  console.log(JSON.stringify({ model: process.env.PITCH_MODEL_ID || "claude-sonnet-5-5", scenes: result.plan.scenes.length, inputTokens: result.inputTokens, outputTokens: result.outputTokens,
    estimatedClaudeUsd: result.inputTokens * 2 / 1_000_000 + result.outputTokens * 10 / 1_000_000 }));
}
main().catch((error) => { console.error(error instanceof z.ZodError ? error.issues.map((issue) => ({ path: issue.path, message: issue.message })) : error instanceof Error ? error.name : "pitch_test_failed"); process.exitCode = 1; });
