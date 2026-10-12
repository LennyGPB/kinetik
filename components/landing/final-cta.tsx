import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function FinalCta() {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28">
      <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 sm:rounded-[2.5rem]">
        <VideoPlaceholder ratio="fill" scene="blobs" palette={["#12062b", "#7c3aed", "#d946ef"]} label="" className="absolute inset-0" />
        <div className="relative flex flex-col items-center px-6 py-20 text-center text-white sm:py-28">
          <h2 className="max-w-3xl text-[clamp(2rem,6vw,4.25rem)] leading-[1] font-extrabold">{t.landing.finalCta.title}</h2>
          <p className="mt-5 max-w-xl text-white/75 sm:text-lg">{t.landing.finalCta.subtitle}</p>
          <Link
            href="/register"
            className={buttonVariants({ variant: "secondary", size: "lg", className: "mt-9 bg-white text-black shadow-[0_20px_50px_-12px_rgb(0_0_0/0.5)]" })}
          >
            {t.landing.finalCta.cta}
            <ArrowRight />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
