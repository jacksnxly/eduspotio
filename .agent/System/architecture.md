# Eduspot Platform Architecture & Database Schema

> Research-backed architecture document synthesized from analysis of 9 open-source platforms (Discourse, Forem, Canvas LMS, Moodle, Cal.com, Formbricks, Documenso, Huly), official documentation from BetterAuth, Drizzle ORM, Stripe, Supabase, Caddy, and Vercel, plus engineering blogs from Crunchy Data, AWS SaaS Factory, GetStream, and others.

---

## 1. Executive Summary

Eduspot should use a **shared-database, row-level isolation architecture** with `community_id` (tenant ID) on all tenant-scoped tables, enforced by both application-level query scoping in Drizzle ORM and PostgreSQL Row-Level Security (RLS) as a safety net. Authentication and organization management are handled by **BetterAuth's Organization plugin**, which provides built-in RBAC with custom resource permissions. The content model uses a **single `posts` table with a type discriminator** (proven by Forem/Skool) combined with **space-scoped feeds using fan-out-on-read and bump-on-comment ordering** (proven by Discourse/Skool). Courses follow a **three-level hierarchy** (Course > Module > Lesson) with per-lesson progress tracking (proven by Moodle/Canvas LMS). Payments mirror **Stripe object IDs as primary keys** for products/prices/subscriptions (Vercel's canonical pattern), mapped to internal plans that gate space access. Rich text is stored as **Tiptap JSON with pre-rendered HTML**. The entire platform runs from a single codebase with **environment variable toggles** for self-hosted (single-tenant) vs SaaS (multi-tenant) mode, following the proven Formbricks/Cal.com pattern.

---

## 2. Multi-Tenancy Recommendation

### Decision: Shared Database + `community_id` + PostgreSQL RLS

**Evidence:**
- Crunchy Data benchmarks show RLS adds only ~12% overhead (3.2ms -> 3.6ms) vs schema-per-tenant at 4.8-12.5ms
- Supabase, AWS SaaS Factory, and Neon all recommend this pattern for SaaS platforms
- Cal.com (Next.js) and Formbricks (Next.js, AGPL) both use shared DB with discriminator columns
- Discourse uses DB-per-tenant, but that only works for hundreds of instances, not thousands

**Implementation: Dual-Layer Enforcement**

```
Layer 1 (Application): Drizzle scoped query helpers that always include WHERE community_id = ?
Layer 2 (Database):    PostgreSQL RLS policies as a safety net against data leaks
```

RLS setup pattern (set tenant context per-request):
```sql
-- RLS policy on all tenant-scoped tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON posts
  USING (community_id = current_setting('app.current_tenant_id')::text);

-- Set in middleware before each request
SET LOCAL app.current_tenant_id = '{tenant_id}';
```

**Self-Host vs SaaS Toggle (same codebase):**
```env
# Self-hosted (default) — single org auto-created, no billing UI
MULTI_TENANT=false
BILLING_ENABLED=false

# SaaS mode — org creation, Stripe billing, custom domains
MULTI_TENANT=true
BILLING_ENABLED=true
STRIPE_SECRET_KEY=sk_...
```

This matches exactly how Formbricks and Cal.com handle it.

**Migration Path:**
```
Day 1:      Shared DB + community_id + RLS
Growth:     Hash partitioning on community_id, composite indexes
Enterprise: Peel heavy tenants to separate schemas/DBs via PG15+ logical replication
```

### Custom Domains

Two-tier strategy:
1. **Default:** `{slug}.eduspot.io` subdomains via wildcard DNS + wildcard SSL cert
2. **Custom:** Customer domains via Caddy On-Demand TLS (self-hosted) or Vercel Domains API

Next.js middleware resolves tenant from `Host` header on every request (cached).

Evidence: Hashnode manages 35K+ custom domains via Vercel; Caddy On-Demand TLS is production-proven for self-hosted multi-tenant.

### Theming

JSON column on the community table, rendered as CSS custom properties:

```jsonc
// theme column (JSONB) on communities table
{
  "primaryColor": "#3B82F6",
  "accentColor": "#8B5CF6",
  "backgroundColor": "#FFFFFF",
  "textColor": "#111827",
  "fontFamily": "Inter",
  "borderRadius": "8px",
  "logoUrl": null,
  "faviconUrl": null
}
```

Injected in the root layout as CSS custom properties. Tailwind CSS v4 natively supports CSS variables.

---

## 3. Complete Database Schema

All tables use **UUID primary keys** (`gen_random_uuid()`, migrate to UUIDv7 when PostgreSQL 18 lands). Stripe-synced tables use Stripe's text IDs as PKs. All UGC tables include `deleted_at` for soft deletes. All tenant-scoped tables include `community_id` as leading column in composite indexes.

### 3.1 Core Tables (BetterAuth Managed)

BetterAuth generates and manages these tables via `npx better-auth generate`:

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `user` | id (text PK), name, email, emailVerified, image, createdAt, updatedAt | Auth identity |
| `session` | id (text PK), userId (FK), token, expiresAt, ipAddress, userAgent | Active sessions |
| `account` | id (text PK), userId (FK), accountId, providerId, accessToken, refreshToken, password | OAuth + credentials |
| `verification` | id (text PK), identifier, value, expiresAt | Email/phone verification |

BetterAuth **Organization plugin** adds 5 additional tables:

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `organization` | id, name, slug, logo, metadata, createdAt | = Community tenant |
| `member` | id, organizationId, userId, role, createdAt | Community membership |
| `invitation` | id, organizationId, email, role, status, expiresAt | Pending invites |
| `team` | id, name, organizationId, createdAt | Sub-teams within org |
| `teamMember` | id, teamId, userId, role | Team membership |

BetterAuth's `organization` table IS the community/tenant entity. Map `organization` = `community` conceptually.

### 3.2 Drizzle ORM Schema

```typescript
import {
  pgTable, pgEnum, text, integer, boolean,
  timestamp, jsonb, uuid, unique, index, serial
} from 'drizzle-orm/pg-core';

// ============================================================
// ENUMS
// ============================================================

export const postTypeEnum = pgEnum('post_type', [
  'discussion', 'announcement', 'course_update', 'introduction', 'poll'
]);

export const spaceTypeEnum = pgEnum('space_type', [
  'discussion', 'chat', 'course', 'event', 'members', 'gallery'
]);

export const accessLevelEnum = pgEnum('access_level', [
  'public', 'private', 'secret'
]);

export const lessonTypeEnum = pgEnum('lesson_type', [
  'video', 'text', 'quiz', 'assignment', 'embed'
]);

export const progressStatusEnum = pgEnum('progress_status', [
  'not_started', 'in_progress', 'completed', 'failed'
]);

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'active', 'completed', 'cancelled', 'paused'
]);

export const dripTypeEnum = pgEnum('drip_type', [
  'none', 'days_after_enrollment', 'after_previous_module'
]);

export const domainTypeEnum = pgEnum('domain_type', [
  'subdomain', 'custom'
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'comment_on_post', 'reply_to_comment', 'reaction', 'mention',
  'new_post_in_space', 'course_update', 'enrollment', 'system'
]);

// ============================================================
// MULTI-TENANCY: COMMUNITIES (extends BetterAuth organization)
// ============================================================

// BetterAuth's `organization` table is the primary tenant entity.
// This table stores Eduspot-specific community configuration.
export const communitySettings = pgTable('community_settings', {
  // FK to BetterAuth organization.id
  communityId: text('community_id').primaryKey(),
  description: text('description'),
  theme: jsonb('theme').default({
    primaryColor: '#3B82F6',
    accentColor: '#8B5CF6',
    backgroundColor: '#FFFFFF',
    textColor: '#111827',
    fontFamily: 'Inter',
    borderRadius: '8px',
    logoUrl: null,
    faviconUrl: null,
  }),
  features: jsonb('features').default({
    coursesEnabled: true,
    eventsEnabled: true,
    gamificationEnabled: false,
    chatEnabled: false,
  }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================
// CUSTOM DOMAINS
// ============================================================

export const domains = pgTable('domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: text('community_id').notNull(),
  domain: text('domain').unique().notNull(),
  domainType: domainTypeEnum('domain_type').notNull(),
  verified: boolean('verified').default(false),
  sslStatus: text('ssl_status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  communityIdx: index('idx_domains_community').on(table.communityId),
}));

// ============================================================
// SPACES & SPACE GROUPS
// ============================================================

// Space groups are organizational containers (sidebar sections)
// Modeled after Circle's Space Groups
export const spaceGroups = pgTable('space_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: text('community_id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  communityIdx: index('idx_space_groups_community').on(table.communityId),
  uniqueSlug: unique().on(table.communityId, table.slug),
}));

// Spaces are the core content containers
// NOT just a FK - a rich entity with type, access control, settings
// Modeled after Circle spaces + Discourse categories
export const spaces = pgTable('spaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: text('community_id').notNull(),
  spaceGroupId: uuid('space_group_id').references(() => spaceGroups.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  icon: text('icon'),
  type: spaceTypeEnum('type').notNull().default('discussion'),
  accessLevel: accessLevelEnum('access_level').notNull().default('public'),
  // Flexible per-space settings
  settings: jsonb('settings').default({
    allowMemberPosts: true,
    allowComments: true,
    requireApproval: false,
  }),
  sortOrder: integer('sort_order').default(0),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  communityIdx: index('idx_spaces_community').on(table.communityId),
  uniqueSlug: unique().on(table.communityId, table.slug),
}));

// Space-level role overrides (extends community membership)
// A user can be 'member' at community level but 'moderator' in a specific space
// Modeled after Mighty Networks' space-scoped roles + Discourse's category_groups
export const spaceMemberships = pgTable('space_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  spaceId: uuid('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // 'host' | 'moderator' | 'member' | 'viewer'
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueMembership: unique().on(table.userId, table.spaceId),
  userIdx: index('idx_space_memberships_user').on(table.userId),
  spaceIdx: index('idx_space_memberships_space').on(table.spaceId),
}));

// ============================================================
// CONTENT: POSTS & FEED
// ============================================================

// Single posts table with type discriminator
// Proven by Forem (articles table) and Skool (category-based feed with post types)
// Fan-out-on-read with bump-on-comment ordering (Discourse/Skool pattern)
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: text('community_id').notNull(),
  spaceId: uuid('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull(),
  type: postTypeEnum('type').notNull().default('discussion'),
  title: text('title'),
  // Tiptap JSON as source of truth + pre-rendered HTML for fast reads
  // Consensus from Tiptap community: store both formats
  content: jsonb('content').notNull(),
  contentHtml: text('content_html'),
  contentPlaintext: text('content_plaintext'), // extracted for FTS
  // Type-specific metadata (e.g., poll options, course link)
  metadata: jsonb('metadata'),
  isPinned: boolean('is_pinned').default(false),
  isLocked: boolean('is_locked').default(false),
  // Denormalized counters (avoids N+1 on feed queries)
  commentCount: integer('comment_count').default(0),
  reactionCount: integer('reaction_count').default(0),
  // Bump-on-comment: updated when new comment is added (Discourse pattern)
  bumpedAt: timestamp('bumped_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  // Primary feed query: newest bumped posts in a space
  feedIdx: index('idx_posts_feed').on(table.spaceId, table.bumpedAt),
  // Cross-space feed for a community
  communityFeedIdx: index('idx_posts_community_feed').on(table.communityId, table.bumpedAt),
  // User's posts
  authorIdx: index('idx_posts_author').on(table.authorId, table.createdAt),
}));

// Flat comments with optional one-level reply (Skool/Discourse pattern)
// parent_id can only reference a top-level comment (enforce in app: no reply-to-reply)
// Avoids deep nesting complexity while keeping "replied to X" context
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull(),
  // Only references top-level comments (not nested replies)
  parentCommentId: uuid('parent_comment_id'),
  content: jsonb('content').notNull(),
  contentHtml: text('content_html'),
  reactionCount: integer('reaction_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  postIdx: index('idx_comments_post').on(table.postId, table.createdAt),
  authorIdx: index('idx_comments_author').on(table.authorId),
}));

// Polymorphic reactions (Forem pattern: reactable_id + reactable_type)
// Supports reactions on posts, comments, and lessons
export const reactions = pgTable('reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  reactableId: uuid('reactable_id').notNull(),
  reactableType: text('reactable_type').notNull(), // 'post' | 'comment' | 'lesson'
  type: text('type').notNull().default('like'), // 'like' | 'heart' | 'celebrate' | etc.
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueReaction: unique().on(table.userId, table.reactableId, table.reactableType),
  targetIdx: index('idx_reactions_target').on(table.reactableType, table.reactableId),
}));

// ============================================================
// COURSES: THREE-LEVEL HIERARCHY
// ============================================================

// Course > Module > Lesson hierarchy
// Modeled after Canvas LMS (Course > ContextModule > ContentTag)
// and Moodle (Course > Section > CourseModule)
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: text('community_id').notNull(),
  // Optional: link course to a space for integrated feed
  spaceId: uuid('space_id').references(() => spaces.id),
  authorId: text('author_id').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  published: boolean('published').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  communityIdx: index('idx_courses_community').on(table.communityId),
  uniqueSlug: unique().on(table.communityId, table.slug),
}));

// Modules (ordered sections within a course)
// Drip content at module level (Teachable pattern)
export const modules = pgTable('modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  // Drip scheduling (Teachable/Thinkific pattern)
  dripType: dripTypeEnum('drip_type').notNull().default('none'),
  dripDays: integer('drip_days'), // days after enrollment (when dripType = 'days_after_enrollment')
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  courseIdx: index('idx_modules_course').on(table.courseId, table.sortOrder),
}));

// Lessons (ordered items within a module)
export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: lessonTypeEnum('type').notNull().default('text'),
  // Tiptap JSON for text lessons; metadata for video/quiz/embed
  content: jsonb('content'),
  contentHtml: text('content_html'),
  // Type-specific config (video URL, quiz questions, embed code)
  config: jsonb('config'),
  sortOrder: integer('sort_order').default(0),
  isFreePreview: boolean('is_free_preview').default(false),
  estimatedMinutes: integer('estimated_minutes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  moduleIdx: index('idx_lessons_module').on(table.moduleId, table.sortOrder),
}));

// Enrollments: user <-> course relationship
// Typed enrollment inspired by Canvas LMS (Student, Teacher, TA, Observer)
export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('student'), // 'student' | 'instructor' | 'assistant'
  status: enrollmentStatusEnum('status').notNull().default('active'),
  enrolledAt: timestamp('enrolled_at').defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  uniqueEnrollment: unique().on(table.userId, table.courseId),
  userIdx: index('idx_enrollments_user').on(table.userId),
  courseIdx: index('idx_enrollments_course').on(table.courseId),
}));

// Per-lesson progress tracking
// UNIQUE on (user_id, lesson_id) — one record per user per lesson
// Moodle's course_modules_completion pattern (proven at scale)
export const lessonProgress = pgTable('lesson_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  status: progressStatusEnum('status').notNull().default('not_started'),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueProgress: unique().on(table.userId, table.lessonId),
  userIdx: index('idx_lesson_progress_user').on(table.userId),
}));

// ============================================================
// BILLING: STRIPE-SYNCED TABLES
// ============================================================

// Customer mapping: user <-> Stripe customer (private, never exposed)
// Vercel's nextjs-subscription-payments pattern
export const customers = pgTable('customers', {
  userId: text('user_id').primaryKey(),
  stripeCustomerId: text('stripe_customer_id').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Products synced from Stripe (PK = Stripe product ID)
// Synced via Stripe webhooks, not application writes
export const products = pgTable('products', {
  id: text('id').primaryKey(), // stripe product_id (prod_xxx)
  active: boolean('active').default(true),
  name: text('name').notNull(),
  description: text('description'),
  image: text('image'),
  metadata: jsonb('metadata'),
});

// Prices synced from Stripe (PK = Stripe price ID)
export const prices = pgTable('prices', {
  id: text('id').primaryKey(), // stripe price_id (price_xxx)
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  active: boolean('active').default(true),
  unitAmount: integer('unit_amount'), // cents
  currency: text('currency').notNull().default('usd'),
  type: text('type').notNull(), // 'one_time' | 'recurring'
  interval: text('interval'), // 'day' | 'week' | 'month' | 'year'
  intervalCount: integer('interval_count'),
  trialPeriodDays: integer('trial_period_days'),
  metadata: jsonb('metadata'),
});

// Subscriptions synced from Stripe (PK = Stripe subscription ID)
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(), // stripe subscription_id (sub_xxx)
  userId: text('user_id').notNull(),
  priceId: text('price_id').notNull().references(() => prices.id),
  status: text('status').notNull(), // trialing|active|canceled|incomplete|past_due|unpaid|paused
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  canceledAt: timestamp('canceled_at'),
  endedAt: timestamp('ended_at'),
  metadata: jsonb('metadata'),
}, (table) => ({
  userIdx: index('idx_subscriptions_user').on(table.userId),
}));

// Internal plans: maps Stripe products to platform access
// Decouples access logic from Stripe's object model
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: text('community_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  stripeProductId: text('stripe_product_id').references(() => products.id),
  features: jsonb('features').default({}),
  isDefault: boolean('is_default').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  communityIdx: index('idx_plans_community').on(table.communityId),
}));

// Plan-to-space access mapping
// When a user subscribes, they auto-get memberships in all included spaces
// Modeled after Mighty Networks tier-based space access
export const planSpaceAccess = pgTable('plan_space_access', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  spaceId: uuid('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
  accessLevel: text('access_level').notNull().default('member'), // 'member' | 'viewer'
}, (table) => ({
  uniqueAccess: unique().on(table.planId, table.spaceId),
}));

// Plan-to-course access mapping
export const planCourseAccess = pgTable('plan_course_access', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueAccess: unique().on(table.planId, table.courseId),
}));

// User membership: links user subscription to a community plan
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  communityId: text('community_id').notNull(),
  planId: uuid('plan_id').references(() => plans.id),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text('status').notNull().default('active'),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueMembership: unique().on(table.userId, table.communityId),
  communityIdx: index('idx_memberships_community').on(table.communityId),
}));

// ============================================================
// NOTIFICATIONS
// ============================================================

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(), // recipient
  communityId: text('community_id').notNull(),
  type: notificationTypeEnum('type').notNull(),
  actorId: text('actor_id'), // who triggered it
  // Polymorphic target (the thing that was acted on)
  targetId: uuid('target_id'),
  targetType: text('target_type'), // 'post' | 'comment' | 'course' | 'lesson'
  title: text('title').notNull(),
  body: text('body'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userUnreadIdx: index('idx_notifications_user_unread').on(table.userId, table.readAt, table.createdAt),
  communityIdx: index('idx_notifications_community').on(table.communityId),
}));

// ============================================================
// MEDIA / UPLOADS
// ============================================================

// File references (actual files stored in S3/R2/MinIO)
// Never proxy uploads through the app server
export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: text('community_id').notNull(),
  uploaderId: text('uploader_id').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(), // bytes
  mimeType: text('mime_type').notNull(),
  // S3 key: {communityId}/{type}/{id}/{filename}
  storageKey: text('storage_key').notNull(),
  storageBucket: text('storage_bucket').notNull(),
  // Optional: for images and videos
  width: integer('width'),
  height: integer('height'),
  durationSeconds: integer('duration_seconds'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  communityIdx: index('idx_media_community').on(table.communityId),
  uploaderIdx: index('idx_media_uploader').on(table.uploaderId),
}));

// ============================================================
// GAMIFICATION (optional, controlled by community settings)
// ============================================================

export const points = pgTable('points', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  communityId: text('community_id').notNull(),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull(), // 'post_created' | 'comment_created' | 'lesson_completed' | etc.
  sourceId: uuid('source_id'), // optional: ID of the triggering entity
  sourceType: text('source_type'), // 'post' | 'comment' | 'lesson'
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userCommunityIdx: index('idx_points_user_community').on(table.userId, table.communityId),
}));

// Denormalized leaderboard (updated periodically or via trigger)
export const leaderboard = pgTable('leaderboard', {
  userId: text('user_id').notNull(),
  communityId: text('community_id').notNull(),
  totalPoints: integer('total_points').default(0),
  rank: integer('rank'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  pk: unique().on(table.userId, table.communityId),
  rankIdx: index('idx_leaderboard_rank').on(table.communityId, table.totalPoints),
}));
```

### 3.3 Key Design Decisions Explained

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Primary Keys** | UUID (`gen_random_uuid()`) | BetterAuth uses string IDs; multi-tenant needs globally unique IDs; no information leakage (auto-increment exposes entity counts). Migrate to UUIDv7 when PG18 ships. |
| **Stripe table PKs** | Stripe's text IDs | Mirror Stripe object IDs directly (Vercel pattern). Simplifies webhook sync — no mapping table needed. |
| **Post content** | Tiptap JSON + pre-rendered HTML | JSON is CRDT-friendly, XSS-safe, lossless. Pre-rendered HTML avoids re-rendering on every read. Plain text extracted for FTS. Consensus from Tiptap community. |
| **Comments** | Flat with optional one-level reply | Skool/Discourse pattern. Avoids deep nesting complexity. `parent_comment_id` can only reference top-level comments (enforced in app). |
| **Reactions** | Polymorphic (`reactable_id` + `reactable_type`) | Forem's proven pattern. Supports reactions on posts, comments, and lessons without separate tables. |
| **Feed ordering** | `bumped_at` timestamp | Discourse/Skool pattern. Updated on new comment. Pinned posts sorted first in app layer. |
| **Soft deletes** | `deleted_at` timestamp | On all UGC tables. Discourse's two-phase pattern: soft delete immediately, hard delete after 30-day retention period. GDPR-compliant purge mechanism. |
| **Course hierarchy** | Course > Module > Lesson | Canvas LMS + Moodle pattern. Drip at module level (Teachable). Per-lesson progress with UNIQUE constraint on (user_id, lesson_id). |
| **Denormalized counters** | `comment_count`, `reaction_count` on posts | Eliminates COUNT queries on every feed load. Updated on write. Critical for feed performance. |
| **Tenant-scoped indexes** | `community_id` as leading column | All composite indexes start with tenant ID for RLS + query performance. Partial indexes on `WHERE deleted_at IS NULL` for active-only queries. |

---

## 4. Authorization Model

### Architecture: BetterAuth RBAC + Space-Scoped Overrides

```
Community Level (BetterAuth Organization Plugin):
  Owner   → Full access including billing and danger zone
  Admin   → Everything except billing and ownership transfer
  Member  → Basic participation (post, comment, react)

Space Level (Custom spaceMemberships table):
  Host      → Full control over that space (like Mighty Networks Space Host)
  Moderator → Pin/lock/delete posts, manage members in that space
  Member    → Post and comment (default for all space members)
  Viewer    → Read-only access
```

### BetterAuth Permission Configuration

```typescript
import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  community: ["update", "delete", "manage_billing"],
  space: ["create", "update", "delete", "manage_members"],
  post: ["create", "update", "delete", "pin", "lock"],
  comment: ["create", "update", "delete"],
  course: ["create", "update", "delete", "publish"],
  event: ["create", "update", "delete", "host"],
  member: ["invite", "remove", "ban", "change_role"],
} as const;

const ac = createAccessControl(statement);

const owner = ac.newRole({
  community: ["update", "delete", "manage_billing"],
  space: ["create", "update", "delete", "manage_members"],
  post: ["create", "update", "delete", "pin", "lock"],
  comment: ["create", "update", "delete"],
  course: ["create", "update", "delete", "publish"],
  event: ["create", "update", "delete", "host"],
  member: ["invite", "remove", "ban", "change_role"],
});

const admin = ac.newRole({
  space: ["create", "update", "delete", "manage_members"],
  post: ["create", "update", "delete", "pin", "lock"],
  comment: ["create", "update", "delete"],
  course: ["create", "update", "delete", "publish"],
  event: ["create", "update", "delete", "host"],
  member: ["invite", "remove", "ban", "change_role"],
});

const moderator = ac.newRole({
  post: ["create", "update", "delete", "pin", "lock"],
  comment: ["create", "update", "delete"],
  event: ["create", "host"],
  member: ["invite"],
});

const member = ac.newRole({
  post: ["create"],
  comment: ["create"],
});
```

### Permission Check Flow

```
1. Check BetterAuth community role (owner/admin bypasses space-level checks)
2. If not owner/admin, check spaceMemberships for the target space
3. Merge community role + space role for effective permissions
4. Plan-based gating: verify user's subscription plan includes the target space/course
```

### Content Gating: Plan → Space/Course Access

```
User subscribes to Plan → Plan grants access to Spaces + Courses
  via plan_space_access and plan_course_access tables

Subscription Plan  →  Grants space memberships  →  Roles have permissions
                   →  Grants course enrollments
```

When a user subscribes (Stripe webhook `checkout.session.completed`):
1. Create/update `memberships` record
2. Auto-create `spaceMemberships` for all spaces in the plan
3. Auto-create `enrollments` for all courses in the plan

---

## 5. Feed Architecture

### Design: Fan-Out on Read + Bump-on-Comment

Community platforms are space-scoped, not follower-scoped. Every Skool, Circle, Discourse, and Mighty Networks instance uses fan-out-on-read for feeds.

### Feed Query Patterns

**Single space feed (most common):**
```sql
SELECT p.*, u.name as author_name, u.image as author_image
FROM posts p
JOIN "user" u ON p.author_id = u.id
WHERE p.space_id = :space_id
  AND p.deleted_at IS NULL
ORDER BY p.is_pinned DESC, p.bumped_at DESC
LIMIT 20;
-- Cursor: WHERE (p.bumped_at, p.id) < (:last_bumped_at, :last_id)
```

**Cross-space feed (community home):**
```sql
SELECT p.*, u.name as author_name, s.name as space_name
FROM posts p
JOIN "user" u ON p.author_id = u.id
JOIN spaces s ON p.space_id = s.id
JOIN space_memberships sm ON p.space_id = sm.space_id
WHERE sm.user_id = :current_user_id
  AND p.community_id = :community_id
  AND p.deleted_at IS NULL
ORDER BY p.bumped_at DESC
LIMIT 20;
```

### Bump Mechanism

On new comment creation:
```sql
UPDATE posts SET
  bumped_at = NOW(),
  comment_count = comment_count + 1,
  updated_at = NOW()
WHERE id = :post_id;
```

On comment deletion:
```sql
UPDATE posts SET
  bumped_at = COALESCE(
    (SELECT MAX(created_at) FROM comments WHERE post_id = :post_id AND deleted_at IS NULL),
    posts.created_at
  ),
  comment_count = comment_count - 1,
  updated_at = NOW()
WHERE id = :post_id;
```

### Pagination: Cursor-Based (Not Offset)

Always use keyset pagination for consistent performance:
```sql
WHERE (bumped_at, id) < (:cursor_bumped_at, :cursor_id)
ORDER BY bumped_at DESC, id DESC
LIMIT 20
```

### Rich Text Storage

| Field | Type | Purpose |
|-------|------|---------|
| `content` | JSONB | Tiptap ProseMirror JSON (source of truth) |
| `content_html` | TEXT | Pre-rendered HTML (for fast reads, no runtime rendering) |
| `content_plaintext` | TEXT | Extracted plain text (for full-text search) |

Generate `content_html` and `content_plaintext` on write (server-side), not on read. Use Tiptap's server-side `generateHTML()` utility.

---

## 6. Scalability Notes

### Build Now (MVP)

| Concern | Solution |
|---------|----------|
| **Tenant isolation** | `community_id` on all tables + RLS policies |
| **Feed performance** | Composite indexes on `(space_id, bumped_at)`, denormalized counters |
| **Pagination** | Cursor-based from day one (never use OFFSET) |
| **N+1 prevention** | Drizzle `with` for eager loading; denormalized counts on posts |
| **Search** | PostgreSQL FTS with `pg_trgm` extension |
| **Notifications** | `notifications` table + SSE for real-time delivery |
| **File uploads** | S3-compatible presigned URLs (MinIO for self-host, S3/R2 for cloud) |
| **Caching** | Tenant context cached in-memory (middleware), aggressive HTTP caching |

### Defer to Growth Phase

| Concern | Solution | Trigger |
|---------|----------|---------|
| **External search** | Meilisearch for typo-tolerant, faceted search | When PG FTS UX becomes a growth blocker |
| **WebSockets** | For chat spaces and live event features | When chat/live features are built |
| **Table partitioning** | Hash partitioning on `community_id` | When largest tenant degrades shared performance |
| **Background jobs** | Queue system (BullMQ/Inngest) for email, webhooks, data sync | When sync processing causes request latency |
| **CDN** | CloudFront/Cloudflare for media and static assets | When media traffic grows significantly |

### Defer to Enterprise Phase

| Concern | Solution | Trigger |
|---------|----------|---------|
| **Tenant isolation upgrade** | Schema-per-tenant or DB-per-tenant for heavy tenants | Enterprise SLA requirements |
| **Real-time collaboration** | Y.js CRDT (Huly pattern) for collaborative editing | Collaborative course creation feature |
| **Advanced analytics** | Read replica + materialized views for reporting | When analytics queries impact production |
| **Elasticsearch** | Full-text search at massive scale | 10M+ searchable documents |

### Notification Architecture (SSE for MVP)

```
Write path:  Action → Insert notification row → Publish to SSE channel
Read path:   Client subscribes to SSE endpoint → Receives events in real-time
Fallback:    Polling every 30s for environments where SSE doesn't work
```

SSE is the pragmatic choice: server→client only (which is what notifications need), built-in auto-reconnect, works over standard HTTP, simpler than WebSockets.

### File/Media Architecture

```
Upload:   Client → Presigned PUT URL → Direct to S3 → Metadata to API
Download: Client → API generates signed GET URL → CDN → S3

S3 key format: {communityId}/{type}/{fileId}/{filename}
Buckets: public-assets (logos, avatars) | private-content (course media, uploads)
```

Never proxy file uploads through the application server. Use presigned URLs for both upload and download.

---

## 7. Lessons from Open Source

### Best Patterns to Adopt

| Pattern | Source | Why |
|---------|--------|-----|
| Trust levels + group permissions | Discourse | Scales moderation with community growth. TL3 users help moderate. |
| Article → Comment → Reaction model | Forem | Simple, proven content model for community feeds |
| Typed enrollments (Student, Instructor, TA) | Canvas LMS | Comprehensive role model for education contexts |
| Organization → Team → Membership | Cal.com | Clean multi-tenancy hierarchy for Next.js SaaS |
| Org → Project → Environment | Formbricks | Dev/prod isolation pattern (if needed later) |
| Env var toggles for self-host/SaaS | Formbricks, Cal.com | Same codebase, different deployment modes |
| Context-based role system | Moodle | Roles assigned at any level (system, category, course, activity) |
| Visibility scopes (private/shared/public) | Documenso | Clean content access pattern |

### What Went Wrong (Avoid These)

| Anti-Pattern | Source | Lesson |
|-------------|--------|--------|
| EAV for core data (`*_custom_fields`) | Discourse | Use JSONB columns instead — queryable, indexable, no JOINs |
| TEXT/MEMO for structured relationships | Moodle (`course_sections.sequence`) | Always use proper foreign keys and join tables |
| No FK enforcement in database | Moodle | Always enforce constraints at DB level, not just app level |
| Bolting on multi-tenancy after launch | Moodle, Forem | Build `community_id` into every table from day one |
| Starting with MongoDB for relational data | Huly (migrated to CockroachDB) | Start with PostgreSQL — it handles JSON, FTS, and relations |
| 200+ tables without documentation | Moodle | Keep schema lean; use JSONB for extensibility |
| 14 microservices at MVP | Huly | Start monolithic, extract services when bottlenecks emerge |
| Multi-tenancy as paid-only feature | Canvas LMS | Limits community adoption of open-source project |
| CDN as primary performance strategy | Forem | Optimize application layer first |
| Generic polymorphic associations | Forem (acts-as-taggable) | Be selective — prefer explicit tables for core relationships |

---

## 8. Anti-Patterns to Avoid

### Schema Anti-Patterns

1. **Never use MEMO/TEXT fields to store comma-separated IDs** — Moodle's `course_sections.sequence` caused years of complaints. Use proper join tables with foreign keys.

2. **Never skip foreign key enforcement at the database level** — Moodle relied on app-level enforcement and accumulated invalid data. Always declare and enforce FKs.

3. **Never use EAV (Entity-Attribute-Value) for core data** — Discourse's `*_custom_fields` pattern trades flexibility for terrible query performance at scale. Use JSONB columns for extensible data.

4. **Never use OFFSET-based pagination for feeds** — Performance degrades linearly with depth. Use cursor-based keyset pagination from day one.

5. **Never compute aggregate counts at query time for feeds** — Denormalize `comment_count`, `reaction_count` on posts. Update on write.

### Architecture Anti-Patterns

6. **Never bolt on multi-tenancy after launch** — Every team that tried (Moodle, Forem) regretted it. The `community_id` column must exist on every tenant-scoped table from the first migration.

7. **Never start with microservices** — Huly's 14-service architecture is an anti-pattern for an MVP. Start with a Next.js monolith. Extract services only when a specific bottleneck demands it.

8. **Never proxy file uploads through your server** — Use presigned URLs for direct client-to-S3 upload. Your server should never touch file bytes.

9. **Never make S3 buckets public** — Use signed URLs with short expiry for downloads. Separate buckets for public assets vs gated content.

10. **Never store files as BLOBs in PostgreSQL** — Use S3-compatible object storage from day one.

### Permission Anti-Patterns

11. **Never use a flat permission model** — Space-scoped roles are essential. A moderator in Space A must be independent from Space B (Mighty Networks pattern).

12. **Never gate content only at the UI level** — Always enforce access control at the API/database level. RLS provides defense-in-depth.

---

## Sources Consulted

### Official Documentation
- [BetterAuth Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [BetterAuth Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- [BetterAuth Database Docs](https://www.better-auth.com/docs/concepts/database)
- [BetterAuth Drizzle Adapter](https://www.better-auth.com/docs/adapters/drizzle)
- [Drizzle ORM Column Types](https://orm.drizzle.team/docs/column-types/pg)
- [Drizzle ORM + Nile Integration](https://orm.drizzle.team/docs/connect-nile)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js Multi-tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant)
- [Caddy On-Demand TLS](https://caddyserver.com/on-demand-tls)
- [Vercel for Platforms](https://vercel.com/docs/multi-tenant)
- [Matrix Spec v1.17](https://spec.matrix.org/v1.17/rooms/v12/)

### Open Source Schemas Analyzed
- [Discourse PostgreSQL Schema](https://github.com/prisma/database-schema-examples/blob/main/postgres/discourse/schema.sql)
- [Forem schema.rb](https://github.com/forem/forem/blob/main/db/schema.rb)
- [Canvas LMS Schema](https://github.com/prisma/database-schema-examples/blob/main/postgres/canvas-lms/schema.sql)
- [Moodle Schema Reference](https://moodleschema.zoola.io/)
- [Cal.com Prisma Schema](https://github.com/calcom/cal.com/blob/main/packages/prisma/schema.prisma)
- [Formbricks Database Model](https://formbricks.com/docs/development/technical-handbook/database-model)
- [Vercel nextjs-subscription-payments](https://github.com/vercel/nextjs-subscription-payments/blob/main/schema.sql)

### Engineering Blogs & Research
- [Crunchy Data - Multi-tenancy](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy)
- [Debugg.ai - Postgres Multitenancy Playbook 2025](https://debugg.ai/resources/postgres-multitenancy-rls-vs-schemas-vs-separate-dbs-performance-isolation-migration-playbook-2025)
- [AWS SaaS Factory PostgreSQL RLS](https://github.com/aws-samples/aws-saas-factory-postgresql-rls)
- [GetStream Feeds v3 Architecture](https://getstream.io/blog/feeds-v3-architecture/)
- [Tiptap Storage Discussion](https://github.com/ueberdosis/tiptap/discussions/964)
- [Drizzle ORM Multi-tenancy Discussion](https://github.com/drizzle-team/drizzle-orm/discussions/1539)
- [Oso - RBAC vs ABAC](https://www.osohq.com/learn/rbac-vs-abac)
- [Pedro Alonso - Stripe + Next.js 2025](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/)

### Platform Documentation
- [Skool Help Center - Member Roles](https://help.skool.com/article/74-member-roles)
- [Circle - Space Access](https://help.circle.so/c/space-groups-spaces/how-do-i-control-space-access)
- [Mighty Networks - Host Permissions](https://faq.mightynetworks.com/en/articles/9140740)
- [Forem User Roles](https://admin.forem.com/docs/forem-basics/user-roles)
- [Discourse Groups & Category Permissions](https://meta.discourse.org/t/understanding-groups-and-category-permissions-security-settings/87678)
