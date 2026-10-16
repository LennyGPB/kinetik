export const SUPPORT_TOPICS = ["question", "bug", "billing", "account", "other"] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export type SupportFormState = {
  ok?: boolean;
  message?: string;
  errors?: Partial<Record<"email" | "message", string>>;
  values?: { name: string; email: string; topic: string; message: string };
};
