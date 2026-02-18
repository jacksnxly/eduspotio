import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Read-only stubs — BetterAuth owns these tables via `npx better-auth generate`.
// Defined here ONLY for Drizzle relation definitions. Not included in migrations.
// These are excluded from drizzle-kit generate by placing them in a separate file
// that is not part of the schema glob (see drizzle.config.ts).

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  image: text("image"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name"),
  slug: text("slug"),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at"),
});
