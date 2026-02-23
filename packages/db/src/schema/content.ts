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
import { appUser } from "./community";
import { postTypeEnum } from "./enums";
import { spaces } from "./spaces";

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: text("community_id").notNull(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull(),
    type: postTypeEnum("type").notNull().default("discussion"),
    title: text("title"),
    content: jsonb("content").notNull(),
    contentHtml: text("content_html"),
    contentPlaintext: text("content_plaintext"),
    metadata: jsonb("metadata"),
    isPinned: boolean("is_pinned").default(false),
    isLocked: boolean("is_locked").default(false),
    commentCount: integer("comment_count").default(0),
    reactionCount: integer("reaction_count").default(0),
    bumpedAt: timestamp("bumped_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_posts_feed").on(t.spaceId, t.bumpedAt),
    index("idx_posts_community_feed").on(t.communityId, t.bumpedAt),
    index("idx_posts_author").on(t.authorId, t.createdAt),
    pgPolicy("posts_tenant_isolation", {
      as: "permissive",
      to: appUser,
      for: "all",
      using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
      withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    }),
  ],
);

// @ts-ignore — Self-referencing FK (parentCommentId → comments.id) causes circular type inference
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull(),
    // @ts-ignore — Self-referencing FK: circular type inference is expected
    parentCommentId: uuid("parent_comment_id").references(() => comments.id, {
      onDelete: "set null",
    }),
    content: jsonb("content").notNull(),
    contentHtml: text("content_html"),
    reactionCount: integer("reaction_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_comments_post").on(t.postId, t.createdAt),
    index("idx_comments_author").on(t.authorId),
  ],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    reactableId: uuid("reactable_id").notNull(),
    reactableType: text("reactable_type").notNull(),
    type: text("type").notNull().default("like"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    unique().on(t.userId, t.reactableId, t.reactableType),
    index("idx_reactions_target").on(t.reactableType, t.reactableId),
  ],
);
