import { auth } from "./index";
import type { PermissionAction } from "./permissions";

export type Session = typeof auth.$Infer.Session;
export type AuthenticatedSession = NonNullable<Session>;

// Re-export for convenience (used by route handlers)
export type { PermissionAction };
