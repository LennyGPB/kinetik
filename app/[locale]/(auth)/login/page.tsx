import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, AuthHeader } from "@/components/auth/auth-header";
import { LoginForm } from "@/components/auth/auth-forms";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.common.login }; }

export default function LoginPage() {
  const t = useDictionary();

  return (
    <>
      <AuthHeader title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle} />
      <Suspense fallback={<AuthFormSkeleton fields={2} />}>
        <LoginForm />
      </Suspense>
    </>
  );
}
