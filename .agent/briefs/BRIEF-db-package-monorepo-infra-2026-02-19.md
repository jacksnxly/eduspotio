---
status: PENDING TECHNICAL REVIEW
author: jacksonly
created: 2026-02-19
feature: Database Package & Monorepo Infrastructure
---

# Feature Brief: Database Package & Monorepo Infrastructure

## Problem

**Persona:** Open-source contributors who clone the repo and need a working development environment, plus the core maintainer building the first features.

**Trigger:** The architecture document and two Next.js app boilerplates (marketing + webapp) exist, but there is no database layer, no shared packages, and no monorepo infrastructure. Every feature (auth, spaces, courses, billing) is blocked until the DB package and shared tooling are in place.

**Current State:** Contributors clone the repo and find two bare Next.js inits with no database, no shared config, and no way to start building features. The architecture.md describes the full schema but none of it is implemented.

**Pain:** Zero features can be built. Auth, communities, spaces, posts, courses, billing — all require the database schema to exist. Contributors have nothing to build on.

## Solution

### Part 1: Monorepo Infrastructure

Set up shared packages that all apps and packages depend on:

1. **`packages/tsconfig`** — Shared TypeScript configurations (base, Next.js, library variants). All apps and packages extend from these.
2. **`packages/tailwind-config`** — Shared Tailwind CSS v4 configuration with the Eduspot theme system (CSS custom properties from architecture doc).
3. **`packages/eslint-config`** — Shared ESLint configuration.
4. **`turbo.json`** — Turborepo pipeline configuration for build, dev, lint, db:generate, db:push, db:migrate tasks.
5. **Root `pnpm-workspace.yaml`** — Workspace definition for `apps/*` and `packages/*`.
6. **Root `docker-compose.yml`** — PostgreSQL 17 container for local development.

### Part 2: Database Package (`packages/db`)

Create `@eduspot/db` as a Drizzle ORM package with:

**Schema files split by domain:**
- `schema/enums.ts` — All pgEnum definitions (post_type, space_type, access_level, lesson_type, progress_status, enrollment_status, drip_type, domain_type, notification_type)
- `schema/community.ts` — communitySettings, domains
- `schema/spaces.ts` — spaceGroups, spaces, spaceMemberships
- `schema/content.ts` — posts, comments, reactions
- `schema/courses.ts` — courses, modules, lessons, enrollments, lessonProgress
- `schema/billing.ts` — customers, products, prices, subscriptions, plans, planSpaceAccess, planCourseAccess, memberships
- `schema/notifications.ts` — notifications
- `schema/media.ts` — media
- `schema/gamification.ts` — points, leaderboard
- `schema/relations.ts` — All Drizzle `relations()` definitions for query builder joins
- `schema/index.ts` — Barrel export of all schema

**Database client:**
- `client.ts` — Drizzle client configured for Neon (using `@neondatabase/serverless` driver)
- Connection via `DATABASE_URL` environment variable

**RLS policies:**
- Row-Level Security enabled on all tenant-scoped tables
- Policies using `current_setting('app.current_tenant_id')` as the architecture doc specifies
- Included in migration files

**Utility kit:**
- `helpers/tenant.ts` — `withTenant(communityId)` wrapper that sets `app.current_tenant_id` via `SET LOCAL` before queries
- `helpers/soft-delete.ts` — Filters and utilities for soft-deleted records (`WHERE deleted_at IS NULL`)
- `helpers/pagination.ts` — Cursor-based keyset pagination helpers (as specified in architecture doc)
- `helpers/index.ts` — Barrel export

**Migrations:**
- Versioned SQL migration files from day 1 using `drizzle-kit generate` + `drizzle-kit migrate`
- Migration files committed to the repo

**Package configuration:**
- Raw TypeScript (no build step) — consumed directly via `workspace:*` protocol
- Next.js app transpiles it
- `drizzle.config.ts` at package root

**Primary key strategy:**
- `text` type for all BetterAuth foreign keys (community_id, author_id, user_id, etc.)
- `uuid` with `gen_random_uuid()` for all Eduspot-owned tables
- Matches architecture doc exactly

**Developer workflow:**
- **Local dev:** `docker compose up` for Postgres 17, then `pnpm db:migrate` to apply migrations. Use `drizzle-kit studio` for visual browsing.
- **Cloud dev:** Configure `DATABASE_URL` pointing to a Neon database branch.
- Both paths documented.

### Part 3: App Integration

- Both `apps/webapp` and `apps/marketing` add `@eduspot/db` as a `workspace:*` dependency
- Apps import via `import { db, posts, spaces } from '@eduspot/db'`
- Apps extend shared tsconfig, tailwind-config, and eslint-config

## Examples

### Happy Path

A contributor clones the repo and wants to start building the spaces feature:

1. Runs `pnpm install`
2. Runs `docker compose up -d` to start local Postgres
3. Copies `.env.example` to `.env`, sets `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eduspot`
4. Runs `pnpm db:migrate` — all tables are created with RLS policies
5. Opens `packages/db/schema/spaces.ts` — sees the spaces, spaceGroups, and spaceMemberships tables with full types
6. In their feature code: `import { db, spaces, eq } from '@eduspot/db'` — gets full type safety and autocompletion
7. Writes a query: `db.query.spaces.findMany({ where: eq(spaces.communityId, tenantId), with: { spaceGroup: true } })` — relations work

### Edge Case

A contributor uses Neon instead of Docker:

1. Creates a Neon project, copies the connection string
2. Sets `DATABASE_URL` in `.env` to their Neon connection string
3. Runs `pnpm db:migrate` — same migrations work against Neon
4. Everything else is identical

### Error Case

A contributor forgets to start the database:

1. Runs `pnpm db:migrate` without Docker running or Neon configured
2. Gets a clear error: connection refused / invalid DATABASE_URL
3. The `.env.example` file documents exactly what's needed
4. The README in `packages/db/` explains both local and cloud setup

## Scope

### In Scope
- Monorepo shared packages: tsconfig, tailwind-config, eslint-config
- Turborepo pipeline configuration
- Root docker-compose.yml with Postgres 17
- `packages/db` package with Drizzle ORM
- All schema tables from architecture.md (community, spaces, content, courses, billing, notifications, media, gamification)
- All pgEnum definitions
- Full Drizzle relations definitions
- RLS policies on all tenant-scoped tables
- Utility helpers: tenant scoping, soft-delete filters, cursor pagination
- Versioned SQL migration files
- Neon serverless driver configuration
- `.env.example` with DATABASE_URL
- Workspace integration with both apps

### Out of Scope
1. **Seed data / fixtures** — No pre-populated demo data. That's a separate task.
2. **BetterAuth integration** — BetterAuth owns its 9 tables (user, session, account, verification, organization, member, invitation, team, teamMember). Wiring up BetterAuth with its Drizzle adapter, OAuth providers, and session handling is a separate feature.
3. **API routes / server actions** — No endpoints. This is the data layer only.
4. **Stripe webhook handlers** — The billing tables are defined, but the webhook logic that syncs Stripe events is not included.
5. **Full-text search setup** — No `pg_trgm` extension, search indexes, or search query helpers.
6. **Database monitoring** — No query logging, slow query alerts, or connection pooling configuration.
7. **Automated testing** — No integration tests running against a test database.
8. **CI pipeline for migrations** — No GitHub Actions workflow for automated migration runs.

## Open Questions

1. **BetterAuth table references** — BetterAuth generates its tables via `npx better-auth generate`. Our Drizzle schema references them via FK text columns but doesn't define them. Should the schema include type-only references (no table creation) to BetterAuth tables for relation definitions, or skip relations that cross into BetterAuth tables?
2. **Neon driver specifics** — Should we use `@neondatabase/serverless` (HTTP-based, best for serverless) or `postgres` (TCP, better for long-running connections in Docker)? Or provide both with an env toggle?
3. **ESLint config** — Flat config (eslint.config.js) or legacy (.eslintrc)? Next.js 15 supports both.

## Priority

**High — blocking all feature work.** Auth, spaces, courses, billing — every feature depends on this database layer existing. Contributors cannot start meaningful work until this is in place. This is the critical path to MVP.
