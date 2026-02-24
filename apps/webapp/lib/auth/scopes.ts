import { type PermissionAction, PERMISSION_ACTIONS } from "./permissions";

// API key scopes — stored in apikey.metadata.scopes as space-delimited string
export const SCOPES = [
  "community.read",
  "community.write",
  "space.read",
  "space.write",
  "post.read",
  "post.write",
  "comment.read",
  "comment.write",
  "course.read",
  "course.write",
  "member.read",
  "member.write",
  "apis.all",
  "apis.read",
] as const;

export type Scope = (typeof SCOPES)[number];

// Read actions per resource
const READ_ACTIONS: Record<string, PermissionAction[]> = {
  community: [],  // no read actions defined in statement (community has update/delete/manage_billing)
  space: [],
  post: [],
  comment: [],
  course: [],
  member: [],
};

// Write actions per resource (includes all mutating actions)
const WRITE_ACTIONS: Record<string, PermissionAction[]> = {
  community: ["community.update", "community.delete", "community.manage_billing"],
  space: ["space.create", "space.update", "space.delete", "space.manage_members"],
  post: ["post.create", "post.update", "post.delete", "post.pin", "post.lock"],
  comment: ["comment.create", "comment.update", "comment.delete"],
  course: ["course.create", "course.update", "course.delete", "course.publish"],
  member: ["member.invite", "member.remove", "member.ban", "member.change_role", "member.create", "member.update", "member.delete"],
};

// Scope → PermissionAction[] mapping
// Write scopes imply read (Dub pattern)
export const SCOPE_PERMISSION_MAP: Record<Scope, PermissionAction[]> = {
  "community.read": READ_ACTIONS.community ?? [],
  "community.write": [...(READ_ACTIONS.community ?? []), ...(WRITE_ACTIONS.community ?? [])],
  "space.read": READ_ACTIONS.space ?? [],
  "space.write": [...(READ_ACTIONS.space ?? []), ...(WRITE_ACTIONS.space ?? [])],
  "post.read": READ_ACTIONS.post ?? [],
  "post.write": [...(READ_ACTIONS.post ?? []), ...(WRITE_ACTIONS.post ?? [])],
  "comment.read": READ_ACTIONS.comment ?? [],
  "comment.write": [...(READ_ACTIONS.comment ?? []), ...(WRITE_ACTIONS.comment ?? [])],
  "course.read": READ_ACTIONS.course ?? [],
  "course.write": [...(READ_ACTIONS.course ?? []), ...(WRITE_ACTIONS.course ?? [])],
  "member.read": READ_ACTIONS.member ?? [],
  "member.write": [...(READ_ACTIONS.member ?? []), ...(WRITE_ACTIONS.member ?? [])],
  "apis.all": PERMISSION_ACTIONS.slice(),
  "apis.read": Object.values(READ_ACTIONS).flat(),
};

/**
 * Map an array of Scope values to deduplicated PermissionAction[].
 * Used in withCommunity to intersect API key scopes with role permissions.
 */
export function mapScopesToPermissions(scopes: Scope[]): PermissionAction[] {
  const permissionSet = new Set<PermissionAction>();
  for (const scope of scopes) {
    const actions = SCOPE_PERMISSION_MAP[scope];
    if (actions) {
      for (const action of actions) {
        permissionSet.add(action);
      }
    }
  }
  return [...permissionSet];
}

/**
 * Parse scopes from API key metadata.
 * BetterAuth stores metadata as JSON; scopes are a space-delimited string
 * in metadata.scopes (e.g., "post.read post.write").
 * Returns null if no scopes found (key has full role permissions).
 */
export function parseScopesFromMetadata(metadata: unknown): Scope[] | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).scopes;
  if (typeof raw !== "string" || raw.trim() === "") return null;

  const validScopes = new Set<string>(SCOPES);
  const parsed = raw
    .split(" ")
    .filter((s) => validScopes.has(s)) as Scope[];

  return parsed.length > 0 ? parsed : null;
}
