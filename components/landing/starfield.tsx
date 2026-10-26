"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; r: number; a: number; vx: number; vy: number; tw: number; ph: number };

// Une étoile pour ~2600 px² d'écran : dense comme un ciel, sans surcharger le canvas.
const AREA_PER_STAR = 2600;

/** Champ d'étoiles qui dérivent lentement et scintillent. Couleur = --fg (s'adapte au thème). */
export function Starfield({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Dérive lente et ambiante : on anime même en « mouvement réduit » (Windows l'active dès que les effets d'animation sont coupés).
    const reduced = false;
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let rgb = "250,250,250";
    let raf = 0;
    let visible = true;
    let last = performance.now();

    const readColor = () => {
      const fg = getComputedStyle(canvas).getPropertyValue("--fg").trim();
      const m = fg.match(/^#?([0-9a-f]{6})$/i);
      if (m) {
        const n = parseInt(m[1], 16);
        rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
      }
    };

    const makeStar = (): Star => {
      const depth = Math.random(); // les étoiles « proches » sont plus grosses, plus vives et plus rapides
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.35 + depth * 1.05,
        a: 0.25 + depth * 0.65,
        vx: (Math.random() - 0.5) * 6,
        vy: -(5 + depth * 18),
        tw: 0.6 + Math.random() * 1.8,
        ph: Math.random() * Math.PI * 2,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round((w * h) / AREA_PER_STAR);
      while (stars.length < target) stars.push(makeStar());
      stars.length = target;
      for (const s of stars) {
        if (s.x > w) s.x = Math.random() * w;
        if (s.y > h) s.y = Math.random() * h;
      }
    };

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        if (!reduced) {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w; }
          if (s.x < -2) s.x = w + 2;
          else if (s.x > w + 2) s.x = -2;
        }
        const twinkle = reduced ? 1 : 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
        ctx.fillStyle = `rgba(${rgb},${(s.a * twinkle).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      draw(now);
      raf = visible && !reduced ? requestAnimationFrame(loop) : 0;
    };

    readColor();
    resize();
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => { resize(); if (!raf) draw(performance.now()); });
    ro.observe(canvas);

    // Le thème change via data-theme sur <html>.
    const mo = new MutationObserver(() => { readColor(); if (!raf) draw(performance.now()); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Pause hors écran pour ne pas consommer de CPU.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf && !reduced) { last = performance.now(); raf = requestAnimationFrame(loop); }
    });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
