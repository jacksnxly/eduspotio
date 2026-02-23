import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  community: ["update", "delete", "manage_billing"],
  space: ["create", "update", "delete", "manage_members"],
  post: ["create", "update", "delete", "pin", "lock"],
  comment: ["create", "update", "delete"],
  course: ["create", "update", "delete", "publish"],
  member: ["invite", "remove", "ban", "change_role"],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  owner: ac.newRole({
    community: ["update", "delete", "manage_billing"],
    space: ["create", "update", "delete", "manage_members"],
    post: ["create", "update", "delete", "pin", "lock"],
    comment: ["create", "update", "delete"],
    course: ["create", "update", "delete", "publish"],
    member: ["invite", "remove", "ban", "change_role"],
  }),
  moderator: ac.newRole({
    space: ["create", "update", "manage_members"],
    post: ["create", "update", "delete", "pin", "lock"],
    comment: ["create", "update", "delete"],
    course: ["create", "update"],
    member: ["invite", "remove"],
  }),
  creator: ac.newRole({
    post: ["create", "update"],
    comment: ["create", "update"],
    course: ["create", "update", "publish"],
  }),
  member: ac.newRole({
    post: ["create"],
    comment: ["create"],
  }),
};

export type Role = keyof typeof roles;

export type PermissionRequest = Parameters<
  (typeof roles)[Role]["authorize"]
>[0];
