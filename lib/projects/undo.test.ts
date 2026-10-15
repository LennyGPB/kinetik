import assert from "node:assert/strict";
import { test } from "node:test";
import { undoTarget } from "./undo";

test("successive undos follow the original trail, including after reloading saved versions", () => {
  const versions = [{ number: 1, label: "Premier jet" }];
  assert.equal(undoTarget(versions), null);
  versions.push({ number: 2, label: "Texte" }, { number: 3, label: "Durée" });
  assert.equal(undoTarget(versions), 2);
  versions.push({ number: 4, label: "Annulation · retour à la v2" });
  assert.equal(undoTarget(JSON.parse(JSON.stringify(versions))), 1);
  versions.push({ number: 5, label: "Annulation · retour à la v1" });
  assert.equal(undoTarget(versions), null);
  versions.push({ number: 6, label: "Nouveau texte" });
  assert.equal(undoTarget(versions), 5);
  versions.push({ number: 7, label: "Annulation · retour à la v5" });
  assert.equal(undoTarget(versions), null);
});

test("manual restoration can itself be undone", () => {
  assert.equal(undoTarget([{ number: 1, label: "Premier jet" }, { number: 2, label: "Texte" }, { number: 3, label: "Retour à la v1" }]), 2);
});
