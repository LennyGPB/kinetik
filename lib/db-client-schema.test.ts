import test from "node:test";
import assert from "node:assert/strict";
import { clientMatchesSchema } from "./db-client-schema";

test("Prisma reuse rejects an old runtime even when imported metadata has been refreshed", () => {
  const models = { BrandKit: ["id", "brief"], UrlVideoAnalysis: ["id", "data"] };
  const brandKit = { findMany() {}, fields: { id: {} } };
  assert.equal(clientMatchesSchema({ brandKit }, models), false);
  const urlVideoAnalysis = { findMany() {}, fields: { id: {}, data: {} } };
  assert.equal(clientMatchesSchema({ brandKit, urlVideoAnalysis }, models), false);
  assert.equal(clientMatchesSchema({ brandKit: { ...brandKit, fields: { id: {}, brief: {} } }, urlVideoAnalysis }, models), true);
  assert.equal(clientMatchesSchema(undefined, models), false);
});

test("current generated client exposes every required runtime delegate and field", async () => {
  const { Prisma, PrismaClient } = await import("./generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const models = Object.fromEntries(Object.entries(Prisma).filter(([name]) => name.endsWith("ScalarFieldEnum"))
    .map(([name, fields]) => [name.slice(0, -"ScalarFieldEnum".length), Object.keys(fields)]));
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://unused:unused@localhost/unused" }) });
  try { assert.equal(clientMatchesSchema(client, models), true); }
  finally { await client.$disconnect(); }
});
