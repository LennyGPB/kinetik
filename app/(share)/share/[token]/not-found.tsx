import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";

/** Lien inconnu ou désactivé par son propriétaire. */
export default function ShareNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <p className="max-w-sm text-muted">{t.app.share.notFound}</p>
      <Link href="/" className={buttonVariants({ variant: "secondary" })}>
        {t.common.back}
      </Link>
    </div>
  );
}
