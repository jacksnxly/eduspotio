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
  // Exclude BetterAuth-managed tables from migration generation.
  // These stubs exist in auth-refs.ts only for Drizzle relation definitions.
  tablesFilter: [
    "!user",
    "!session",
    "!account",
    "!verification",
    "!organization",
    "!member",
    "!invitation",
    "!team",
    "!team_member",
  ],
});
