"use client";

import { Plus, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { ColorInput } from "@/components/create/color-input";
import { UploadZone } from "@/components/create/upload-zone";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { useToast } from "@/components/ui/toaster";
import { BRAND_FONTS, googleFontsHref } from "@/config/fonts";
import { saveBrandKit } from "@/lib/account/actions";
import { format, t } from "@/lib/i18n";
import type { BrandKitData } from "@/lib/projects/queries";
import type { UploadedFile } from "@/lib/storage/client";

const b = t.app.brandKit;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-bg-subtle p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function FontSelect({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-line-strong bg-surface bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22><path d=%22m4 6 4 4 4-4%22/></svg>')] bg-[position:right_0.85rem_center] bg-no-repeat px-3.5 pr-10 text-[15px] outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)] sm:text-sm"
      >
        {BRAND_FONTS.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>
    </div>
  );
}

export function BrandKitForm({ initial }: { initial: BrandKitData | null }) {
  const [logo, setLogo] = useState<UploadedFile[]>(initial?.logo ? [initial.logo] : []);
  const [colors, setColors] = useState<string[]>(initial?.colors.length ? initial.colors : ["#7c3aed", "#f472b6"]);
  const [headingFont, setHeadingFont] = useState(initial?.headingFont ?? "Bricolage Grotesque");
  const [bodyFont, setBodyFont] = useState(initial?.bodyFont ?? "Inter");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const fontsHref = googleFontsHref([headingFont, bodyFont]);

  function save() {
    startTransition(async () => {
      const result = await saveBrandKit({ logo: logo[0] ?? null, colors, headingFont, bodyFont });
      toast(result.ok ? { title: t.common.saved, tone: "success" } : { title: result.error ?? t.common.error, tone: "error" });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Chargement des polices sélectionnées pour l'aperçu */}
      {fontsHref && <link rel="stylesheet" href={fontsHref} precedence="default" />}
      <div className="flex flex-col gap-4">
        <Section title={b.logo}>
          <UploadZone label={b.logo} value={logo} onChange={setLogo} hint={t.app.create.assets.logoHint} />
        </Section>

        <Section title={b.colors}>
          <div className="grid gap-3 sm:grid-cols-2">
            {colors.map((color, i) => (
              <ColorInput
                key={i}
                label={i === 0 ? t.app.create.colors.primary : format(t.app.create.colors.secondaryItem, { n: i })}
                value={color}
                onChange={(v) => setColors((list) => list.map((c, j) => (j === i ? v : c)))}
                onRemove={colors.length > 1 ? () => setColors((list) => list.filter((_, j) => j !== i)) : undefined}
              />
            ))}
            {colors.length < 6 && (
              <button
                type="button"
                onClick={() => setColors((list) => [...list, "#0ea5e9"])}
                className="flex h-[58px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-accent-text"
              >
                <Plus className="size-4" /> {t.app.create.colors.add}
              </button>
            )}
          </div>
        </Section>

        <Section title={b.fonts}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FontSelect id="headingFont" label={b.headingFont} value={headingFont} onChange={setHeadingFont} />
            <FontSelect id="bodyFont" label={b.bodyFont} value={bodyFont} onChange={setBodyFont} />
          </div>
        </Section>

        <div className="flex justify-end">
          <Button size="lg" onClick={save} loading={pending} className="w-full sm:w-auto">
            {!pending && <Save />} {t.common.save}
          </Button>
        </div>
      </div>

      <aside>
        <div className="sticky top-10 flex flex-col gap-3">
          <p className="text-sm font-medium text-muted">{b.preview}</p>
          <div className="overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-[var(--shadow-lift)]">
            <VideoPlaceholder ratio="16:9" scene="blobs" palette={["#0b0b14", colors[0], colors[1] ?? colors[0]]} label="">
              {logo[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo[0].url} alt="" className="absolute top-1/2 left-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white object-contain p-3 shadow-2xl" />
              )}
            </VideoPlaceholder>
            <div className="p-5">
              <p className="text-2xl leading-tight font-extrabold tracking-tight" style={{ fontFamily: `"${headingFont}", sans-serif` }}>
                {b.previewTitle}
              </p>
              <p className="mt-2 text-sm text-muted" style={{ fontFamily: `"${bodyFont}", sans-serif` }}>
                {b.previewBody}
              </p>
              <div className="mt-4 flex gap-1.5">
                {colors.map((c, i) => (
                  <span key={i} className="h-8 flex-1 rounded-lg" style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
