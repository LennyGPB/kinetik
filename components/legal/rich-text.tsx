import Link from "@/lib/i18n/navigation";

// `[libellé](href)` ou adresse email
const TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|([\w.+-]+@[\w-]+\.[\w.-]+\w)/g;
const LINK = "font-medium text-accent-text underline-offset-4 hover:underline";

/** Texte avec liens internes (`[conditions](/terms)`), externes et emails cliquables. */
export function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const [whole, label, href, email] = match;
    if (match.index > last) parts.push(text.slice(last, match.index));
    const key = match.index;
    if (email) parts.push(<a key={key} href={`mailto:${email}`} className={LINK}>{email}</a>);
    else if (href.startsWith("/")) parts.push(<Link key={key} href={href} className={LINK}>{label}</Link>);
    else parts.push(<a key={key} href={href} target="_blank" rel="noreferrer" className={LINK}>{label}</a>);
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
