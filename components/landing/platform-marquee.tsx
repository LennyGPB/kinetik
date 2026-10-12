"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

const PLATFORMS = ["Product Hunt", "YouTube", "TikTok", "Instagram", "LinkedIn", "X", "App Store", "Google Play", "Reels", "Shorts"];

export function PlatformMarquee() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let visible = false;
    const sync = () => setRunning(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    if (sectionRef.current) observer.observe(sectionRef.current);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={sectionRef} className="platform-marquee w-full pt-10 pb-4">
      <p className="text-center text-xs font-medium tracking-[0.18em] text-subtle uppercase">{t.landing.marquee}</p>
      <div className="mask-fade-x mt-6 flex w-full overflow-hidden" aria-hidden>
        <div className="platform-marquee-track flex w-max shrink-0" style={{ animationPlayState: running ? "running" : "paused" }}>
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-12 pr-12">
              {PLATFORMS.map((name) => (
                <span key={name} className="font-display text-xl font-semibold whitespace-nowrap text-subtle/80 sm:text-2xl">
                  {name}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <ul className="sr-only">
        {PLATFORMS.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
