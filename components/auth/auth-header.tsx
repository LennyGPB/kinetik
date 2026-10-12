import { Reveal } from "@/components/motion/reveal";

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Reveal y={12} className="mb-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
      <p className="mt-2 text-muted">{subtitle}</p>
    </Reveal>
  );
}

/** Squelette affiché pendant la lecture des paramètres d'URL. */
export function AuthFormSkeleton({ fields }: { fields: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="h-12 rounded-full bg-surface-2" />
        <div className="h-12 rounded-full bg-surface-2" />
      </div>
      <div className="h-px bg-line" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-4 w-20 rounded bg-surface-2" />
          <div className="h-11 rounded-xl bg-surface-2" />
        </div>
      ))}
      <div className="h-12 rounded-full bg-surface-2" />
    </div>
  );
}
