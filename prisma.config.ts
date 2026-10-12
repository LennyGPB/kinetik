import "dotenv/config";
import { defineConfig } from "prisma/config";

// Le CLI (migrations) doit utiliser la connexion DIRECTE à Neon, pas le pooler.
// DIRECT_URL si définie, sinon dérivée de DATABASE_URL en retirant "-pooler" de l'hôte.
const directUrl = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]?.replace("-pooler.", ".");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    url: directUrl,
  },
});
