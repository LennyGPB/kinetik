import { useDictionary } from "@/lib/i18n/use-dictionary";
import Link from "@/lib/i18n/navigation";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

/** Lien inconnu ou désactivé par son propriétaire. */
export default function ShareNotFound() {
  const t = useDictionary();

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
