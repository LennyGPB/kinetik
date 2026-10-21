import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { authRedirectTarget } from "@/lib/auth/constants";
import { localizedRedirect } from "@/lib/i18n/redirect";

/** Validate the real session under Suspense before showing a login or signup form. */
export async function AuthEntry({ children, searchParams }: {
  children: ReactNode;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) {
    const values = await searchParams;
    const params = new URLSearchParams();
    for (const key of ["redirectTo", "kind", "app", "style"]) {
      const value = values[key];
      if (typeof value === "string") params.set(key, value);
    }
    await localizedRedirect(authRedirectTarget(params));
  }
  return children;
}
