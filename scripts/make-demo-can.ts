/**
 * Canettes de démonstration (marques fictives) pour les aperçus des templates canette :
 *   OHM (Flux 3D, corps noir) et NORDA (Glacier 3D, corps blanc nacré).
 *   node --import tsx scripts/make-demo-can.ts → public/product-demos/{ohm,norda}-can.png
 * Dessin vectoriel déterministe (aucune image générée ni marque réelle), col et fond en aluminium.
 */
import sharp from "sharp";

const W = 600, H = 1536;
const bodyTop = 150, bodyBottom = 1420, left = 40, right = W - 40;

// Ombrage cylindrique : reflets verticaux d'un métal sombre
const shade = `
  <linearGradient id="body" x1="0" x2="1">
    <stop offset="0" stop-color="#020202"/><stop offset=".06" stop-color="#2a2a2c"/><stop offset=".13" stop-color="#0c0c0d"/>
    <stop offset=".38" stop-color="#050506"/><stop offset=".6" stop-color="#1b1b1d"/><stop offset=".71" stop-color="#5d5d61"/>
    <stop offset=".76" stop-color="#202022"/><stop offset=".9" stop-color="#080809"/><stop offset="1" stop-color="#000"/>
  </linearGradient>
  <linearGradient id="alu" x1="0" x2="1">
    <stop offset="0" stop-color="#3b3c40"/><stop offset=".12" stop-color="#c9cbd0"/><stop offset=".3" stop-color="#6d6f74"/>
    <stop offset=".55" stop-color="#e9eaee"/><stop offset=".72" stop-color="#8b8d92"/><stop offset=".88" stop-color="#d4d6da"/><stop offset="1" stop-color="#36373a"/>
  </linearGradient>
  <linearGradient id="wrap" x1="0" x2="1">
    <stop offset="0" stop-color="#000" stop-opacity=".92"/><stop offset=".16" stop-color="#000" stop-opacity=".35"/>
    <stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity=".1"/>
    <stop offset=".84" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".95"/>
  </linearGradient>
  <linearGradient id="gloss" x1="0" x2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="can"><rect x="${left}" y="${bodyTop}" width="${right - left}" height="${bodyBottom - bodyTop}" rx="14"/></clipPath>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${shade}</defs>
  <!-- Col : épaule rétrécie et bord roulé -->
  <path d="M${left} ${bodyTop + 10} C ${left} 110, 95 92, 104 62 L ${W - 104} 62 C ${W - 95} 92, ${right} 110, ${right} ${bodyTop + 10} Z" fill="url(#alu)"/>
  <rect x="96" y="40" width="${W - 192}" height="28" rx="12" fill="url(#alu)"/>
  <rect x="96" y="40" width="${W - 192}" height="6" rx="3" fill="#ffffff" opacity=".5"/>
  <!-- Fond : bord biseauté -->
  <path d="M${left} ${bodyBottom - 10} C ${left} 1460, 90 1482, 110 1500 L ${W - 110} 1500 C ${W - 90} 1482, ${right} 1460, ${right} ${bodyBottom - 10} Z" fill="url(#alu)"/>
  <rect x="110" y="1494" width="${W - 220}" height="12" rx="6" fill="#55575c"/>
  <g clip-path="url(#can)">
    <rect x="${left}" y="${bodyTop}" width="${right - left}" height="${bodyBottom - bodyTop}" fill="url(#body)"/>
    <!-- Étiquette : marque oblique façon tag, croix et mentions -->
    <g transform="translate(${W / 2 - 10} 640) rotate(-14)" font-family="Impact, 'Arial Black', sans-serif" text-anchor="middle" fill="#ECECEC">
      <text x="0" y="0" font-size="250" font-style="italic" letter-spacing="-6" stroke="#ECECEC" stroke-width="6" stroke-linejoin="round">OHM</text>
      <path d="M-210 52 C -80 20, 90 30, 230 4" stroke="#ECECEC" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M-150 90 C -40 70, 70 76, 170 60" stroke="#ECECEC" stroke-width="7" fill="none" stroke-linecap="round"/>
    </g>
    <g stroke="#ECECEC" stroke-width="9" stroke-linecap="round">
      <path d="M440 400 l26 26 M466 400 l-26 26"/><path d="M118 790 l26 26 M144 790 l-26 26"/>
    </g>
    <text x="${W / 2}" y="1010" font-family="'Arial Black', Arial, sans-serif" font-weight="900" font-size="46" letter-spacing="2" text-anchor="middle" fill="#F2F2F2">ENERGY DRINK</text>
    <text x="${W / 2}" y="1075" font-family="'Courier New', monospace" font-weight="700" font-size="40" text-anchor="middle" fill="#D8D8D8">330ml</text>
    <!-- Le décor s'enroule sur le cylindre -->
    <rect x="${left}" y="${bodyTop}" width="${right - left}" height="${bodyBottom - bodyTop}" fill="url(#wrap)"/>
    <rect x="${left + 340}" y="${bodyTop}" width="46" height="${bodyBottom - bodyTop}" fill="url(#gloss)" opacity=".55"/>
    <rect x="${left + 52}" y="${bodyTop}" width="18" height="${bodyBottom - bodyTop}" fill="url(#gloss)" opacity=".35"/>
  </g>
  <rect x="${left}" y="${bodyTop}" width="${right - left}" height="5" fill="#9a9ca1" opacity=".6"/>
  <rect x="${left}" y="${bodyBottom - 5}" width="${right - left}" height="5" fill="#9a9ca1" opacity=".6"/>
</svg>`;


// NORDA : même canette, corps blanc nacré, typographie verticale bleu glacier
const norda = svg
  .replace(/<linearGradient id="body"[\s\S]*?<\/linearGradient>/, `<linearGradient id="body" x1="0" x2="1">
    <stop offset="0" stop-color="#9aa6b2"/><stop offset=".08" stop-color="#e9eef3"/><stop offset=".2" stop-color="#cfd8e0"/>
    <stop offset=".45" stop-color="#f7f9fb"/><stop offset=".66" stop-color="#ffffff"/><stop offset=".74" stop-color="#dfe6ec"/>
    <stop offset=".9" stop-color="#c3ccd5"/><stop offset="1" stop-color="#7d8894"/>
  </linearGradient>`)
  // Bords moins sombres qu'une canette noire : le blanc garde son volume sans virer au gris
  .replace(/<linearGradient id="wrap"[\s\S]*?<\/linearGradient>/, `<linearGradient id="wrap" x1="0" x2="1">
    <stop offset="0" stop-color="#1b2a38" stop-opacity=".55"/><stop offset=".14" stop-color="#1b2a38" stop-opacity=".12"/>
    <stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset=".86" stop-color="#1b2a38" stop-opacity=".12"/><stop offset="1" stop-color="#1b2a38" stop-opacity=".6"/>
  </linearGradient>`)
  .replace(/<!-- Étiquette[\s\S]*?<!-- Le décor/, `<!-- Étiquette : nom vertical, vagues de givre et mentions -->
    <rect x="${left}" y="1180" width="${right - left}" height="240" fill="#0E5C8C"/>
    <path d="M${left} 1180 C 160 1140, 260 1215, 360 1170 S 520 1150, ${right} 1175 L ${right} 1180 L ${left} 1180 Z" fill="#0E5C8C"/>
    <text transform="translate(392 1120) rotate(-90)" font-family="Impact, 'Arial Black', sans-serif" font-size="300" letter-spacing="10" fill="#0E5C8C">NORDA</text>
    <g fill="none" stroke="#3FA9D9" stroke-width="7" stroke-linecap="round">
      <path d="M120 260 l0 120 M68 290 l104 60 M68 350 l104 -60"/>
    </g>
    <text x="146" y="520" font-family="'Arial Black', Arial, sans-serif" font-size="30" letter-spacing="3" fill="#0E5C8C" transform="rotate(-90 146 520)" text-anchor="end">SPARKLING CITRUS</text>
    <text x="${W / 2}" y="1300" font-family="'Arial Black', Arial, sans-serif" font-size="42" letter-spacing="4" text-anchor="middle" fill="#FFFFFF">ICE COLD</text>
    <text x="${W / 2}" y="1360" font-family="'Courier New', monospace" font-weight="700" font-size="38" text-anchor="middle" fill="#CFE9F7">330ml</text>
    <!-- Le décor`);

Promise.all([
  sharp(Buffer.from(svg)).png().toFile("public/product-demos/ohm-can.png"),
  sharp(Buffer.from(norda)).png().toFile("public/product-demos/norda-can.png"),
]).then(() => console.log("public/product-demos/{ohm,norda}-can.png"));
