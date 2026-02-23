CREATE TYPE "access_level" AS ENUM('public', 'private', 'secret');--> statement-breakpoint
CREATE TYPE "domain_type" AS ENUM('subdomain', 'custom');--> statement-breakpoint
CREATE TYPE "drip_type" AS ENUM('none', 'days_after_enrollment', 'after_previous_module');--> statement-breakpoint
CREATE TYPE "enrollment_status" AS ENUM('active', 'completed', 'cancelled', 'paused');--> statement-breakpoint
CREATE TYPE "lesson_type" AS ENUM('video', 'text', 'quiz', 'assignment', 'embed');--> statement-breakpoint
CREATE TYPE "notification_type" AS ENUM('comment_on_post', 'reply_to_comment', 'reaction', 'mention', 'new_post_in_space', 'course_update', 'enrollment', 'system');--> statement-breakpoint
CREATE TYPE "post_type" AS ENUM('discussion', 'announcement', 'course_update', 'introduction', 'poll');--> statement-breakpoint
CREATE TYPE "progress_status" AS ENUM('not_started', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "space_type" AS ENUM('discussion', 'chat', 'course', 'event', 'members', 'gallery');--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"post_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"parent_comment_id" uuid,
	"content" jsonb NOT NULL,
	"content_html" text,
	"reaction_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "community_settings" (
	"community_id" text PRIMARY KEY,
	"description" text,
	"theme" jsonb DEFAULT '{"primaryColor":"#3B82F6","accentColor":"#8B5CF6","backgroundColor":"#FFFFFF","textColor":"#111827","fontFamily":"Inter","borderRadius":"8px","logoUrl":null,"faviconUrl":null}',
	"features" jsonb DEFAULT '{"coursesEnabled":true,"eventsEnabled":true,"gamificationEnabled":false,"chatEnabled":false}',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "community_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"community_id" text NOT NULL,
	"space_id" uuid,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"cover_image_url" text,
	"published" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "courses_community_id_slug_unique" UNIQUE("community_id","slug")
);
--> statement-breakpoint
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customers" (
	"user_id" text PRIMARY KEY,
	"stripe_customer_id" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"community_id" text NOT NULL,
	"domain" text NOT NULL UNIQUE,
	"domain_type" "domain_type" NOT NULL,
	"verified" boolean DEFAULT false,
	"ssl_status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "domains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"course_id" uuid NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"status" "enrollment_status" DEFAULT 'active'::"enrollment_status" NOT NULL,
	"enrolled_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "enrollments_user_id_course_id_unique" UNIQUE("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "leaderboard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"community_id" text NOT NULL,
	"total_points" integer DEFAULT 0,
	"rank" integer,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "leaderboard_user_id_community_id_unique" UNIQUE("user_id","community_id")
);
--> statement-breakpoint
ALTER TABLE "leaderboard" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"status" "progress_status" DEFAULT 'not_started'::"progress_status" NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "lesson_progress_user_id_lesson_id_unique" UNIQUE("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "lesson_type" DEFAULT 'text'::"lesson_type" NOT NULL,
	"content" jsonb,
	"content_html" text,
	"config" jsonb,
	"sort_order" integer DEFAULT 0,
	"is_free_preview" boolean DEFAULT false,
	"estimated_minutes" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"community_id" text NOT NULL,
	"uploader_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"storage_bucket" text NOT NULL,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"community_id" text NOT NULL,
	"plan_id" uuid,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "memberships_user_id_community_id_unique" UNIQUE("user_id","community_id")
);
--> statement-breakpoint
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"drip_type" "drip_type" DEFAULT 'none'::"drip_type" NOT NULL,
	"drip_days" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"community_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"actor_id" text,
	"target_id" uuid,
	"target_type" text,
	"title" text NOT NULL,
	"body" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY,
	"name" text,
	"slug" text,
	"logo" text,
	"metadata" text,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "plan_course_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plan_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	CONSTRAINT "plan_course_access_plan_id_course_id_unique" UNIQUE("plan_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "plan_space_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plan_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"access_level" text DEFAULT 'member' NOT NULL,
	CONSTRAINT "plan_space_access_plan_id_space_id_unique" UNIQUE("plan_id","space_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"community_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"stripe_product_id" text,
	"features" jsonb DEFAULT '{}',
	"is_default" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"community_id" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"source_id" uuid,
	"source_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "points" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"community_id" text NOT NULL,
	"space_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"type" "post_type" DEFAULT 'discussion'::"post_type" NOT NULL,
	"title" text,
	"content" jsonb NOT NULL,
	"content_html" text,
	"content_plaintext" text,
	"metadata" jsonb,
	"is_pinned" boolean DEFAULT false,
	"is_locked" boolean DEFAULT false,
	"comment_count" integer DEFAULT 0,
	"reaction_count" integer DEFAULT 0,
	"bumped_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "prices" (
	"id" text PRIMARY KEY,
	"product_id" text NOT NULL,
	"active" boolean DEFAULT true,
	"unit_amount" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"type" text NOT NULL,
	"interval" text,
	"interval_count" integer,
	"trial_period_days" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY,
	"active" boolean DEFAULT true,
	"name" text NOT NULL,
	"description" text,
	"image" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"reactable_id" uuid NOT NULL,
	"reactable_type" text NOT NULL,
	"type" text DEFAULT 'like' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "reactions_user_id_reactable_id_reactable_type_unique" UNIQUE("user_id","reactable_id","reactable_type")
);
--> statement-breakpoint
CREATE TABLE "space_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"community_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "space_groups_community_id_slug_unique" UNIQUE("community_id","slug")
);
--> statement-breakpoint
ALTER TABLE "space_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "space_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"space_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "space_memberships_user_id_space_id_unique" UNIQUE("user_id","space_id")
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"community_id" text NOT NULL,
	"space_group_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"type" "space_type" DEFAULT 'discussion'::"space_type" NOT NULL,
	"access_level" "access_level" DEFAULT 'public'::"access_level" NOT NULL,
	"settings" jsonb DEFAULT '{"allowMemberPosts":true,"allowComments":true,"requireApproval":false}',
	"sort_order" integer DEFAULT 0,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "spaces_community_id_slug_unique" UNIQUE("community_id","slug")
);
--> statement-breakpoint
ALTER TABLE "spaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"price_id" text NOT NULL,
	"status" text NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"canceled_at" timestamp,
	"ended_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text,
	"email" text,
	"image" text,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "idx_comments_post" ON "comments" ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_comments_author" ON "comments" ("author_id");--> statement-breakpoint
CREATE INDEX "idx_courses_community" ON "courses" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_domains_community" ON "domains" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_user" ON "enrollments" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_course" ON "enrollments" ("course_id");--> statement-breakpoint
CREATE INDEX "idx_leaderboard_rank" ON "leaderboard" ("community_id","total_points");--> statement-breakpoint
CREATE INDEX "idx_lesson_progress_user" ON "lesson_progress" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_lessons_module" ON "lessons" ("module_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_media_community" ON "media" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_media_uploader" ON "media" ("uploader_id");--> statement-breakpoint
CREATE INDEX "idx_memberships_community" ON "memberships" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_modules_course" ON "modules" ("course_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" ("user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_community" ON "notifications" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_plans_community" ON "plans" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_points_user_community" ON "points" ("user_id","community_id");--> statement-breakpoint
CREATE INDEX "idx_posts_feed" ON "posts" ("space_id","bumped_at");--> statement-breakpoint
CREATE INDEX "idx_posts_community_feed" ON "posts" ("community_id","bumped_at");--> statement-breakpoint
CREATE INDEX "idx_posts_author" ON "posts" ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_reactions_target" ON "reactions" ("reactable_type","reactable_id");--> statement-breakpoint
CREATE INDEX "idx_space_groups_community" ON "space_groups" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_space_memberships_user" ON "space_memberships" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_space_memberships_space" ON "space_memberships" ("space_id");--> statement-breakpoint
CREATE INDEX "idx_spaces_community" ON "spaces" ("community_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_user" ON "subscriptions" ("user_id");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_comments_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id");--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id");--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plan_course_access" ADD CONSTRAINT "plan_course_access_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plan_course_access" ADD CONSTRAINT "plan_course_access_course_id_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plan_space_access" ADD CONSTRAINT "plan_space_access_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plan_space_access" ADD CONSTRAINT "plan_space_access_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_stripe_product_id_products_id_fkey" FOREIGN KEY ("stripe_product_id") REFERENCES "products"("id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "space_memberships" ADD CONSTRAINT "space_memberships_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_space_group_id_space_groups_id_fkey" FOREIGN KEY ("space_group_id") REFERENCES "space_groups"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_price_id_prices_id_fkey" FOREIGN KEY ("price_id") REFERENCES "prices"("id");--> statement-breakpoint
CREATE POLICY "community_settings_tenant_isolation" ON "community_settings" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));--> statement-breakpoint
CREATE POLICY "courses_tenant_isolation" ON "courses" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));--> statement-breakpoint
CREATE POLICY "domains_tenant_isolation" ON "domains" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));--> statement-breakpoint
CREATE POLICY "leaderboard_tenant_isolation" ON "leaderboard" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));--> statement-breakpoint
CREATE POLICY "media_tenant_isolation" ON "media" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));--> statement-breakpoint
CREATE POLICY "memberships_tenant_isolation" ON "memberships" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));--> statement-breakpoint
CREATE POLICY "notifications_tenant_isolation" ON "notifications" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));--> statement-breakpoint
CREATE POLICY "plans_tenant_isolation" ON "plans" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));--> statement-breakpoint
CREATE POLICY "points_tenant_isolation" ON "points" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));--> statement-breakpoint
CREATE POLICY "posts_tenant_isolation" ON "posts" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));--> statement-breakpoint
CREATE POLICY "space_groups_tenant_isolation" ON "space_groups" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));--> statement-breakpoint
CREATE POLICY "spaces_tenant_isolation" ON "spaces" AS PERMISSIVE FOR ALL TO "app_user" USING (community_id = (SELECT current_setting('app.current_tenant_id', true))) WITH CHECK (community_id = (SELECT current_setting('app.current_tenant_id', true)));