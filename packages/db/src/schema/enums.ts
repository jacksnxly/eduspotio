import { pgEnum } from "drizzle-orm/pg-core";

export const postTypeEnum = pgEnum("post_type", [
  "discussion",
  "announcement",
  "course_update",
  "introduction",
  "poll",
]);

export const spaceTypeEnum = pgEnum("space_type", [
  "discussion",
  "chat",
  "course",
  "event",
  "members",
  "gallery",
]);

export const accessLevelEnum = pgEnum("access_level", [
  "public",
  "private",
  "secret",
]);

export const lessonTypeEnum = pgEnum("lesson_type", [
  "video",
  "text",
  "quiz",
  "assignment",
  "embed",
]);

export const progressStatusEnum = pgEnum("progress_status", [
  "not_started",
  "in_progress",
  "completed",
  "failed",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "active",
  "completed",
  "cancelled",
  "paused",
]);

export const dripTypeEnum = pgEnum("drip_type", [
  "none",
  "days_after_enrollment",
  "after_previous_module",
]);

export const domainTypeEnum = pgEnum("domain_type", ["subdomain", "custom"]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "comment_on_post",
  "reply_to_comment",
  "reaction",
  "mention",
  "new_post_in_space",
  "course_update",
  "enrollment",
  "system",
]);
