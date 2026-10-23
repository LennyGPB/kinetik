/** Log categories and validation paths only; provider payloads can contain website text. */
export function analysisError(error: unknown, stage: "capture" | "brief" | "storage") {
  const value = error as { name?: string; message?: string; status?: number; code?: string; issues?: { path: PropertyKey[]; code: string }[] } | null;
  const known = ["ai_unavailable", "ai_budget", "invalid_url", "capture_timeout", "browser_unavailable", "site_unavailable", "storage_quota"];
  let code: string;
  if (stage === "storage") code = "analysis_storage";
  else if (value?.name === "ZodError") code = stage === "brief" ? "invalid_brief" : "analysis_failed";
  else if (value?.status === 401 || value?.status === 403) code = "ai_configuration";
  else if (value?.status === 404) code = "ai_model";
  else if (value?.status === 429) code = "ai_rate_limited";
  else if (value?.status && value.status >= 500) code = "ai_provider";
  else if (value?.name === "APIConnectionTimeoutError" || value?.name === "APIUserAbortError") code = "ai_timeout";
  else if (value?.name === "APIConnectionError") code = "ai_connection";
  else code = known.includes(value?.message ?? "") ? value!.message! : stage === "brief" ? "ai_unavailable" : "analysis_failed";
  return { code, diagnostic: { stage, kind: value?.name ?? "UnknownError", status: value?.status,
    runtime: value?.name === "TypeError" && /^Cannot read properties of (?:undefined|null) \(reading '[a-zA-Z_$]+'\)$/.test(value.message ?? "") ? value.message : undefined,
    databaseCode: value?.code?.startsWith("P") ? value.code : undefined,
    issues: value?.issues?.map((issue) => ({ path: issue.path.map(String).join("."), code: issue.code })) } };
}
