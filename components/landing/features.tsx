import { useDictionary } from "@/lib/i18n/use-dictionary";
import { EditorShowcase } from "./editor-showcase";
import { Section, SectionHeading } from "./section-heading";
import { FeatureGrid } from "./feature-grid";

export function Features() {
  const t = useDictionary();
  const editor = t.landing.features.items.editor;
  // Retour à la ligne après les deux-points : la liste de ce qu'on garde en main passe sur sa propre ligne
  const [lead, list] = editor.description.split(/(?<=:)\s+/);

  return (
    <>
    <Section id="features" className="scroll-mt-24">
      <SectionHeading title={t.locale === "fr" ? "Tout pour faire bouger" : "Everything to move"} accent={t.locale === "fr" ? "ta marque." : "your brand."} />
      <FeatureGrid />
    </Section>
    <Section id="editor">
      <SectionHeading title={t.landing.features.titleLine1} accent={t.landing.features.titleLine2} subtitle={list ? <>{lead}<br />{list}</> : lead} />
      <EditorShowcase label={editor.title} />
    </Section>
    </>
  );
}
