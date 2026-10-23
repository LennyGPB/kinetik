import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import { clientMatchesSchema } from "./db-client-schema";

// Postgres (Neon) : l'app passe par l'URL poolée (DATABASE_URL).
function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaSchema?: string; prismaConstructor?: typeof PrismaClient };
// HMR retains globalThis after prisma generate. Reuse the pool only while the generated
// schema is unchanged; otherwise the old client rejects newly added fields.
const schema = JSON.stringify(Object.entries(Prisma).filter(([name]) => name.endsWith("ScalarFieldEnum")));
const models = Object.fromEntries(Object.entries(Prisma).filter(([name]) => name.endsWith("ScalarFieldEnum"))
  .map(([name, fields]) => [name.slice(0, -"ScalarFieldEnum".length), Object.keys(fields)]));

export const db = globalForPrisma.prisma && globalForPrisma.prismaSchema === schema && globalForPrisma.prismaConstructor === PrismaClient
  && clientMatchesSchema(globalForPrisma.prisma, models) ? globalForPrisma.prisma : createClient();

if (process.env.NODE_ENV !== "production") {
  if (globalForPrisma.prisma && globalForPrisma.prisma !== db) void globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = db;
  globalForPrisma.prismaSchema = schema;
  globalForPrisma.prismaConstructor = PrismaClient;
}
