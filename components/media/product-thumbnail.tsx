import Image from "next/image";
import { getProductTemplate, isProduct3D } from "@/config/physical-product";

export function ProductThumbnail({ templateId }: { templateId: string }) {
  const template = getProductTemplate(templateId)!;
  const [background, foreground, accent] = template.palette;
  if (isProduct3D(templateId)) return <div className="absolute inset-0 overflow-hidden" style={{ background, color: foreground }}><Image src={`/templates/${template.id}-portrait.jpg`} alt="" fill sizes="(max-width: 640px) 220px, 300px" className="object-cover" /><span className="absolute bottom-[5%] left-[8%] rounded-lg bg-black/80 px-3 py-2 text-sm font-semibold">{template.name} · Demo</span></div>;
  return <div className="absolute inset-0 overflow-hidden" style={{ background, color: foreground }}>
    {template.id === "product-floating" && <span className="absolute left-1/3 top-1/4 size-64 rounded-full opacity-50" style={{ background: `radial-gradient(circle at 30% 25%,${accent},transparent 75%)` }} />}
    {template.id === "product-editorial" && <span className="absolute right-0 top-0 h-full w-1/3" style={{ background: foreground }} />}
    <span className="absolute left-[8%] top-[8%] text-xs font-semibold tracking-widest">FORME</span>
    <div className="absolute inset-x-[12%] bottom-[20%] top-[16%]"><Image src="/product-demos/forme.png" alt="" fill sizes="(max-width: 640px) 220px, 300px" className="object-contain drop-shadow-xl" /></div>
    <span className="absolute bottom-[9%] left-[8%] text-xl font-semibold leading-tight">{template.name}<span className="mt-1 block text-[10px] font-normal opacity-70">FORME · DEMO</span></span>
  </div>;
}
