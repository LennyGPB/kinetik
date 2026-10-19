import { STORE_COLLECTION } from "../../config/store-collection";

export const isStoreCollection = (background: string) => STORE_COLLECTION.some(item => item.background === background);

/** All geometry is proportional to the target, including the wide feature graphic. */
export function collectionBackground({ W, H, bg, fg, accent, uid, defs }: {
  W: number; H: number; bg: string; fg: string; accent: string; uid: string; defs: string[];
}, kind: string, index: number, banner: boolean) {
  const base = `<rect width="${W}" height="${H}" fill="${bg}"/>`;
  const body = (() => {
    switch (kind) {
      case "vault": {
        const x = banner ? W * .63 : W * .1, y = banner ? H * .12 : H * .34, w = banner ? W * .32 : W * .8;
        return `<path d="M${x} ${H}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${H}Z" fill="${accent}"/><path d="M${x - W * .025} ${H}V${y + w / 2}a${w / 2 + W * .025} ${w / 2 + W * .025} 0 0 1 ${w + W * .05} 0V${H}" fill="none" stroke="${accent}" stroke-opacity=".45" stroke-width="${W * .002}"/>`;
      }
      case "signal":
        return `<path d="M${W * (banner ? .69 : 1.2)} ${H * .27}L${W} ${H * .27}V${H}H0V${H * .87}Z" fill="${accent}"/><path d="M0 ${H * .94}L${W} ${H * .36}" stroke="${fg}" stroke-width="${W * .018}"/><path d="M${W * .08} ${H * .035}h${W * .21}" stroke="${accent}" stroke-width="${W * .014}"/>`;
      case "exhibit":
        return `<rect x="${W * (banner ? .65 : .055)}" y="${H * (banner ? .05 : .33)}" width="${W * (banner ? .31 : .89)}" height="${H * (banner ? .9 : .62)}" fill="${accent}" opacity=".14"/><rect x="${W * (banner ? .68 : .09)}" y="${H * (banner ? .085 : .35)}" width="${W * (banner ? .25 : .82)}" height="${H * (banner ? .83 : .58)}" fill="${bg}" stroke="${fg}" stroke-opacity=".24" stroke-width="${W * .0015}"/>`;
      case "satellite":
        return [0, 1, 2].map(i => `<ellipse cx="${W * (banner ? .8 : .5)}" cy="${H * .66}" rx="${W * (.35 + i * .13)}" ry="${H * (.12 + i * .04)}" transform="rotate(${-28 + i * 25} ${W * (banner ? .8 : .5)} ${H * .66})" fill="none" stroke="${accent}" stroke-opacity="${.6 - i * .16}" stroke-width="${W * .002}"/>`).join("") + `<circle cx="${W * .86}" cy="${H * .48}" r="${W * .025}" fill="${accent}"/>`;
      case "ledger":
        return `<path d="M${W * .045} 0V${H} M${W * .055} 0V${H}" stroke="${accent}" stroke-opacity=".55" stroke-width="${W * .0015}"/>` + Array.from({ length: 10 }, (_, i) => `<path d="M${W * .075} ${H * (.38 + i * .065)}H${W * .95}" stroke="${fg}" stroke-opacity=".1" stroke-width="${W * .001}"/>`).join("") + `<rect x="${W * .88}" width="${W * .04}" height="${H * .035}" fill="${accent}"/>`;
      case "dune": {
        // The shared world coordinate makes each edge meet the neighbouring page.
        const band = (baseline: number, amplitude: number) => {
          const points = Array.from({ length: 41 }, (_, i) => { const x = W * i / 40; return `${x},${H * (baseline + amplitude * Math.sin((index + i / 40) * Math.PI * .9))}`; });
          return `M0 ${H}L${points.join("L")}L${W} ${H}Z`;
        };
        return `<path d="${band(.63, .09)}" fill="${accent}" opacity=".32"/><path d="${band(.79, .065)}" fill="${accent}"/><path d="${band(.94, .035)}" fill="${fg}" opacity=".16"/>`;
      }
      case "conduit":
        return [0, 1, 2, 3].map(i => { const left = i % 2 === 0, x = W * (left ? .045 + i * .025 : .955 - i * .025), y = H * (.38 + i * .15), end = W * (left ? .25 : .75);
          return `<path d="M${x} ${H}V${y + W * .07}Q${x} ${y} ${x + (left ? 1 : -1) * W * .07} ${y}H${end}" fill="none" stroke="${accent}" stroke-width="${W * .003}" stroke-opacity="${.3 + i * .15}"/><circle cx="${end}" cy="${y}" r="${W * .01}" fill="${bg}" stroke="${accent}" stroke-width="${W * .003}"/>`;
        }).join("");
      case "atelier":
        return `<rect x="${W * (banner ? .63 : .08)}" y="${H * .36}" width="${W * (banner ? .34 : .85)}" height="${H * .61}" fill="${accent}" opacity=".24" transform="rotate(-5 ${W / 2} ${H * .65})"/><rect x="${W * (banner ? .66 : .13)}" y="${H * .35}" width="${W * (banner ? .3 : .76)}" height="${H * .58}" fill="${fg}" opacity=".075" transform="rotate(6 ${W / 2} ${H * .65})"/><rect x="${W * .38}" y="${H * .33}" width="${W * .24}" height="${W * .07}" fill="${accent}" opacity=".6" transform="rotate(-8 ${W / 2} ${H * .35})"/>`;
      case "facet":
        return `<path d="M0 ${H * .46}L${W * .68} ${H * .33}L${W} ${H * .86}L${W * .15} ${H}Z" fill="${accent}" opacity=".16"/><path d="M${W * .68} ${H * .33}L${W} ${H * .86}L${W * .8} ${H}L${W * .15} ${H}Z" fill="${accent}" opacity=".3"/><path d="M0 ${H * .46}L${W * .68} ${H * .33}L${W * .15} ${H}" fill="none" stroke="${fg}" stroke-opacity=".13" stroke-width="${W * .002}"/>`;
      case "solstice": {
        defs.push(`<clipPath id="${uid}-sun"><rect width="${W}" height="${H * .77}"/></clipPath>`);
        return `<circle cx="${W * (banner ? .8 : .5)}" cy="${H * .7}" r="${W * (banner ? .22 : .43)}" fill="${accent}" clip-path="url(#${uid}-sun)"/><rect y="${H * .77}" width="${W}" height="${H * .23}" fill="${fg}" opacity=".045"/><path d="M0 ${H * .77}H${W}" stroke="${accent}" stroke-width="${W * .002}"/>`;
      }
      default: return "";
    }
  })();
  return base + body;
}
