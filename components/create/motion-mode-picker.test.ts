import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("mode picker renders identical initial HTML before and after reduced-motion detection", () => {
  const require = createRequire(path.join(process.cwd(), "components/create/motion-mode-picker.test.ts"));
  const motionKey = require.resolve("motion/react"), navKey = require.resolve("./animated-navigation");
  const motion = require("motion/react");
  const previousMotion = require.cache[motionKey], previousNav = require.cache[navKey];
  const cssKey = require.resolve("./motion-mode-picker.css"), previousCss = require.cache[cssKey];
  require.cache[cssKey] = { id: cssKey, filename: cssKey, loaded: true, exports: {} } as NodeJS.Module;
  let reduced: boolean | null = null;
  require.cache[motionKey] = { id: motionKey, filename: motionKey, loaded: true, exports: { ...motion, useReducedMotion: () => reduced } } as NodeJS.Module;
  require.cache[navKey] = { id: navKey, filename: navKey, loaded: true, exports: { AnimatedNavigation: () => null } } as NodeJS.Module;
  try {
    const { MotionModePicker } = require("./motion-mode-picker");
    const render = () => renderToStaticMarkup(createElement(MotionModePicker, { fr: true, onContinue() {} }));
    const server = render();
    reduced = true;
    assert.equal(render(), server);
    reduced = false;
    assert.equal(render(), server);
  } finally {
    require.cache[motionKey] = previousMotion;
    if (previousNav) require.cache[navKey] = previousNav; else delete require.cache[navKey];
    if (previousCss) require.cache[cssKey] = previousCss; else delete require.cache[cssKey];
  }
});
