import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, AuthHeader } from "@/components/auth/auth-header";
import { RegisterForm } from "@/components/auth/auth-forms";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.auth.registerTitle }; }

export default function RegisterPage() {
  const t = useDictionary();

  return (
    <>
      <AuthHeader title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle} />
      <Suspense fallback={<AuthFormSkeleton fields={3} />}>
        <RegisterForm />
      </Suspense>
    </>
  );
}
