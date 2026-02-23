import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  // Auth
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
    members: r.many.member(),
    posts: r.many.posts(),
    // comments and reactions omitted: self-referential comments table
    // causes Drizzle v2 type error in many-chain. Access via posts.comments.
    spaceMemberships: r.many.spaceMemberships(),
    enrollments: r.many.enrollments(),
    lessonProgress: r.many.lessonProgress(),
    notifications: r.many.notifications(),
    points: r.many.points(),
  },

  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
      optional: false,
    }),
  },

  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
      optional: false,
    }),
  },

  member: {
    organization: r.one.organization({
      from: r.member.organizationId,
      to: r.organization.id,
      optional: false,
    }),
    user: r.one.user({
      from: r.member.userId,
      to: r.user.id,
      optional: false,
    }),
  },

  invitation: {
    organization: r.one.organization({
      from: r.invitation.organizationId,
      to: r.organization.id,
      optional: false,
    }),
    inviter: r.one.user({
      from: r.invitation.inviterId,
      to: r.user.id,
      optional: false,
    }),
  },

  organization: {
    communitySettings: r.one.communitySettings({
      from: r.organization.id,
      to: r.communitySettings.communityId,
      optional: true,
    }),
    members: r.many.member(),
    invitations: r.many.invitation(),
    domains: r.many.domains(),
    spaceGroups: r.many.spaceGroups(),
    spaces: r.many.spaces(),
    courses: r.many.courses(),
    plans: r.many.plans(),
    memberships: r.many.memberships({
      from: r.organization.id,
      to: r.memberships.communityId,
    }),
    notifications: r.many.notifications(),
    media: r.many.media(),
    points: r.many.points(),
    leaderboard: r.many.leaderboard(),
  },

  // Community
  communitySettings: {
    organization: r.one.organization({
      from: r.communitySettings.communityId,
      to: r.organization.id,
      optional: false,
    }),
  },

  domains: {
    organization: r.one.organization({
      from: r.domains.communityId,
      to: r.organization.id,
      optional: false,
    }),
  },

  // Spaces
  spaceGroups: {
    organization: r.one.organization({
      from: r.spaceGroups.communityId,
      to: r.organization.id,
      optional: false,
    }),
    spaces: r.many.spaces(),
  },

  spaces: {
    organization: r.one.organization({
      from: r.spaces.communityId,
      to: r.organization.id,
      optional: false,
    }),
    spaceGroup: r.one.spaceGroups({
      from: r.spaces.spaceGroupId,
      to: r.spaceGroups.id,
      optional: true,
    }),
    posts: r.many.posts(),
    spaceMemberships: r.many.spaceMemberships(),
    courses: r.many.courses(),
    planSpaceAccess: r.many.planSpaceAccess(),
  },

  spaceMemberships: {
    user: r.one.user({
      from: r.spaceMemberships.userId,
      to: r.user.id,
      optional: false,
    }),
    space: r.one.spaces({
      from: r.spaceMemberships.spaceId,
      to: r.spaces.id,
      optional: false,
    }),
  },

  // Content
  posts: {
    author: r.one.user({
      from: r.posts.authorId,
      to: r.user.id,
      optional: false,
    }),
    space: r.one.spaces({
      from: r.posts.spaceId,
      to: r.spaces.id,
      optional: false,
    }),
    // @ts-expect-error — Drizzle v2 type limitation: self-referencing comments table
    comments: r.many.comments(),
    // reactions omitted: uses polymorphic pattern (reactableId + reactableType),
    // no direct FK to posts — query reactions separately with a where clause
  },

  // Drizzle v2 type limitation: self-referencing table (parent/replies) poisons
  // the entire comments type. All r.comments.* accesses need @ts-expect-error.
  // prettier-ignore
  comments: {
    // @ts-expect-error — Drizzle v2 self-referencing table type issue
    post: r.one.posts({ from: r.comments.postId, to: r.posts.id, optional: false }),
    // @ts-expect-error — Drizzle v2 self-referencing table type issue
    author: r.one.user({ from: r.comments.authorId, to: r.user.id, optional: false }),
    // @ts-expect-error — Drizzle v2 self-referencing table type issue
    parent: r.one.comments({ from: r.comments.parentCommentId, to: r.comments.id, optional: true, alias: "parentComment" }),
    // @ts-expect-error — Drizzle v2 self-referencing table type issue
    replies: r.many.comments({ alias: "parentComment" }),
  },

  reactions: {
    user: r.one.user({
      from: r.reactions.userId,
      to: r.user.id,
      optional: false,
    }),
  },

  // Courses
  courses: {
    organization: r.one.organization({
      from: r.courses.communityId,
      to: r.organization.id,
      optional: false,
    }),
    space: r.one.spaces({
      from: r.courses.spaceId,
      to: r.spaces.id,
      optional: true,
    }),
    author: r.one.user({
      from: r.courses.authorId,
      to: r.user.id,
      optional: false,
    }),
    modules: r.many.modules(),
    enrollments: r.many.enrollments(),
    planCourseAccess: r.many.planCourseAccess(),
  },

  modules: {
    course: r.one.courses({
      from: r.modules.courseId,
      to: r.courses.id,
      optional: false,
    }),
    lessons: r.many.lessons(),
  },

  lessons: {
    module: r.one.modules({
      from: r.lessons.moduleId,
      to: r.modules.id,
      optional: false,
    }),
    lessonProgress: r.many.lessonProgress(),
  },

  enrollments: {
    user: r.one.user({
      from: r.enrollments.userId,
      to: r.user.id,
      optional: false,
    }),
    course: r.one.courses({
      from: r.enrollments.courseId,
      to: r.courses.id,
      optional: false,
    }),
  },

  lessonProgress: {
    user: r.one.user({
      from: r.lessonProgress.userId,
      to: r.user.id,
      optional: false,
    }),
    lesson: r.one.lessons({
      from: r.lessonProgress.lessonId,
      to: r.lessons.id,
      optional: false,
    }),
  },

  // Billing
  customers: {
    user: r.one.user({
      from: r.customers.userId,
      to: r.user.id,
      optional: false,
    }),
  },

  products: {
    prices: r.many.prices(),
    plans: r.many.plans(),
  },

  prices: {
    product: r.one.products({
      from: r.prices.productId,
      to: r.products.id,
      optional: false,
    }),
    subscriptions: r.many.subscriptions(),
  },

  subscriptions: {
    price: r.one.prices({
      from: r.subscriptions.priceId,
      to: r.prices.id,
      optional: false,
    }),
  },

  plans: {
    organization: r.one.organization({
      from: r.plans.communityId,
      to: r.organization.id,
      optional: false,
    }),
    product: r.one.products({
      from: r.plans.stripeProductId,
      to: r.products.id,
      optional: true,
    }),
    planSpaceAccess: r.many.planSpaceAccess(),
    planCourseAccess: r.many.planCourseAccess(),
    memberships: r.many.memberships(),
  },

  planSpaceAccess: {
    plan: r.one.plans({
      from: r.planSpaceAccess.planId,
      to: r.plans.id,
      optional: false,
    }),
    space: r.one.spaces({
      from: r.planSpaceAccess.spaceId,
      to: r.spaces.id,
      optional: false,
    }),
  },

  planCourseAccess: {
    plan: r.one.plans({
      from: r.planCourseAccess.planId,
      to: r.plans.id,
      optional: false,
    }),
    course: r.one.courses({
      from: r.planCourseAccess.courseId,
      to: r.courses.id,
      optional: false,
    }),
  },

  memberships: {
    organization: r.one.organization({
      from: r.memberships.communityId,
      to: r.organization.id,
      optional: false,
    }),
    plan: r.one.plans({
      from: r.memberships.planId,
      to: r.plans.id,
      optional: true,
    }),
  },

  // Notifications
  notifications: {
    user: r.one.user({
      from: r.notifications.userId,
      to: r.user.id,
      optional: false,
    }),
    actor: r.one.user({
      from: r.notifications.actorId,
      to: r.user.id,
      optional: true,
      alias: "notificationActor",
    }),
    organization: r.one.organization({
      from: r.notifications.communityId,
      to: r.organization.id,
      optional: false,
    }),
  },

  // Media
  media: {
    uploader: r.one.user({
      from: r.media.uploaderId,
      to: r.user.id,
      optional: false,
    }),
    organization: r.one.organization({
      from: r.media.communityId,
      to: r.organization.id,
      optional: false,
    }),
  },

  // Gamification
  points: {
    user: r.one.user({
      from: r.points.userId,
      to: r.user.id,
      optional: false,
    }),
    organization: r.one.organization({
      from: r.points.communityId,
      to: r.organization.id,
      optional: false,
    }),
  },

  leaderboard: {
    user: r.one.user({
      from: r.leaderboard.userId,
      to: r.user.id,
      optional: false,
    }),
    organization: r.one.organization({
      from: r.leaderboard.communityId,
      to: r.organization.id,
      optional: false,
    }),
  },
}));
