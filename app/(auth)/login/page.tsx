import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, AuthHeader } from "@/components/auth/auth-header";
import { LoginForm } from "@/components/auth/auth-forms";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.common.login };

export default function LoginPage() {
  return (
    <>
      <AuthHeader title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle} />
      <Suspense fallback={<AuthFormSkeleton fields={2} />}>
        <LoginForm />
      </Suspense>
    </>
  );
}
