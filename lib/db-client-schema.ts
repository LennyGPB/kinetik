/** HMR can preserve a client instance even when the imported generated metadata has changed. */
export function clientMatchesSchema(client: unknown, models: Record<string, readonly string[]>): boolean {
  if (!client || typeof client !== "object") return false;
  const candidate = client as Record<string, unknown>;
  return Object.entries(models).every(([model, fields]) => {
    const key = model[0].toLowerCase() + model.slice(1);
    const delegate = candidate[key] as { findMany?: unknown; fields?: Record<string, unknown> } | undefined;
    return typeof delegate?.findMany === "function" && fields.every((field) => Boolean(delegate.fields?.[field]));
  });
}
