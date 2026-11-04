"use client";

import { useMemo, type PointerEvent } from "react";
import { Player } from "@remotion/player";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { landingCopy } from "@/lib/resto/landing-copy";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { durationInFrames, FPS, videoDimensions } from "@/remotion/props";
import { restoVideoProps } from "./resto-form";
import { restoExample, restoExamplePhotos } from "./resto-examples";

/** Contenus montrés dans les téléphones : le plat du jour Street (photo d'exemple), puis les horaires. */
const DEMOS = [{ template: "plat-du-jour", style: "street" }, { template: "horaires", style: "bistrot" }] as const;

/** Pose de chaque téléphone : le premier devant, tourné vers la droite ; le second derrière, tourné vers la gauche. */
const POSES = [
  { className: "relative z-10 w-[60%]", rotateY: 16, rotateX: 6, rotateZ: -3, z: 60 },
  { className: "-ml-[14%] w-[52%] -translate-y-10", rotateY: -22, rotateX: 8, rotateZ: 4, z: -40 },
];

/**
 * Deux téléphones en perspective qui jouent des contenus Resto en boucle (sans son, sans commandes).
 * L'ensemble s'oriente doucement vers le pointeur (effet 3D), et revient au repos quand il sort.
 */
export function LandingDemo() {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const d = landingCopy(locale).demo;
  const props = useMemo(() => DEMOS.map(({ template, style }) => restoVideoProps({ ...restoExample(template, locale, style), language: locale }, restoExamplePhotos(template), null)), [locale]);
  const px = useMotionValue(0), py = useMotionValue(0);
  const spring = { stiffness: 120, damping: 18, mass: 0.6 };
  const tiltY = useSpring(useTransform(px, [-0.5, 0.5], [-10, 10]), spring);
  const tiltX = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), spring);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const box = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - box.left) / box.width - 0.5);
    py.set((e.clientY - box.top) / box.height - 0.5);
  };
  const leave = () => { px.set(0); py.set(0); };

  return (
    <div className="mx-auto w-full max-w-xl [perspective:1600px]" onPointerMove={move} onPointerLeave={leave}>
      <motion.div className="relative flex items-center justify-center [transform-style:preserve-3d]" style={{ rotateX: tiltX, rotateY: tiltY }}>
        {props.map((p, i) => {
          const { width, height } = videoDimensions(p);
          const pose = POSES[i];
          return (
            <motion.div key={i} className={pose.className} style={{ transformStyle: "preserve-3d" }}
              initial={{ rotateY: pose.rotateY, rotateX: pose.rotateX, rotateZ: pose.rotateZ, z: pose.z, y: 0 }}
              animate={{ y: [0, i ? 10 : -10, 0] }} transition={{ y: { duration: 6 + i, repeat: Infinity, ease: "easeInOut" } }}>
              <div className="relative overflow-hidden rounded-[2.2rem] border-[7px] border-neutral-900 bg-black shadow-[0_50px_100px_-30px_rgb(124_58_237/0.75),0_30px_60px_-30px_rgb(0_0_0/0.8)] dark:border-neutral-800" style={{ aspectRatio: `${width} / ${height}` }} aria-label={i === 0 ? d.dish : d.hours}>
                <Player component={KinetikVideo} inputProps={p} durationInFrames={durationInFrames(p.graph)} fps={FPS} compositionWidth={width} compositionHeight={height}
                  autoPlay loop initiallyMuted acknowledgeRemotionLicense style={{ width: "100%", height: "100%" }} />
                {/* Reflet de vitre */}
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgb(255_255_255/0.16)_0%,transparent_32%,transparent_70%,rgb(255_255_255/0.06)_100%)]" />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
