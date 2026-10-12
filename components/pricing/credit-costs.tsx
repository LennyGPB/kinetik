import { CREDIT_COSTS } from "@/config/credits";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const c = t.landing.pricing.costs;

const ROWS = [
  { graphic: "type", label: c.generation, cost: CREDIT_COSTS.generation },
  { graphic: "chat", label: c.edit, cost: CREDIT_COSTS.edit },
  { graphic: "mp4", label: c.exportShort, cost: CREDIT_COSTS.export.short },
  { graphic: "4k", label: c.exportLong, cost: CREDIT_COSTS.export.long },
];

function CostGraphic({ kind }: { kind: string }) {
  return (
    <span aria-hidden="true" className="relative flex h-7 w-8 shrink-0 items-center justify-center text-fg">
      {kind === "type" ? (
        <span className="font-heading text-lg font-extralight tracking-tight">Aa<span className="text-accent-text">.</span></span>
      ) : kind === "chat" ? (
        <span className="relative flex h-5 w-7 -rotate-6 flex-col justify-center gap-1 border border-fg/40 px-1 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:rotate-0">
          <span className="h-px w-4 bg-fg/60" /><span className="h-px w-2 bg-fg/30" />
          <span className="absolute -right-px -bottom-1 h-3 w-px bg-accent-text" />
        </span>
      ) : (
        <span className="relative flex h-6 w-8 -rotate-6 items-end rounded-sm border border-fg/40 px-1 pb-0.5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:rotate-0">
          <span className="absolute top-1 left-1 h-px w-2 bg-accent-text" />
          <span className="font-mono text-[9px] leading-none">{kind === "4k" ? "4K" : "MP4"}</span>
        </span>
      )}
    </span>
  );
}

export function CreditCosts({ className }: { className?: string }) {
  return (
    <ul className={cn("divide-y divide-line rounded-2xl border border-line bg-bg-subtle", className)}>
      {ROWS.map(({ graphic, label, cost }) => (
        <li key={label} className="group flex items-center gap-3 px-5 py-3.5">
          <CostGraphic kind={graphic} />
          <span className="flex-1 text-[15px] text-muted">{label}</span>
          <span className="font-mono text-sm font-semibold">
            {cost} <span className="font-sans font-normal text-subtle">{cost > 1 ? t.common.credits : t.common.credit}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
