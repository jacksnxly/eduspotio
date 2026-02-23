import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgPolicy,
  pgRole,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { domainTypeEnum } from "./enums";

export const appUser = pgRole("app_user").existing();

export const communitySettings = pgTable(
  "community_settings",
  {
    communityId: text("community_id").primaryKey(),
    description: text("description"),
    theme: jsonb("theme").default({
      primaryColor: "#3B82F6",
      accentColor: "#8B5CF6",
      backgroundColor: "#FFFFFF",
      textColor: "#111827",
      fontFamily: "Inter",
      borderRadius: "8px",
      logoUrl: null,
      faviconUrl: null,
    }),
    features: jsonb("features").default({
      coursesEnabled: true,
      eventsEnabled: true,
      gamificationEnabled: false,
      chatEnabled: false,
    }),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    pgPolicy("community_settings_tenant_isolation", {
      as: "permissive",
      to: appUser,
      for: "all",
      using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
      withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    }),
  ],
);

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: text("community_id").notNull(),
    domain: text("domain").unique().notNull(),
    domainType: domainTypeEnum("domain_type").notNull(),
    verified: boolean("verified").default(false),
    sslStatus: text("ssl_status").default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_domains_community").on(t.communityId),
    pgPolicy("domains_tenant_isolation", {
      as: "permissive",
      to: appUser,
      for: "all",
      using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
      withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    }),
  ],
);
