import type { CSSProperties, ReactNode } from "react";
import type { ScreenFrame } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { bodyFont, displayFont, luminance } from "./theme";

/**
 * Cadres d'appareil (téléphone, fenêtre de navigateur) et écrans factices.
 * Utilisés par toutes les mises en scène des screens (screens.tsx) et par la mise en avant (focus.tsx).
 */

// ───────────── Cadres d'appareil ─────────────

/** Cadre adapté au format d'un screen (largeur / hauteur) : capture d'ordinateur → navigateur, capture mobile → téléphone ; carré ou inconnu → null. */
export function frameForRatio(ratio: number | null | undefined): ScreenFrame | null {
  if (!ratio) return null;
  if (ratio >= 1.1) return "browser";
  if (ratio <= 0.9) return "phone";
  return null;
}

/**
 * Cadre des screens d'une scène, d'après leur format réel : tous paysage → navigateur, tous portrait → téléphone.
 * Formats mélangés, inconnus ou pas de screen → réglage de la vidéo (graph.screenFrame).
 */
export function screensDevice(props: VideoProps, srcs: (string | null)[]): ScreenFrame {
  const configured = props.graph.screenFrame ?? "none";
  const frames = new Set(srcs.map((src) => (src ? frameForRatio(props.screenRatios?.[props.screenUrls.indexOf(src)]) : null)));
  if (frames.size !== 1) return configured;
  const [frame] = frames;
  return frame ?? configured;
}

export function PhoneFrame({ width, children }: { width: number; children: ReactNode }) {
  const bezel = phoneBezel(width);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: width * 0.16,
        padding: bezel,
        background: "linear-gradient(145deg, #2a2a33, #0b0b10 45%, #1c1c24)",
        boxShadow: `0 0 0 ${Math.max(1, width * 0.006)}px rgb(255 255 255 / 0.18) inset, 0 ${width * 0.12}px ${width * 0.3}px -${width * 0.06}px rgb(0 0 0 / 0.6)`,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: width * 0.125, overflow: "hidden", background: "#000" }}>
        {children}
        <div style={{ position: "absolute", top: width * 0.025, left: "50%", width: width * 0.24, height: width * 0.065, marginLeft: -width * 0.12, borderRadius: 999, background: "#000" }} />
      </div>
      <div style={{ position: "absolute", left: -width * 0.012, top: "22%", width: width * 0.012, height: "8%", borderRadius: 4, background: "#1c1c24" }} />
      <div style={{ position: "absolute", right: -width * 0.012, top: "28%", width: width * 0.012, height: "13%", borderRadius: 4, background: "#1c1c24" }} />
    </div>
  );
}

export function BrowserFrame({ width, host, children }: { width: number; host: string | null; children: ReactNode }) {
  const bar = browserBarHeight(width);
  const label = host?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "";
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", borderRadius: width * 0.02, overflow: "hidden", background: "#0f0f15", border: "1px solid rgb(255 255 255 / 0.14)", boxShadow: `0 ${width * 0.04}px ${width * 0.1}px -${width * 0.02}px rgb(0 0 0 / 0.55)` }}>
      <div style={{ height: bar, flexShrink: 0, display: "flex", alignItems: "center", gap: bar * 0.3, padding: `0 ${bar * 0.5}px`, background: "#1b1b24" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: bar * 0.3, height: bar * 0.3, borderRadius: "50%", background: c }} />
        ))}
        <div style={{ flex: 1, height: bar * 0.56, marginLeft: bar * 0.4, borderRadius: 999, background: "rgb(255 255 255 / 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: bodyFont, fontSize: bar * 0.32, color: "rgb(255 255 255 / 0.6)" }}>
          {label}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, background: "#000" }}>{children}</div>
    </div>
  );
}

// ───────────── Écrans factices ─────────────

/**
 * Interface d'app crédible quand aucun screen n'est fourni : fond clair, blocs aux couleurs du style.
 * Trois variantes (liste, tableau de bord, carte) pour éviter trois écrans identiques.
 */
export function MockScreen({ palette, variant, width }: { palette: VideoProps["palette"]; variant: number; width: number }) {
  const [, main, rawAccent] = palette;
  // Un accent trop clair disparaît sur le fond blanc de l'interface : on retombe sur la couleur principale.
  const accent = luminance(rawAccent) > 0.8 ? main : rawAccent;
  const s = width / 100; // 1 % de la largeur de l'écran
  const line = (w: string, h = 2.2, c = "#e4e4ea") => <div style={{ width: w, height: h * s, borderRadius: 999, background: c }} />;
  const card: CSSProperties = { borderRadius: 4 * s, background: "#fff", boxShadow: `0 ${s}px ${4 * s}px rgb(17 17 26 / 0.08)`, padding: 4 * s };

  const header = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 * s }}>
      <div style={{ fontFamily: displayFont, fontWeight: 800, fontSize: 7 * s, color: "#111118" }}>{["Accueil", "Stats", "Profil"][variant % 3]}</div>
      <div style={{ width: 9 * s, height: 9 * s, borderRadius: "50%", background: `linear-gradient(135deg, ${main}, ${accent})` }} />
    </div>
  );

  let body: ReactNode;
  if (variant % 3 === 0) {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 * s }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ ...card, display: "flex", alignItems: "center", gap: 3 * s }}>
            <div style={{ width: 10 * s, height: 10 * s, borderRadius: 3 * s, background: i % 2 ? accent : main, opacity: 0.9 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.6 * s }}>
              {line(`${70 - i * 6}%`, 2.4, "#2a2a35")}
              {line(`${45 + i * 5}%`)}
            </div>
          </div>
        ))}
      </div>
    );
  } else if (variant % 3 === 1) {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 * s }}>
        <div style={{ display: "flex", gap: 3 * s }}>
          {[main, accent].map((c, i) => (
            <div key={i} style={{ ...card, flex: 1 }}>
              {line("50%")}
              <div style={{ marginTop: 2 * s, fontFamily: displayFont, fontWeight: 800, fontSize: 8 * s, color: c }}>{i ? "+24%" : "1,2k"}</div>
            </div>
          ))}
        </div>
        <div style={{ ...card, height: 55 * s, display: "flex", alignItems: "flex-end", gap: 2 * s }}>
          {[40, 65, 50, 85, 60, 95, 75].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: `${1.5 * s}px ${1.5 * s}px 0 0`, background: i === 5 ? accent : main, opacity: i === 5 ? 1 : 0.75 }} />
          ))}
        </div>
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 2 * s }}>
          {line("80%", 2.4, "#2a2a35")}
          {line("60%")}
        </div>
      </div>
    );
  } else {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 * s }}>
        <div style={{ height: 60 * s, borderRadius: 5 * s, background: `linear-gradient(140deg, ${main}, ${accent})` }} />
        {line("75%", 3, "#2a2a35")}
        {line("90%")}
        {line("60%")}
        <div style={{ marginTop: 3 * s, height: 12 * s, borderRadius: 999, background: main, display: "grid", placeItems: "center" }}>
          {line("35%", 2.2, "rgb(255 255 255 / 0.85)")}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: "#f4f4f8", padding: `${12 * s}px ${6 * s}px ${6 * s}px`, display: "flex", flexDirection: "column" }}>
      {header}
      {body}
    </div>
  );
}

/** Hauteur de la barre d'adresse d'une fenêtre de navigateur de cette largeur. */
export function browserBarHeight(width: number) {
  return Math.max(18, width * 0.055);
}

/** Épaisseur du bord d'un téléphone de cette largeur (l'écran est en retrait d'autant de chaque côté). */
export function phoneBezel(width: number) {
  return width * 0.035;
}
