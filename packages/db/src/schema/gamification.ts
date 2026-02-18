import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { appUser } from "./community";

export const points = pgTable(
  "points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    communityId: text("community_id").notNull(),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    sourceId: uuid("source_id"),
    sourceType: text("source_type"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_points_user_community").on(t.userId, t.communityId),
    pgPolicy("points_tenant_isolation", {
      as: "permissive",
      to: appUser,
      for: "all",
      using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
      withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    }),
  ],
);

export const leaderboard = pgTable(
  "leaderboard",
  {
    userId: text("user_id").notNull(),
    communityId: text("community_id").notNull(),
    totalPoints: integer("total_points").default(0),
    rank: integer("rank"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    unique().on(t.userId, t.communityId),
    index("idx_leaderboard_rank").on(t.communityId, t.totalPoints),
    pgPolicy("leaderboard_tenant_isolation", {
      as: "permissive",
      to: appUser,
      for: "all",
      using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
      withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    }),
  ],
);
