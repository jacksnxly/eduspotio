---
status: APPROVED FOR IMPLEMENTATION
author: jacksnxly
created: 2026-02-23
feature: Auth System
brief: .agent/briefs/BRIEF-auth-system-2026-02-23.md
---

# Technical Spec: Auth System

## Summary

Integrate BetterAuth into the existing Next.js 16 + Drizzle ORM + Neon PostgreSQL monorepo. BetterAuth handles authentication (email+password, Google OAuth), session management (database-backed with cookie caching), and organization-scoped RBAC via its Organization plugin. A `withCommunity()` higher-order function (modeled after dub.co's `withWorkspace()`) wraps all community-scoped API routes, combining session validation, RLS tenant context, permission checks, and consistent error handling. Custom roles (owner, moderator, creator, member) are defined via BetterAuth's `createAccessControl()`. Email verification uses Resend. No frontend UI in this phase — backend foundation only.

## Research Sources

| Topic | Source | Date Accessed |
|-------|--------|---------------|
| BetterAuth installation + Next.js | https://www.better-auth.com/docs/installation, https://www.better-auth.com/docs/integrations/next | 2026-02-23 |
| BetterAuth Drizzle adapter | https://www.better-auth.com/docs/adapters/drizzle | 2026-02-23 |
| BetterAuth Organization plugin | https://www.better-auth.com/docs/plugins/organization | 2026-02-23 |
| BetterAuth email+password | https://www.better-auth.com/docs/authentication/email-password | 2026-02-23 |
| BetterAuth Google OAuth | https://www.better-auth.com/docs/authentication/google | 2026-02-23 |
| BetterAuth account linking | https://www.better-auth.com/docs/concepts/users-accounts | 2026-02-23 |
| BetterAuth session management | https://www.better-auth.com/docs/concepts/session-management | 2026-02-23 |
| BetterAuth CLI / schema generation | https://www.better-auth.com/docs/concepts/database, https://www.better-auth.com/docs/concepts/cli | 2026-02-23 |
| Dub.co withWorkspace pattern | ~/Projects/dub/apps/web/lib/auth/workspace.ts | 2026-02-23 |
| Dub.co RBAC permissions | ~/Projects/dub/apps/web/lib/api/rbac/permissions.ts | 2026-02-23 |
| Dub.co error handling | ~/Projects/dub/apps/web/lib/api/errors.ts | 2026-02-23 |

## Decisions

### 1. Package Architecture

**Choice:** Auth lives in `apps/webapp/lib/auth/`, not a separate package.
**Best Practice:** Dub.co keeps auth in the web app — it's tightly coupled to Next.js route handlers and cookies.
**Deviation:** None.
**Source:** ~/Projects/dub/apps/web/lib/auth/

### 2. BetterAuth Schema Strategy

**Choice:** Generate BetterAuth Drizzle schema via `@better-auth/cli generate`, output to `packages/db/src/schema/auth.ts`. Update `auth-refs.ts` to re-export from the generated file. Manage auth tables through Drizzle migrations.
**Best Practice:** BetterAuth docs recommend generating schema for Drizzle adapter: https://www.better-auth.com/docs/concepts/database
**Deviation:** None.
**Source:** https://www.better-auth.com/docs/concepts/cli

### 3. Role Mapping (RBAC)

**Choice:** Custom 4-tier roles via `createAccessControl()`: owner > moderator > creator > member. Replaces BetterAuth's 3 defaults (owner/admin/member).
**Best Practice:** BetterAuth docs recommend `createAccessControl()` for custom permission models: https://www.better-auth.com/docs/plugins/organization
**Deviation:** Adding a 4th role (creator) between moderator and member. BetterAuth only ships 3 defaults. This is a supported customization, not a workaround.
**Source:** https://www.better-auth.com/docs/plugins/organization

### 4. `withCommunity()` HOF

**Choice:** Build a `withCommunity()` higher-order function that wraps all community-scoped API routes. It handles: session validation, community resolution, membership check, RLS tenant context (`tenantDB()`), RBAC permission checks, and error handling.
**Best Practice:** Dub.co's `withWorkspace()` at ~/Projects/dub/apps/web/lib/auth/workspace.ts (492 lines).
**Deviation:** None — direct adaptation of the dub.co pattern.
**Source:** ~/Projects/dub/apps/web/lib/auth/workspace.ts

### 5. Session Strategy

**Choice:** Database sessions with cookie caching enabled (5-minute TTL, `compact` strategy).
**Best Practice:** BetterAuth default is pure DB sessions (simplest). Cookie caching is an opt-in optimization.
**Deviation:** Enabled cookie caching instead of pure DB. Reason: Neon serverless has per-query latency (~5-10ms); caching reduces round-trips on repeated requests within the 5-minute window. Tradeoff: revoked sessions remain valid for up to 5 minutes.
**Source:** https://www.better-auth.com/docs/concepts/session-management

### 6. Account Linking

**Choice:** Account linking enabled (default). Google marked as trusted provider for auto-linking without email verification requirement.
**Best Practice:** BetterAuth enables linking by default. Trusted providers is opt-in.
**Deviation:** None — Google is a trusted email verifier. Auto-linking is the expected UX per the feature brief.
**Source:** https://www.better-auth.com/docs/concepts/users-accounts

### 7. Email Service

**Choice:** Resend for transactional emails (verification, future password reset).
**Best Practice:** Resend is the most popular email API in the Next.js ecosystem. Already in `.env.example`.
**Deviation:** None.
**Source:** https://resend.com/docs

### 8. Error Handling

**Choice:** Typed `EduspotApiError` class with consistent error codes and JSON response format. Used inside `withCommunity()` and all API routes.
**Best Practice:** Dub.co's `DubApiError` at ~/Projects/dub/apps/web/lib/api/errors.ts.
**Deviation:** None — direct adaptation.
**Source:** ~/Projects/dub/apps/web/lib/api/errors.ts

---

## Data Model

### BetterAuth-Managed Tables (generated via CLI)

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `user` | id, name, email, emailVerified, image, createdAt, updatedAt | Auth identity. PK is text (BetterAuth default). |
| `session` | id, token, userId, expiresAt, ipAddress, userAgent, activeOrganizationId | Extended by Organization plugin with `activeOrganizationId`. |
| `account` | id, userId, accountId, providerId, accessToken, refreshToken, password | Stores both OAuth tokens and hashed passwords (providerId = "credential"). |
| `verification` | id, identifier, value, expiresAt | Email verification and password reset tokens. |
| `organization` | id, name, slug, logo, metadata, createdAt | = Community tenant entity. Maps to `community_id` in all other tables. |
| `member` | id, userId, organizationId, role, createdAt | Community membership. Role stored as text (supports custom roles). |
| `invitation` | id, email, inviterId, organizationId, role, status, expiresAt | Pending invites (out of scope for this phase but table exists). |

### Existing Eduspot Tables (unchanged)

All existing tables (`community_settings`, `domains`, `spaces`, `posts`, etc.) remain as-is. They reference `community_id` which maps to `organization.id`.

### Schema File Changes

| File | Change |
|------|--------|
| `packages/db/src/schema/auth.ts` | **NEW** — Generated by `@better-auth/cli generate`. Contains full Drizzle definitions for all BetterAuth tables. |
| `packages/db/src/schema/auth-refs.ts` | **REPLACED** — Re-exports `user` and `organization` from `auth.ts` instead of defining stubs. |
| `packages/db/src/schema/index.ts` | **UPDATED** — Export auth tables from new `auth.ts`. |
| `packages/db/drizzle.config.ts` | **UPDATED** — Remove `tablesFilter` exclusions for BetterAuth tables (they're now Drizzle-managed). |
| `packages/db/src/relations.ts` | **UPDATED** — Add relations for new auth tables (session, account, verification, member, invitation). |

---

## Auth Configuration

### `apps/webapp/lib/auth/index.ts`

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { db } from "@eduspot/db";
import { ac, roles } from "./permissions";

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // Resend integration
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
      strategy: "compact",
    },
  },
  plugins: [
    organization({
      ac,
      roles,
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
    }),
    nextCookies(), // Must be last
  ],
});

export type Auth = typeof auth;
```

### `apps/webapp/lib/auth/permissions.ts`

```typescript
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

export type PermissionAction = Parameters<typeof ac.hasPermission>[1];
```

### `apps/webapp/lib/auth/client.ts`

```typescript
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { ac, roles } from "./permissions";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    organizationClient({ ac, roles }),
  ],
});
```

---

## API Contract

### Route Handler: `apps/webapp/app/api/auth/[...all]/route.ts`

BetterAuth catch-all handler. Handles all auth endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sign-up/email` | POST | Email+password registration |
| `/api/auth/sign-in/email` | POST | Email+password login |
| `/api/auth/sign-in/social` | POST | Google OAuth initiation |
| `/api/auth/callback/google` | GET | Google OAuth callback |
| `/api/auth/sign-out` | POST | Sign out (revoke session) |
| `/api/auth/get-session` | GET | Get current session |
| `/api/auth/verify-email` | GET | Verify email token |
| `/api/auth/send-verification-email` | POST | Resend verification |
| `/api/auth/organization/*` | Various | Organization CRUD, membership, invitations |

### `withCommunity()` HOF: `apps/webapp/lib/auth/with-community.ts`

```typescript
type WithCommunityContext = {
  req: NextRequest;
  params: Record<string, string>;
  searchParams: Record<string, string>;
  session: Session;
  community: Organization;
  membership: Member;
  permissions: PermissionAction[];
  db: Database; // RLS-scoped via tenantDB()
};

type WithCommunityHandler = (ctx: WithCommunityContext) => Promise<Response>;

type WithCommunityOptions = {
  requiredPermissions?: PermissionAction[];
};

// Signature
withCommunity(handler: WithCommunityHandler, opts?: WithCommunityOptions)
```

**Internal flow:**

1. Extract session via `auth.api.getSession({ headers })`
2. If no session → throw `EduspotApiError({ code: "unauthorized" })`
3. Resolve community from URL param (slug or ID)
4. If no community found → throw `EduspotApiError({ code: "not_found" })`
5. Check membership via BetterAuth org API
6. If not a member → throw `EduspotApiError({ code: "forbidden" })`
7. Get user's role → resolve permissions from role definition
8. If `requiredPermissions` specified → validate with `ac.hasPermission()`
9. Set RLS context via existing `tenantDB(community.id, callback)`
10. Call handler with full context
11. Catch all errors → `handleAndReturnErrorResponse()`

### `withSession()` HOF: `apps/webapp/lib/auth/with-session.ts`

Lighter wrapper for routes that need auth but not community context (e.g., user settings, community creation).

```typescript
type WithSessionContext = {
  req: NextRequest;
  session: Session;
  user: User;
};

withSession(handler: WithSessionHandler)
```

### Error Response Format

```json
{
  "error": {
    "code": "forbidden",
    "message": "You don't have permission to perform this action."
  }
}
```

HTTP status codes mapped from error codes:

| Error Code | HTTP Status |
|------------|-------------|
| `bad_request` | 400 |
| `unauthorized` | 401 |
| `forbidden` | 403 |
| `not_found` | 404 |
| `conflict` | 409 |
| `unprocessable_entity` | 422 |
| `internal_server_error` | 500 |

---

## Integration Points

### Internal Services

| Service | Integration | Notes |
|---------|-------------|-------|
| `@eduspot/db` | Drizzle ORM client | Passed to `drizzleAdapter()` and used in `withCommunity()` via `tenantDB()` |
| RLS tenant context | `tenantDB()` helper | Already exists at `packages/db/src/helpers/tenant.ts`. Called inside `withCommunity()`. |
| Zod env validation | `apps/webapp/lib/env.ts` | Must add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` to schema. |

### External Services

| Service | Purpose | Config |
|---------|---------|--------|
| Google OAuth | Social sign-in | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`. Callback: `{APP_URL}/api/auth/callback/google` |
| Resend | Email verification | `RESEND_API_KEY`. Sends verification emails on sign-up. |
| Neon PostgreSQL | Session + auth storage | Existing `DATABASE_URL`. BetterAuth stores sessions, accounts, users, orgs. |

---

## Security Considerations

1. **Password hashing** — BetterAuth uses `scrypt` by default (memory-hard, brute-force resistant). No change needed.

2. **Session security** — Database-backed sessions with cookie caching. Cookies are `httpOnly`, `secure` (in production), `sameSite: lax`. Cookie cache uses signed tokens (`compact` strategy) — tamper-proof but not encrypted.

3. **Account linking trust** — Google is marked as a trusted provider. This is safe because Google verifies email ownership. An attacker cannot create a Google account with someone else's email.

4. **Email verification** — Required for email+password sign-up. Blocks platform access until verified. Google OAuth users are auto-verified (email already confirmed by Google).

5. **RLS defense-in-depth** — `withCommunity()` sets `app.current_tenant_id` via `tenantDB()` before any database query. PostgreSQL RLS policies enforce tenant isolation at the database level, even if application code has bugs.

6. **RBAC enforcement** — Permissions checked in `withCommunity()` via `ac.hasPermission()`. Both community-level roles (from BetterAuth member table) and route-level `requiredPermissions` are validated.

7. **CSRF protection** — BetterAuth includes built-in CSRF protection for mutation endpoints.

8. **`BETTER_AUTH_SECRET`** — Must be at least 32 characters of high entropy. Already validated in `env.ts`.

9. **Env var exposure** — `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, and `RESEND_API_KEY` are server-only. Never prefixed with `NEXT_PUBLIC_`.

---

## Implementation Constraints

1. **Next.js 16 breaking change** — `middleware.ts` is now `proxy.ts`, the export is `proxy()` not `middleware()`. All BetterAuth Next.js examples use the old name — adapt accordingly.

2. **`nextCookies()` must be last** — The `nextCookies()` plugin must be the last item in the BetterAuth plugins array. It handles cookie setting in Server Components/Actions.

3. **`@better-auth/cli generate` output** — The CLI generates a single file with all table definitions. Output to `packages/db/src/schema/auth.ts`. The existing `auth-refs.ts` must be updated to re-export from this file to avoid duplicate table definitions in Drizzle.

4. **`drizzle.config.ts` filter update** — After generating the BetterAuth schema as a proper Drizzle file, remove the `tablesFilter` exclusions. The auth tables are now Drizzle-managed.

5. **`app_user` PostgreSQL role** — Required for RLS policies. Must exist before running `db:push`. Already documented in learned rules: `CREATE ROLE app_user NOLOGIN;`

6. **Google OAuth callback URL** — Must exactly match `{NEXT_PUBLIC_APP_URL}/api/auth/callback/google` in Google Cloud Console.

7. **Organization plugin `activeOrganizationId`** — Stored on the session. When a user switches communities, call `authClient.organization.setActive()`. This is how `withCommunity()` can resolve the active community from the session.

8. **Zod v4** — The project uses Zod v4 (`^4.3.6`). Ensure all validation schemas use Zod v4 syntax.

9. **No `packages/env`** — Env validation lives directly in `apps/webapp/lib/env.ts`. Add new auth env vars there, not in a separate package.

10. **BetterAuth version** — Install latest stable (`better-auth@latest`). Researched version: 1.4.18. Do not pin to exact version (per project convention).

---

## File Inventory

### New Files

| File | Purpose |
|------|---------|
| `apps/webapp/lib/auth/index.ts` | BetterAuth instance configuration |
| `apps/webapp/lib/auth/client.ts` | Auth client for React (hooks + API) |
| `apps/webapp/lib/auth/permissions.ts` | `createAccessControl()` + 4 custom roles |
| `apps/webapp/lib/auth/with-community.ts` | `withCommunity()` HOF |
| `apps/webapp/lib/auth/with-session.ts` | `withSession()` HOF (no community context) |
| `apps/webapp/lib/auth/errors.ts` | `EduspotApiError` class + error handler |
| `apps/webapp/app/api/auth/[...all]/route.ts` | BetterAuth catch-all route handler |
| `apps/webapp/proxy.ts` | Next.js 16 proxy (session cookie check) |
| `packages/db/src/schema/auth.ts` | Generated BetterAuth Drizzle schema |

### Modified Files

| File | Change |
|------|--------|
| `packages/db/src/schema/auth-refs.ts` | Replace stubs with re-exports from `auth.ts` |
| `packages/db/src/schema/index.ts` | Export new auth tables |
| `packages/db/src/relations.ts` | Add relations for session, account, verification, member, invitation |
| `packages/db/drizzle.config.ts` | Remove `tablesFilter` exclusions for BetterAuth tables |
| `apps/webapp/lib/env.ts` | Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (optional) |
| `apps/webapp/.env.example` | Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` to required section |
| `apps/webapp/package.json` | Add `better-auth`, `resend` dependencies |
| `apps/webapp/next.config.ts` | No changes expected |

---

## Documentation References

Before implementing, consult these official docs:

- https://www.better-auth.com/docs/installation — Installation + env vars
- https://www.better-auth.com/docs/integrations/next — Next.js integration (route handler, cookies, proxy)
- https://www.better-auth.com/docs/adapters/drizzle — Drizzle adapter setup
- https://www.better-auth.com/docs/plugins/organization — Organization plugin + custom roles
- https://www.better-auth.com/docs/authentication/email-password — Email+password config
- https://www.better-auth.com/docs/authentication/google — Google OAuth setup
- https://www.better-auth.com/docs/concepts/users-accounts — Account linking behavior
- https://www.better-auth.com/docs/concepts/session-management — Session config + cookie caching
- https://www.better-auth.com/docs/concepts/cli — Schema generation CLI
- https://resend.com/docs — Resend email API

---

## Testing Requirements

### Unit Tests

- `permissions.ts` — Verify each role has exactly the expected permissions. Verify hierarchical inheritance (owner has all moderator permissions, etc.).
- `errors.ts` — Verify error code → HTTP status mapping. Verify JSON response format.

### Integration Tests

- **Sign-up flow** — Email+password sign-up creates user + account + session. Email verification token is generated.
- **Google OAuth flow** — Mock Google callback. Verify user + account creation. Verify auto-linking with existing email.
- **`withCommunity()` HOF** — Verify: unauthenticated → 401, non-member → 403, insufficient permissions → 403, valid → handler called with correct context.
- **`withSession()` HOF** — Verify: unauthenticated → 401, valid → handler called with session.
- **RLS tenant isolation** — Verify `tenantDB()` sets `app.current_tenant_id`. Verify queries only return data for the active tenant.
- **Organization CRUD** — Create org → user becomes owner. Transfer ownership → old owner becomes moderator.

---

## Rollout

### Implementation Order

1. Install dependencies (`better-auth`, `resend`)
2. Generate BetterAuth schema → update `auth-refs.ts` + `drizzle.config.ts`
3. Run migration (`drizzle-kit generate` + `drizzle-kit migrate` or `db:push`)
4. Create auth config (`lib/auth/index.ts`, `permissions.ts`, `client.ts`)
5. Create route handler (`app/api/auth/[...all]/route.ts`)
6. Create error handling (`lib/auth/errors.ts`)
7. Create HOFs (`with-community.ts`, `with-session.ts`)
8. Create `proxy.ts` for route protection
9. Update env validation (`lib/env.ts`)
10. Write tests

### Migration Strategy

- **Database migration:** Additive only — new tables (user, session, account, verification, organization, member, invitation). No changes to existing tables.
- **Rollback:** Drop BetterAuth tables. Restore `auth-refs.ts` stubs. Revert `drizzle.config.ts` `tablesFilter`.
- **Feature flags:** Not needed — this is foundational infrastructure, not a user-facing feature toggle.

### Pre-Deployment Checklist

- [ ] `BETTER_AUTH_SECRET` set in production (min 32 chars, high entropy)
- [ ] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` configured in Google Cloud Console
- [ ] Google OAuth callback URL set to `{PRODUCTION_URL}/api/auth/callback/google`
- [ ] `RESEND_API_KEY` configured for production email delivery
- [ ] `app_user` PostgreSQL role created on production database
- [ ] Database migration applied successfully
- [ ] Verification email template tested with real email delivery
