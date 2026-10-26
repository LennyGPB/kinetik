/**
 * Flacon de parfum de démonstration (marque fictive ÉLAN) pour les aperçus du template Brume 3D.
 *   node --import tsx scripts/make-demo-perfume.ts → public/product-demos/elan-perfume.png
 * Dessin vectoriel déterministe (aucune image générée ni marque réelle) : verre épais semi-transparent, col chromé,
 * bouchon noir texturé et étiquette crème.
 */
import sharp from "sharp";

const W = 760, H = 1240;
const glass = { x: 70, y: 470, w: 620, h: 730, r: 34 };
const label = { x: 200, y: 620, w: 360, h: 360 };

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="glass" x1="0" x2="1">
      <stop offset="0" stop-color="#7d8287" stop-opacity=".95"/><stop offset=".06" stop-color="#e9edf0" stop-opacity=".9"/>
      <stop offset=".14" stop-color="#b9bec3" stop-opacity=".55"/><stop offset=".5" stop-color="#d7dbde" stop-opacity=".42"/>
      <stop offset=".86" stop-color="#b3b8bd" stop-opacity=".55"/><stop offset=".94" stop-color="#f4f6f7" stop-opacity=".92"/>
      <stop offset="1" stop-color="#6f7479" stop-opacity=".95"/>
    </linearGradient>
    <linearGradient id="juice" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#e8e4dc" stop-opacity=".35"/><stop offset="1" stop-color="#cfc8bb" stop-opacity=".5"/>
    </linearGradient>
    <linearGradient id="base" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".2"/><stop offset=".35" stop-color="#8e959b" stop-opacity=".85"/>
      <stop offset=".7" stop-color="#f2f4f6" stop-opacity=".95"/><stop offset="1" stop-color="#6c7176" stop-opacity=".95"/>
    </linearGradient>
    <linearGradient id="chrome" x1="0" x2="1">
      <stop offset="0" stop-color="#3a3c3f"/><stop offset=".18" stop-color="#f1f2f4"/><stop offset=".36" stop-color="#7b7e82"/>
      <stop offset=".55" stop-color="#ffffff"/><stop offset=".75" stop-color="#5d6064"/><stop offset=".9" stop-color="#d9dbde"/><stop offset="1" stop-color="#2d2f31"/>
    </linearGradient>
    <linearGradient id="cap" x1="0" x2="1">
      <stop offset="0" stop-color="#050505"/><stop offset=".3" stop-color="#1d1d1e"/><stop offset=".62" stop-color="#2c2c2e"/><stop offset="1" stop-color="#060606"/>
    </linearGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7"/>
      <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .5 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="paper" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="3"/>
      <feColorMatrix values="0 0 0 0 .6  0 0 0 0 .58  0 0 0 0 .55  0 0 0 .12 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
  </defs>
  <!-- Bouchon noir texturé -->
  <rect x="215" y="20" width="330" height="330" rx="6" fill="url(#cap)"/>
  <rect x="215" y="20" width="330" height="330" rx="6" fill="#000" filter="url(#grain)"/>
  <rect x="215" y="20" width="330" height="6" fill="#4a4a4c"/>
  <!-- Col chromé -->
  <rect x="300" y="350" width="160" height="70" fill="url(#chrome)"/>
  <rect x="285" y="415" width="190" height="60" rx="8" fill="url(#chrome)"/>
  <!-- Verre épais : liquide, parois, fond biseauté -->
  <rect x="${glass.x}" y="${glass.y}" width="${glass.w}" height="${glass.h}" rx="${glass.r}" fill="url(#glass)"/>
  <rect x="${glass.x + 40}" y="${glass.y + 40}" width="${glass.w - 80}" height="${glass.h - 200}" rx="14" fill="url(#juice)"/>
  <rect x="${glass.x + 8}" y="${glass.y + glass.h - 150}" width="${glass.w - 16}" height="142" rx="24" fill="url(#base)"/>
  <rect x="${glass.x + 22}" y="${glass.y + 14}" width="14" height="${glass.h - 60}" rx="7" fill="#ffffff" opacity=".75"/>
  <rect x="${glass.x + glass.w - 52}" y="${glass.y + 30}" width="8" height="${glass.h - 90}" rx="4" fill="#ffffff" opacity=".55"/>
  <!-- Tube plongeur -->
  <rect x="377" y="${glass.y}" width="6" height="${glass.h - 160}" fill="#ffffff" opacity=".35"/>
  <!-- Étiquette crème -->
  <rect x="${label.x}" y="${label.y}" width="${label.w}" height="${label.h}" fill="#F4F1EA"/>
  <rect x="${label.x}" y="${label.y}" width="${label.w}" height="${label.h}" fill="#000" filter="url(#paper)"/>
  <g font-family="Georgia, 'Times New Roman', serif" text-anchor="middle" fill="#1A1A1A">
    <text x="${W / 2}" y="${label.y + 90}" font-size="38" letter-spacing="14">ÉLAN</text>
    <text x="${W / 2}" y="${label.y + 205}" font-size="34" letter-spacing="3" font-family="Arial, sans-serif" font-weight="700">IRIS</text>
    <text x="${W / 2}" y="${label.y + 247}" font-size="34" letter-spacing="3" font-family="Arial, sans-serif" font-weight="700">BLANC</text>
    <text x="${W / 2}" y="${label.y + 300}" font-size="16" letter-spacing="5" font-family="Arial, sans-serif">EAU DE PARFUM</text>
  </g>
</svg>`;

sharp(Buffer.from(svg)).png().toFile("public/product-demos/elan-perfume.png").then(() => console.log("public/product-demos/elan-perfume.png"));
