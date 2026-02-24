import { logger } from "@/lib/axiom";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

export const statement = {
  // BetterAuth org plugin built-in resources (required for invite, remove, etc.)
  ...defaultStatements,
  // Override `member` to include both BetterAuth's actions and app-specific actions
  member: [
    ...defaultStatements.member,
    "invite",
    "remove",
    "ban",
    "change_role",
  ],
  // App-specific resources
  community: ["update", "delete", "manage_billing"],
  space: ["create", "update", "delete", "manage_members"],
  post: ["create", "update", "delete", "pin", "lock"],
  comment: ["create", "update", "delete"],
  course: ["create", "update", "delete", "publish"],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  owner: ac.newRole({
    organization: ["update", "delete"],
    member: [
      "create",
      "update",
      "delete",
      "invite",
      "remove",
      "ban",
      "change_role",
    ],
    invitation: ["create", "cancel"],
    team: ["create", "update", "delete"],
    ac: ["create", "read", "update", "delete"],
    community: ["update", "delete", "manage_billing"],
    space: ["create", "update", "delete", "manage_members"],
    post: ["create", "update", "delete", "pin", "lock"],
    comment: ["create", "update", "delete"],
    course: ["create", "update", "delete", "publish"],
  }),
  moderator: ac.newRole({
    member: ["create", "update", "delete", "invite", "remove"],
    invitation: ["create", "cancel"],
    space: ["create", "update", "manage_members"],
    post: ["create", "update", "delete", "pin", "lock"],
    comment: ["create", "update", "delete"],
    course: ["create", "update"],
  }),
  creator: ac.newRole({
    post: ["create", "update"],
    comment: ["create", "update"],
    course: ["create", "update", "publish"],
  }),
  member: ac.newRole({
    ac: ["read"],
    post: ["create"],
    comment: ["create"],
  }),
};

export type Role = keyof typeof roles;

export type PermissionRequest = Parameters<
  (typeof roles)[Role]["authorize"]
>[0];

export function hasPermission(role: Role, request: PermissionRequest): boolean {
  const roleDefinition = roles[role];
  if (!roleDefinition) {
    logger.error("Unknown role — possible data corruption", { role });
    throw new Error(`Unknown role: ${role}`);
  }
  const result = (
    roleDefinition.authorize as (req: PermissionRequest) => { success: boolean }
  )(request);
  return result.success;
}

// --- Flat permission derivation for scope intersection ---

// Derive flat "resource.action" permission strings from app-specific statement resources
// Only include our app resources (community, space, post, comment, course, member)
// Not BetterAuth internals (organization, invitation, team, ac)
const APP_RESOURCES = ["community", "space", "post", "comment", "course", "member"] as const;
type AppResource = (typeof APP_RESOURCES)[number];

export type PermissionAction = `${AppResource}.${string}`;

export const PERMISSION_ACTIONS: PermissionAction[] = APP_RESOURCES.flatMap((resource) => {
  const actions = statement[resource] as readonly string[];
  return actions.map((action) => `${resource}.${action}` as PermissionAction);
});

// Role → flat PermissionAction[] mapping
// Derived from the role definitions above, only including app resources
export const ROLE_PERMISSIONS: Record<Role, PermissionAction[]> = {
  owner: PERMISSION_ACTIONS.slice(), // owner gets all app permissions
  moderator: [
    "space.create", "space.update", "space.manage_members",
    "post.create", "post.update", "post.delete", "post.pin", "post.lock",
    "comment.create", "comment.update", "comment.delete",
    "course.create", "course.update",
    "member.invite", "member.remove",
    // include defaultStatements.member actions that moderator has
    "member.create", "member.update", "member.delete",
  ],
  creator: [
    "post.create", "post.update",
    "comment.create", "comment.update",
    "course.create", "course.update", "course.publish",
  ],
  member: [
    "post.create",
    "comment.create",
  ],
};

export function getPermissionsByRole(role: Role): PermissionAction[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
