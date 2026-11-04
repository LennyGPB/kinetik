import { test } from "node:test";
import assert from "node:assert/strict";
import { packsUntil, restoAllowance, restoQuote } from "./allowance";

test("packs restants : un par semaine jusqu'à la fin de la tranche", () => {
  // Mercredi 4 novembre 2026, tranche jusqu'au 1er décembre
  const now = new Date(2026, 10, 4, 10), end = new Date(2026, 11, 1);
  assert.equal(packsUntil(now, end, 0), 4); // lundis 9, 16, 23, 30
  assert.equal(packsUntil(now, end, 2), 4); // mercredis 4 (aujourd'hui), 11, 18, 25
  assert.equal(packsUntil(now, end, 0, false), 0);
  assert.equal(packsUntil(now, null, 0), 0);
  assert.equal(packsUntil(now, new Date(2026, 10, 1), 0), 0);
});

test("les packs sont mis de côté avant les plats du jour", () => {
  assert.deepEqual(restoAllowance(270, 5), { packsLeft: 5, packsMissing: 0, platsLeft: 15, reserved: 150, free: 120 });
  assert.deepEqual(restoAllowance(100, 4), { packsLeft: 3, packsMissing: 1, platsLeft: 1, reserved: 90, free: 10 });
  assert.equal(restoAllowance(-5, 2).platsLeft, 0);
});

test("prix d'un téléchargement Resto", () => {
  const now = new Date("2026-11-04T10:00:00Z");
  const hour = (h: number) => new Date(now.getTime() - h * 3_600_000);
  assert.deepEqual(restoQuote({ restoPlan: true, welcome: true, firstExportAt: null, now }), { credits: 0, kind: "welcome" });
  assert.deepEqual(restoQuote({ restoPlan: false, welcome: true, firstExportAt: null, now }), { credits: 0, kind: "welcome" });
  assert.equal(restoQuote({ restoPlan: false, welcome: false, firstExportAt: null, now }), null);
  assert.equal(restoQuote({ restoPlan: false, welcome: true, firstExportAt: hour(1), now }), null);
  assert.deepEqual(restoQuote({ restoPlan: true, welcome: false, firstExportAt: null, now }), { credits: 8, kind: "dish" });
  assert.deepEqual(restoQuote({ restoPlan: true, welcome: false, firstExportAt: hour(2), now }), { credits: 0, kind: "again" });
  assert.deepEqual(restoQuote({ restoPlan: true, welcome: true, firstExportAt: hour(30), now }), { credits: 8, kind: "dish" });
});

test("pack du jour déjà validé : plus réservé ; pack passé en attente : toujours réservé", () => {
  const monday = new Date(2026, 10, 9, 10), end = new Date(2026, 11, 1);
  assert.equal(packsUntil(monday, end, 0), 4); // 9, 16, 23, 30
  assert.equal(packsUntil(monday, end, 0, true, true), 3);
  assert.equal(packsUntil(monday, end, 0, true, false, 1), 5);
});

test("contenus d'un pack : inclus une fois validé, bloqués avant", () => {
  const now = new Date();
  assert.deepEqual(restoQuote({ restoPlan: true, welcome: false, firstExportAt: null, now, pack: "validated" }), { credits: 0, kind: "pack" });
  assert.deepEqual(restoQuote({ restoPlan: true, welcome: false, firstExportAt: null, now, pack: "pending" }), { credits: 0, kind: "packPending" });
});
