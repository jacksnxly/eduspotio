import { roles, type Role } from "../../lib/auth/permissions";

/**
 * Full permission matrix for the 4 RBAC roles.
 * Tests the `roles` object directly via `authorize()` — no HTTP requests.
 *
 * Resources:
 *   BetterAuth built-in: organization, member, invitation, team, ac
 *   App-specific: community, space, post, comment, course
 * Roles (descending privilege): owner > moderator > creator > member
 */

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function hasPermission(
  role: Role,
  resource: string,
  actions: string[],
): boolean {
  const authorize = roles[role].authorize as (
    req: Record<string, string[]>,
  ) => { success: boolean; error?: string };
  const result = authorize({ [resource]: actions });
  return result.success;
}

// ---------------------------------------------------------------------------
// Role-specific tests
// ---------------------------------------------------------------------------

describe("RBAC Permission Matrix", () => {
  // -----------------------------------------------------------------------
  // Owner — full access to every resource
  // -----------------------------------------------------------------------
  describe("owner role", () => {
    const role: Role = "owner";

    test("has all organization permissions", () => {
      expect(hasPermission(role, "organization", ["update"])).toBe(true);
      expect(hasPermission(role, "organization", ["delete"])).toBe(true);
    });

    test("has all member permissions (built-in + app)", () => {
      expect(hasPermission(role, "member", ["create"])).toBe(true);
      expect(hasPermission(role, "member", ["update"])).toBe(true);
      expect(hasPermission(role, "member", ["delete"])).toBe(true);
      expect(hasPermission(role, "member", ["invite"])).toBe(true);
      expect(hasPermission(role, "member", ["remove"])).toBe(true);
      expect(hasPermission(role, "member", ["ban"])).toBe(true);
      expect(hasPermission(role, "member", ["change_role"])).toBe(true);
    });

    test("has all invitation permissions", () => {
      expect(hasPermission(role, "invitation", ["create"])).toBe(true);
      expect(hasPermission(role, "invitation", ["cancel"])).toBe(true);
    });

    test("has all team permissions", () => {
      expect(hasPermission(role, "team", ["create"])).toBe(true);
      expect(hasPermission(role, "team", ["update"])).toBe(true);
      expect(hasPermission(role, "team", ["delete"])).toBe(true);
    });

    test("has all ac permissions", () => {
      expect(hasPermission(role, "ac", ["create"])).toBe(true);
      expect(hasPermission(role, "ac", ["read"])).toBe(true);
      expect(hasPermission(role, "ac", ["update"])).toBe(true);
      expect(hasPermission(role, "ac", ["delete"])).toBe(true);
    });

    test("has all community permissions", () => {
      expect(hasPermission(role, "community", ["update"])).toBe(true);
      expect(hasPermission(role, "community", ["delete"])).toBe(true);
      expect(hasPermission(role, "community", ["manage_billing"])).toBe(true);
    });

    test("has all space permissions", () => {
      expect(hasPermission(role, "space", ["create"])).toBe(true);
      expect(hasPermission(role, "space", ["update"])).toBe(true);
      expect(hasPermission(role, "space", ["delete"])).toBe(true);
      expect(hasPermission(role, "space", ["manage_members"])).toBe(true);
    });

    test("has all post permissions", () => {
      expect(hasPermission(role, "post", ["create"])).toBe(true);
      expect(hasPermission(role, "post", ["update"])).toBe(true);
      expect(hasPermission(role, "post", ["delete"])).toBe(true);
      expect(hasPermission(role, "post", ["pin"])).toBe(true);
      expect(hasPermission(role, "post", ["lock"])).toBe(true);
    });

    test("has all comment permissions", () => {
      expect(hasPermission(role, "comment", ["create"])).toBe(true);
      expect(hasPermission(role, "comment", ["update"])).toBe(true);
      expect(hasPermission(role, "comment", ["delete"])).toBe(true);
    });

    test("has all course permissions", () => {
      expect(hasPermission(role, "course", ["create"])).toBe(true);
      expect(hasPermission(role, "course", ["update"])).toBe(true);
      expect(hasPermission(role, "course", ["delete"])).toBe(true);
      expect(hasPermission(role, "course", ["publish"])).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Moderator — operational + moderation powers, no community-level admin
  // -----------------------------------------------------------------------
  describe("moderator role", () => {
    const role: Role = "moderator";

    test("does NOT have any organization permissions", () => {
      expect(hasPermission(role, "organization", ["update"])).toBe(false);
      expect(hasPermission(role, "organization", ["delete"])).toBe(false);
    });

    test("has member management permissions", () => {
      expect(hasPermission(role, "member", ["create"])).toBe(true);
      expect(hasPermission(role, "member", ["update"])).toBe(true);
      expect(hasPermission(role, "member", ["delete"])).toBe(true);
      expect(hasPermission(role, "member", ["invite"])).toBe(true);
      expect(hasPermission(role, "member", ["remove"])).toBe(true);
    });

    test("cannot ban members or change roles", () => {
      expect(hasPermission(role, "member", ["ban"])).toBe(false);
      expect(hasPermission(role, "member", ["change_role"])).toBe(false);
    });

    test("has invitation permissions", () => {
      expect(hasPermission(role, "invitation", ["create"])).toBe(true);
      expect(hasPermission(role, "invitation", ["cancel"])).toBe(true);
    });

    test("does NOT have any community permissions", () => {
      expect(hasPermission(role, "community", ["update"])).toBe(false);
      expect(hasPermission(role, "community", ["delete"])).toBe(false);
      expect(hasPermission(role, "community", ["manage_billing"])).toBe(false);
    });

    test("can create, update, and manage_members in spaces", () => {
      expect(hasPermission(role, "space", ["create"])).toBe(true);
      expect(hasPermission(role, "space", ["update"])).toBe(true);
      expect(hasPermission(role, "space", ["manage_members"])).toBe(true);
    });

    test("cannot delete spaces", () => {
      expect(hasPermission(role, "space", ["delete"])).toBe(false);
    });

    test("has all post permissions", () => {
      expect(hasPermission(role, "post", ["create"])).toBe(true);
      expect(hasPermission(role, "post", ["update"])).toBe(true);
      expect(hasPermission(role, "post", ["delete"])).toBe(true);
      expect(hasPermission(role, "post", ["pin"])).toBe(true);
      expect(hasPermission(role, "post", ["lock"])).toBe(true);
    });

    test("has all comment permissions", () => {
      expect(hasPermission(role, "comment", ["create"])).toBe(true);
      expect(hasPermission(role, "comment", ["update"])).toBe(true);
      expect(hasPermission(role, "comment", ["delete"])).toBe(true);
    });

    test("can create and update courses", () => {
      expect(hasPermission(role, "course", ["create"])).toBe(true);
      expect(hasPermission(role, "course", ["update"])).toBe(true);
    });

    test("cannot delete or publish courses", () => {
      expect(hasPermission(role, "course", ["delete"])).toBe(false);
      expect(hasPermission(role, "course", ["publish"])).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Creator — content-focused, no moderation or admin capabilities
  // -----------------------------------------------------------------------
  describe("creator role", () => {
    const role: Role = "creator";

    test("does NOT have any organization permissions", () => {
      expect(hasPermission(role, "organization", ["update"])).toBe(false);
      expect(hasPermission(role, "organization", ["delete"])).toBe(false);
    });

    test("does NOT have any member permissions", () => {
      expect(hasPermission(role, "member", ["create"])).toBe(false);
      expect(hasPermission(role, "member", ["invite"])).toBe(false);
      expect(hasPermission(role, "member", ["remove"])).toBe(false);
    });

    test("does NOT have invitation permissions", () => {
      expect(hasPermission(role, "invitation", ["create"])).toBe(false);
      expect(hasPermission(role, "invitation", ["cancel"])).toBe(false);
    });

    test("does NOT have any community permissions", () => {
      expect(hasPermission(role, "community", ["update"])).toBe(false);
      expect(hasPermission(role, "community", ["delete"])).toBe(false);
      expect(hasPermission(role, "community", ["manage_billing"])).toBe(false);
    });

    test("does NOT have any space permissions", () => {
      expect(hasPermission(role, "space", ["create"])).toBe(false);
      expect(hasPermission(role, "space", ["update"])).toBe(false);
      expect(hasPermission(role, "space", ["delete"])).toBe(false);
      expect(hasPermission(role, "space", ["manage_members"])).toBe(false);
    });

    test("can create and update posts", () => {
      expect(hasPermission(role, "post", ["create"])).toBe(true);
      expect(hasPermission(role, "post", ["update"])).toBe(true);
    });

    test("cannot delete, pin, or lock posts", () => {
      expect(hasPermission(role, "post", ["delete"])).toBe(false);
      expect(hasPermission(role, "post", ["pin"])).toBe(false);
      expect(hasPermission(role, "post", ["lock"])).toBe(false);
    });

    test("can create and update comments", () => {
      expect(hasPermission(role, "comment", ["create"])).toBe(true);
      expect(hasPermission(role, "comment", ["update"])).toBe(true);
    });

    test("cannot delete comments", () => {
      expect(hasPermission(role, "comment", ["delete"])).toBe(false);
    });

    test("can create, update, and publish courses", () => {
      expect(hasPermission(role, "course", ["create"])).toBe(true);
      expect(hasPermission(role, "course", ["update"])).toBe(true);
      expect(hasPermission(role, "course", ["publish"])).toBe(true);
    });

    test("cannot delete courses", () => {
      expect(hasPermission(role, "course", ["delete"])).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Member — minimal permissions (create posts & comments only)
  // -----------------------------------------------------------------------
  describe("member role", () => {
    const role: Role = "member";

    test("does NOT have any organization permissions", () => {
      expect(hasPermission(role, "organization", ["update"])).toBe(false);
      expect(hasPermission(role, "organization", ["delete"])).toBe(false);
    });

    test("does NOT have any member permissions", () => {
      expect(hasPermission(role, "member", ["create"])).toBe(false);
      expect(hasPermission(role, "member", ["invite"])).toBe(false);
    });

    test("does NOT have invitation permissions", () => {
      expect(hasPermission(role, "invitation", ["create"])).toBe(false);
    });

    test("has ac read permission", () => {
      expect(hasPermission(role, "ac", ["read"])).toBe(true);
    });

    test("does NOT have ac write permissions", () => {
      expect(hasPermission(role, "ac", ["create"])).toBe(false);
      expect(hasPermission(role, "ac", ["update"])).toBe(false);
      expect(hasPermission(role, "ac", ["delete"])).toBe(false);
    });

    test("does NOT have any community permissions", () => {
      expect(hasPermission(role, "community", ["update"])).toBe(false);
      expect(hasPermission(role, "community", ["delete"])).toBe(false);
      expect(hasPermission(role, "community", ["manage_billing"])).toBe(false);
    });

    test("does NOT have any space permissions", () => {
      expect(hasPermission(role, "space", ["create"])).toBe(false);
      expect(hasPermission(role, "space", ["update"])).toBe(false);
      expect(hasPermission(role, "space", ["delete"])).toBe(false);
      expect(hasPermission(role, "space", ["manage_members"])).toBe(false);
    });

    test("can create posts", () => {
      expect(hasPermission(role, "post", ["create"])).toBe(true);
    });

    test("cannot update, delete, pin, or lock posts", () => {
      expect(hasPermission(role, "post", ["update"])).toBe(false);
      expect(hasPermission(role, "post", ["delete"])).toBe(false);
      expect(hasPermission(role, "post", ["pin"])).toBe(false);
      expect(hasPermission(role, "post", ["lock"])).toBe(false);
    });

    test("can create comments", () => {
      expect(hasPermission(role, "comment", ["create"])).toBe(true);
    });

    test("cannot update or delete comments", () => {
      expect(hasPermission(role, "comment", ["update"])).toBe(false);
      expect(hasPermission(role, "comment", ["delete"])).toBe(false);
    });

    test("does NOT have any course permissions", () => {
      expect(hasPermission(role, "course", ["create"])).toBe(false);
      expect(hasPermission(role, "course", ["update"])).toBe(false);
      expect(hasPermission(role, "course", ["delete"])).toBe(false);
      expect(hasPermission(role, "course", ["publish"])).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Role hierarchy
  // -----------------------------------------------------------------------
  describe("role hierarchy", () => {
    const permissionMatrix: Record<string, string[]> = {
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
    };

    function getGrantedActions(role: Role): Set<string> {
      const granted = new Set<string>();
      for (const [resource, actions] of Object.entries(permissionMatrix)) {
        for (const action of actions) {
          if (hasPermission(role, resource, [action])) {
            granted.add(`${resource}:${action}`);
          }
        }
      }
      return granted;
    }

    test("owner has all moderator permissions", () => {
      const ownerPerms = getGrantedActions("owner");
      const moderatorPerms = getGrantedActions("moderator");

      for (const perm of moderatorPerms) {
        expect(ownerPerms.has(perm)).toBe(true);
      }
    });

    test("owner has all creator permissions", () => {
      const ownerPerms = getGrantedActions("owner");
      const creatorPerms = getGrantedActions("creator");

      for (const perm of creatorPerms) {
        expect(ownerPerms.has(perm)).toBe(true);
      }
    });

    test("creator has all member content permissions", () => {
      // Creator has all content permissions that member has (post:create, comment:create)
      // but does NOT have member's ac:read (BetterAuth built-in for client-side checks)
      const creatorPerms = getGrantedActions("creator");
      const memberContentPerms = ["post:create", "comment:create"];

      for (const perm of memberContentPerms) {
        expect(creatorPerms.has(perm)).toBe(true);
      }
    });

    test("moderator has all member content permissions", () => {
      const moderatorPerms = getGrantedActions("moderator");
      const memberContentPerms = ["post:create", "comment:create"];

      for (const perm of memberContentPerms) {
        expect(moderatorPerms.has(perm)).toBe(true);
      }
    });

    test("owner has strictly more permissions than moderator", () => {
      const ownerPerms = getGrantedActions("owner");
      const moderatorPerms = getGrantedActions("moderator");
      expect(ownerPerms.size).toBeGreaterThan(moderatorPerms.size);
    });

    test("owner has strictly more permissions than creator", () => {
      const ownerPerms = getGrantedActions("owner");
      const creatorPerms = getGrantedActions("creator");
      expect(ownerPerms.size).toBeGreaterThan(creatorPerms.size);
    });

    test("moderator has strictly more permissions than member", () => {
      const moderatorPerms = getGrantedActions("moderator");
      const memberPerms = getGrantedActions("member");
      expect(moderatorPerms.size).toBeGreaterThan(memberPerms.size);
    });

    test("creator has strictly more permissions than member", () => {
      const creatorPerms = getGrantedActions("creator");
      const memberPerms = getGrantedActions("member");
      expect(creatorPerms.size).toBeGreaterThan(memberPerms.size);
    });
  });
});
