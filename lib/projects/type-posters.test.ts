import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TYPE_POSTER_ART } from "../../remotion/video/type-poster-art-registry";
import { TYPE_POSTERS, getTypePoster } from "../../config/type-posters";
import { getStyle } from "../../config/styles";
import { getDictionary } from "../i18n";
import { createProjectSchema } from "./validation";
import { TRANSITIONS } from "./scenes";
import { demoVideoProps } from "./demo-video";

test("the ten type posters are creatable in every format with translated signature transitions", () => {
  assert.equal(Object.keys(TYPE_POSTERS).length, 10);
  for (const [id, poster] of Object.entries(TYPE_POSTERS)) {
    const style = getStyle(id)!;
    assert.ok(style, id);
    assert.equal(style.name, poster.name);
    assert.equal(style.recipe.graphicTreatment, id);
    assert.equal(style.recipe.transitions[0], poster.transition);
    assert.ok(TRANSITIONS.includes(poster.transition));
    for (const locale of ["fr", "en"] as const) {
      const dictionary = getDictionary(locale);
      assert.ok(dictionary.styles[id as keyof typeof dictionary.styles]);
    }
    for (const format of ["PORTRAIT", "SQUARE", "LANDSCAPE"]) assert.ok(createProjectSchema.safeParse({ appName: "Brand", styleId: id, format, duration: 15, colors: style.palette, logo: null, screens: [], musicMode: "none", musicTrackId: null, music: null }).success);
  }
  assert.equal(getTypePoster("missing"), undefined);
});

test("poster previews include logo, phone and browser scenes while retaining template names", () => {
  for (const [id, poster] of Object.entries(TYPE_POSTERS)) for (const format of ["PORTRAIT", "SQUARE", "LANDSCAPE"] as const) for (const locale of ["fr", "en"] as const) {
    const props = demoVideoProps(getStyle(id)!, format, locale);
    assert.equal(props.appName, poster.name);
    assert.deepEqual(props.graph.scenes.map(scene => scene.kind), ["intro", "logo", "feature", "screens", "screens", "cta"]);
    assert.ok(props.graph.scenes.every(scene => scene.title === poster.name.toUpperCase()));
    const screens = props.graph.scenes.filter(scene => scene.kind === "screens");
    assert.equal(screens[0].screenFrame, "phone");
    assert.equal(screens[0].layout, getStyle(id)!.recipe.screens);
    assert.equal(screens[1].screenFrame, "browser");
    assert.equal(screens[1].screenCount, 1);
  }
});

test("every poster artwork keeps animating after its entrance and renders deterministically", () => {
  for (const id of Object.keys(TYPE_POSTERS) as (keyof typeof TYPE_POSTERS)[]) {
    const style = getStyle(id)!;
    const render = (time: number) => renderToStaticMarkup(createElement(TYPE_POSTER_ART[id], { text: style.name, palette: style.palette, time, enter: 1, id: `test-${id}` }));
    assert.notEqual(render(2), render(3), `${id} must move after entering`);
    assert.equal(render(2), render(2), `${id} must reproduce the same frame`);
    assert.doesNotMatch(render(1000), /NaN|Infinity/, `${id} stays finite`);
  }
});

test("each poster offers its signature plus at least two themed transitions, and default videos use three of them", async () => {
  const { ensurePosterVariety, themedTransitions } = await import("../../config/type-posters");
  for (const [id, poster] of Object.entries(TYPE_POSTERS)) {
    const recipe = getStyle(id)!.recipe;
    const themed = themedTransitions(recipe.transitions);
    assert.equal(themed[0], poster.transition);
    assert.ok(themed.length >= 3, `${id} needs 2+ themed transitions besides its signature`);
    assert.equal(new Set(recipe.transitions).size, recipe.transitions.length, `${id} has no duplicate`);
    for (const t of recipe.transitions) assert.ok(TRANSITIONS.includes(t), `${id} ${t}`);
    const demo = demoVideoProps(getStyle(id)!, "PORTRAIT", "fr").graph.scenes.slice(1).map((s) => s.transition);
    assert.ok(new Set(demo).size >= 3, `${id} demo shows 3 transitions`);
    // L'IA répète la signature partout : le garde-fou fait tourner les transitions
    const repeated = Array.from({ length: 6 }, (_, i) => ({ id: String(i), transition: poster.transition }));
    assert.ok(new Set(ensurePosterVariety(repeated, recipe.transitions).slice(1).map((s) => s.transition)).size >= 3);
    // Des choix déjà variés sont conservés
    const varied = [poster.transition, ...themed].map((transition, i) => ({ id: String(i), transition }));
    assert.deepEqual(ensurePosterVariety(varied, recipe.transitions), varied);
  }
});

test("Lucent, Echo Frame, Folio and Broadsheet offer three themed transitions and show them by default", async () => {
  const { themedTransitions, variesTransitions } = await import("../../config/type-posters");
  for (const id of ["lucent", "echo-frame", "folio", "broadsheet"]) {
    const style = getStyle(id)!;
    assert.ok(variesTransitions(style.recipe), id);
    assert.ok(themedTransitions(style.recipe.transitions).length >= 3, id);
    for (const t of style.recipe.transitions) assert.ok(TRANSITIONS.includes(t), `${id} ${t}`);
    const demo = demoVideoProps(style, "PORTRAIT", "fr").graph.scenes.slice(1).map((s) => s.transition);
    assert.ok(new Set(demo).size >= 3, `${id} demo: ${demo.join(", ")}`);
  }
});
