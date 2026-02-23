import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  entities: {
    roles: {
      provider: "neon",
    },
  },
  // Auth tables are now Drizzle-managed (defined in schema/auth.ts).
  // No tablesFilter needed — all tables included in migrations.
});
