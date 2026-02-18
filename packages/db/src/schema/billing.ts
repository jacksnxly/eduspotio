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
import { spaces } from "./spaces";
import { courses } from "./courses";

export const customers = pgTable("customers", {
  userId: text("user_id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  active: boolean("active").default(true),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  metadata: jsonb("metadata"),
});

export const prices = pgTable("prices", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  active: boolean("active").default(true),
  unitAmount: integer("unit_amount"),
  currency: text("currency").notNull().default("usd"),
  type: text("type").notNull(),
  interval: text("interval"),
  intervalCount: integer("interval_count"),
  trialPeriodDays: integer("trial_period_days"),
  metadata: jsonb("metadata"),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    priceId: text("price_id")
      .notNull()
      .references(() => prices.id),
    status: text("status").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),
    canceledAt: timestamp("canceled_at"),
    endedAt: timestamp("ended_at"),
    metadata: jsonb("metadata"),
  },
  (t) => [index("idx_subscriptions_user").on(t.userId)],
);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: text("community_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    stripeProductId: text("stripe_product_id").references(() => products.id),
    features: jsonb("features").default({}),
    isDefault: boolean("is_default").default(false),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_plans_community").on(t.communityId),
    pgPolicy("plans_tenant_isolation", {
      as: "permissive",
      to: appUser,
      for: "all",
      using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
      withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    }),
  ],
);

export const planSpaceAccess = pgTable(
  "plan_space_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    accessLevel: text("access_level").notNull().default("member"),
  },
  (t) => [unique().on(t.planId, t.spaceId)],
);

export const planCourseAccess = pgTable(
  "plan_course_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
  },
  (t) => [unique().on(t.planId, t.courseId)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    communityId: text("community_id").notNull(),
    planId: uuid("plan_id").references(() => plans.id),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: text("status").notNull().default("active"),
    currentPeriodEnd: timestamp("current_period_end"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    unique().on(t.userId, t.communityId),
    index("idx_memberships_community").on(t.communityId),
    pgPolicy("memberships_tenant_isolation", {
      as: "permissive",
      to: appUser,
      for: "all",
      using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
      withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    }),
  ],
);
