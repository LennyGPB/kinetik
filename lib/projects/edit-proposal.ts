import { createHmac, timingSafeEqual } from "node:crypto";
import type { SceneGraph } from "./scenes";

export type EditProposal = { token: string; graph: SceneGraph; label: string };
export type ProposalPayload = {
  projectId: string; baseVersionId: string; messageId: string;
  graph: SceneGraph; label: string; expiresAt: number;
};

/** Session-bound, signed server output. The client cannot change the proposed graph. */
export function signProposal(payload: ProposalPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

export function verifyProposal(token: unknown, secret: string, now = Date.now()): ProposalPayload | null {
  // Plans avec calques animés : jusqu’à ~670 Ko de JSON, sous la limite de 1 Mo des Server Actions
  if (typeof token !== "string" || token.length > 900_000) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString()) as ProposalPayload;
    if (!Number.isFinite(value.expiresAt) || value.expiresAt < now || typeof value.projectId !== "string" || typeof value.baseVersionId !== "string" || typeof value.messageId !== "string" || !Array.isArray(value.graph?.scenes)) return null;
    return value;
  } catch { return null; }
}
