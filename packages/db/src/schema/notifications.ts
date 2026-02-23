import { sql } from "drizzle-orm";
import {
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { appUser } from "./community";
import { notificationTypeEnum } from "./enums";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    communityId: text("community_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    actorId: text("actor_id"),
    targetId: uuid("target_id"),
    targetType: text("target_type"),
    title: text("title").notNull(),
    body: text("body"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_notifications_user_unread").on(t.userId, t.readAt, t.createdAt),
    index("idx_notifications_community").on(t.communityId),
    pgPolicy("notifications_tenant_isolation", {
      as: "permissive",
      to: appUser,
      for: "all",
      using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
      withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    }),
  ],
);
