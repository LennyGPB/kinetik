"use client";


import { format } from "@/lib/i18n";

import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Languages } from "lucide-react";
import { useState } from "react";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toaster";
import { CREDIT_COSTS } from "@/config/credits";
import { translateProject } from "@/lib/projects/actions";
import type { TranslationLanguage } from "@/lib/projects/translation";
import type { EditorVersion } from "@/lib/projects/types";

export function TranslationDialog({ open, onClose, projectId, versionId, balance, onBusy, onTranslated }: {
  open: boolean; onClose: () => void; projectId: string; versionId: string; balance: number;
  onBusy: (busy: boolean) => void;
  onTranslated: (version: EditorVersion, balance: number) => void;
}) {
  const t = useDictionary();

  const [language, setLanguage] = useState<TranslationLanguage>("en");
  const [pending, setPending] = useState(false);
  const toast = useToast();
  async function translate() {
    if (pending) return;
    setPending(true); onBusy(true);
    try {
      const result = await translateProject(projectId, versionId, language);
      if (!result.ok) {
        const description = result.error === "insufficient_credits" ? t.copy["ab9ce3befad6"]
          : result.error === "busy" ? t.copy["46ee60f3609e"]
          : result.error === "rate_limited" ? t.copy["9bd6f2191fac"]
          : t.copy["407bfcad7429"];
        toast({ title: t.copy["f91e041fb1de"], description, tone: "error" });
        return;
      }
      onTranslated(result.version, result.balance);
      toast({ title: result.version.id === versionId ? t.copy["51daa5029292"] : language === "en" ? t.copy["3463a6df63b5"] : t.copy["6c86c7f11d51"], tone: "success" });
      onClose();
    } catch {
      toast({ title: t.copy["d7028494e58a"], description: t.copy["9211e6db9539"], tone: "error" });
    } finally { setPending(false); onBusy(false); }
  }
  return <Dialog open={open} onClose={() => { if (!pending) onClose(); }} title={t.copy["48e67e95ef8a"]} description={t.copy["84e46ec40ee6"]}>
    <div className="flex flex-col gap-5">
      <Segmented label={t.copy["952e525a1b59"]} value={language} onChange={setLanguage} options={[
        { value: "en", label: t.copy["6e97c82258f6"], disabled: pending },
        { value: "fr", label: t.copy["a5cee26c744c"], disabled: pending },
      ]} className="w-full" />
      <p className="text-sm leading-relaxed text-muted">{t.copy["7c2c496cf48b"]}</p>
      <AnimatedApply
        disabled={balance < CREDIT_COSTS.translation}
        onApply={translate}
        onCancel={() => { if (!pending) onClose(); }}
        label={pending ? t.copy["b88929092140"] : format(t.copy["1594b05c5c6a"], { p0: CREDIT_COSTS.translation })}
        icon={<Languages className="size-4" aria-hidden />}
      />
      {balance < CREDIT_COSTS.translation && <p role="status" className="text-sm text-danger">{t.copy["5c30902248fb"]}</p>}
    </div>
  </Dialog>;
}
