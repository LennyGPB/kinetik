import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, AuthHeader } from "@/components/auth/auth-header";
import { RegisterForm } from "@/components/auth/auth-forms";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.registerTitle };

export default function RegisterPage() {
  return (
    <>
      <AuthHeader title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle} />
      <Suspense fallback={<AuthFormSkeleton fields={3} />}>
        <RegisterForm />
      </Suspense>
    </>
  );
}
