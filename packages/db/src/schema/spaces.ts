import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { accessLevelEnum, spaceTypeEnum } from "./enums";
import { appUser } from "./community";

export const spaceGroups = pgTable(
  "space_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: text("community_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_space_groups_community").on(t.communityId),
    unique().on(t.communityId, t.slug),
    pgPolicy("space_groups_tenant_isolation", {
      as: "permissive",
      to: appUser,
      for: "all",
      using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
      withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    }),
  ],
);

export const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: text("community_id").notNull(),
    spaceGroupId: uuid("space_group_id").references(() => spaceGroups.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    icon: text("icon"),
    type: spaceTypeEnum("type").notNull().default("discussion"),
    accessLevel: accessLevelEnum("access_level").notNull().default("public"),
    settings: jsonb("settings").default({
      allowMemberPosts: true,
      allowComments: true,
      requireApproval: false,
    }),
    sortOrder: integer("sort_order").default(0),
    isArchived: boolean("is_archived").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_spaces_community").on(t.communityId),
    unique().on(t.communityId, t.slug),
    pgPolicy("spaces_tenant_isolation", {
      as: "permissive",
      to: appUser,
      for: "all",
      using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
      withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    }),
  ],
);

export const spaceMemberships = pgTable(
  "space_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    unique().on(t.userId, t.spaceId),
    index("idx_space_memberships_user").on(t.userId),
    index("idx_space_memberships_space").on(t.spaceId),
  ],
);
