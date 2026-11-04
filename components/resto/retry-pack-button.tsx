"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { retryRestoPack } from "@/lib/resto/pack-actions";

/** Relance la préparation d'un pack sauté (carte complétée, fermeture retirée, contenus changés). */
export function RetryPackButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="purple" loading={pending} onClick={() => start(async () => { await retryRestoPack().catch(() => null); router.refresh(); })}>
      <RefreshCw />{label}
    </Button>
  );
}
