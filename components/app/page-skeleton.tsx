import { useDictionary } from "@/lib/i18n/use-dictionary";

export function PageSkeleton({ withHeader = true }: { withHeader?: boolean }) {
  const t = useDictionary();

  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-busy="true" aria-label={t.a11y.loading}>
      {withHeader && (
        <>
          <div className="h-9 w-56 rounded-xl bg-surface-2" />
          <div className="mt-3 mb-10 h-5 w-80 max-w-full rounded-lg bg-surface-2" />
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] rounded-3xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
