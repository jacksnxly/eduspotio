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
import {
  dripTypeEnum,
  enrollmentStatusEnum,
  lessonTypeEnum,
  progressStatusEnum,
} from "./enums";
import { spaces } from "./spaces";

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: text("community_id").notNull(),
    spaceId: uuid("space_id").references(() => spaces.id),
    authorId: text("author_id").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    coverImageUrl: text("cover_image_url"),
    published: boolean("published").default(false),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_courses_community").on(t.communityId),
    unique().on(t.communityId, t.slug),
    pgPolicy("courses_tenant_isolation", {
      as: "permissive",
      to: appUser,
      for: "all",
      using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
      withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    }),
  ],
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").default(0),
    dripType: dripTypeEnum("drip_type").notNull().default("none"),
    dripDays: integer("drip_days"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("idx_modules_course").on(t.courseId, t.sortOrder)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: lessonTypeEnum("type").notNull().default("text"),
    content: jsonb("content"),
    contentHtml: text("content_html"),
    config: jsonb("config"),
    sortOrder: integer("sort_order").default(0),
    isFreePreview: boolean("is_free_preview").default(false),
    estimatedMinutes: integer("estimated_minutes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("idx_lessons_module").on(t.moduleId, t.sortOrder)],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("student"),
    status: enrollmentStatusEnum("status").notNull().default("active"),
    enrolledAt: timestamp("enrolled_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    unique().on(t.userId, t.courseId),
    index("idx_enrollments_user").on(t.userId),
    index("idx_enrollments_course").on(t.courseId),
  ],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    status: progressStatusEnum("status").notNull().default("not_started"),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    unique().on(t.userId, t.lessonId),
    index("idx_lesson_progress_user").on(t.userId),
  ],
);
