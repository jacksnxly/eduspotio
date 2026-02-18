---
status: APPROVED FOR IMPLEMENTATION
author: jacksonly
created: 2026-02-19
feature: Database Package & Monorepo Infrastructure
brief: .agent/briefs/BRIEF-db-package-monorepo-infra-2026-02-19.md
---

# Technical Spec: Database Package & Monorepo Infrastructure

## Summary

Set up the complete monorepo infrastructure (pnpm v10 workspace, Turborepo 2.0, shared packages) and create the `@eduspot/db` Drizzle ORM package with the full database schema from `architecture.md`. Uses Drizzle v1 beta for native RLS support via `pgPolicy()`, Neon WebSocket driver for interactive transactions, and `SET LOCAL` within `db.transaction()` for per-request tenant isolation. All shared config packages (TypeScript, Tailwind CSS v4, ESLint flat config) follow the latest official patterns from each tool's documentation.

## Research Sources

| Topic | Source | Date Accessed |
|-------|--------|---------------|
| Drizzle ORM setup & Neon | [orm.drizzle.team/docs/connect-neon](https://orm.drizzle.team/docs/connect-neon) | 2026-02-19 |
| Drizzle v1 beta features | [orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2](https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2) | 2026-02-19 |
| Drizzle Relations v2 | [orm.drizzle.team/docs/relations-v2](https://orm.drizzle.team/docs/relations-v2) | 2026-02-19 |
| Drizzle RLS (pgPolicy) | [orm.drizzle.team/docs/rls](https://orm.drizzle.team/docs/rls) | 2026-02-19 |
| Drizzle migrations | [orm.drizzle.team/docs/migrations](https://orm.drizzle.team/docs/migrations) | 2026-02-19 |
| Drizzle with Nile (tenantDB pattern) | [orm.drizzle.team/docs/tutorials/drizzle-with-nile](https://orm.drizzle.team/docs/tutorials/drizzle-with-nile) | 2026-02-19 |
| Neon serverless driver | [neon.com/docs/serverless/serverless-driver](https://neon.com/docs/serverless/serverless-driver) | 2026-02-19 |
| Neon connection pooling | [neon.com/docs/connect/connection-pooling](https://neon.com/docs/connect/connection-pooling) | 2026-02-19 |
| Neon Drizzle migrations | [neon.com/docs/guides/drizzle-migrations](https://neon.com/docs/guides/drizzle-migrations) | 2026-02-19 |
| Turborepo 2.0 | [turborepo.dev/blog/turbo-2-0](https://turborepo.dev/blog/turbo-2-0) | 2026-02-19 |
| Turborepo task config | [turborepo.dev/docs/crafting-your-repository/configuring-tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) | 2026-02-19 |
| Turborepo repo structure | [turborepo.dev/docs/crafting-your-repository/structuring-a-repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) | 2026-02-19 |
| pnpm workspaces | [pnpm.io/workspaces](https://pnpm.io/workspaces) | 2026-02-19 |
| pnpm v10 changes | [pnpm.io/blog/2025/12/29/pnpm-in-2025](https://pnpm.io/blog/2025/12/29/pnpm-in-2025) | 2026-02-19 |
| ESLint flat config | [eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/) | 2026-02-19 |
| Next.js 16 ESLint | [nextjs.org/docs/app/api-reference/config/eslint](https://nextjs.org/docs/app/api-reference/config/eslint) | 2026-02-19 |
| Tailwind CSS v4 theme | [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme) | 2026-02-19 |
| Tailwind CSS v4 source detection | [tailwindcss.com/docs/detecting-classes-in-source-files](https://tailwindcss.com/docs/detecting-classes-in-source-files) | 2026-02-19 |
| Tailwind v4 monorepo guide | [turborepo.dev/docs/guides/tools/tailwind](https://turborepo.dev/docs/guides/tools/tailwind) | 2026-02-19 |
| PostgreSQL RLS | [postgresql.org/docs/current/ddl-rowsecurity.html](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | 2026-02-19 |
| Supabase RLS performance | [supabase.com/docs/guides/troubleshooting/rls-performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) | 2026-02-19 |
| AWS SaaS Factory RLS | [aws.amazon.com/blogs/database/multi-tenant-data-isolation](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) | 2026-02-19 |
| Crunchy Data RLS | [crunchydata.com/blog/row-level-security-for-tenants](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres) | 2026-02-19 |

## Decisions

### 1. Drizzle ORM Version

**Choice:** Drizzle ORM v1 beta (`drizzle-orm@beta`, `drizzle-kit@beta`)
**Best Practice:** Use stable v0.45.x for production apps
**Deviation:** Greenfield project with no migration burden. v1 beta provides native `pgPolicy()` for RLS, Relations v2 with `defineRelations()`, many-to-many `through`, and improved migration format. These features directly serve the architecture requirements.
**Source:** [orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2](https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2)

### 2. Neon Driver

**Choice:** Neon WebSocket driver (`drizzle-orm/neon-serverless`) only
**Best Practice:** Use HTTP driver for maximum serverless performance; WebSocket for interactive transactions
**Deviation:** RLS requires `SET LOCAL` inside `db.transaction()`, which needs interactive transaction support. A single driver simplifies the codebase. WebSocket driver works in both serverless and Node.js environments.
**Source:** [orm.drizzle.team/docs/connect-neon](https://orm.drizzle.team/docs/connect-neon), [neon.com/docs/serverless/serverless-driver](https://neon.com/docs/serverless/serverless-driver)

### 3. BetterAuth Table References

**Choice:** Type-only references using `.existing()` pattern in Drizzle schema
**Best Practice:** Same approach as Drizzle's Neon/Supabase role handling
**Deviation:** None
**Source:** [orm.drizzle.team/docs/rls](https://orm.drizzle.team/docs/rls)

### 4. Turborepo Version

**Choice:** Upgrade to Turborepo 2.0 (`tasks` key, new env handling)
**Best Practice:** Use latest Turborepo with `tasks` key
**Deviation:** None
**Source:** [turborepo.dev/blog/turbo-2-0](https://turborepo.dev/blog/turbo-2-0)

### 5. ESLint Configuration

**Choice:** Flat config (`eslint.config.mjs`) with shared `@eduspot/eslint-config` package
**Best Practice:** Required for Next.js 16 (which removed `next lint`)
**Deviation:** None
**Source:** [nextjs.org/docs/app/api-reference/config/eslint](https://nextjs.org/docs/app/api-reference/config/eslint)

### 6. Tailwind CSS v4 Configuration

**Choice:** CSS-first config with `@theme` directive, shared theme.css package, `@theme inline` for dynamic community theming
**Best Practice:** Official Tailwind v4 pattern
**Deviation:** None
**Source:** [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme)

### 7. RLS Strategy

**Choice:** Dual-layer: Drizzle `pgPolicy()` in schema + `SET LOCAL` in `db.transaction()` via `tenantDB()` wrapper with `AsyncLocalStorage`
**Best Practice:** Consensus pattern across AWS, Crunchy Data, Nile, Supabase, Neon docs
**Deviation:** None
**Source:** [orm.drizzle.team/docs/tutorials/drizzle-with-nile](https://orm.drizzle.team/docs/tutorials/drizzle-with-nile)

### 8. Package Build Strategy

**Choice:** Raw TypeScript (no build step), consumed via `workspace:*` + `transpilePackages` in Next.js config
**Best Practice:** Standard Turborepo internal package pattern
**Deviation:** None
**Source:** [turborepo.dev/docs/crafting-your-repository/structuring-a-repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)

### 9. Package Manager

**Choice:** pnpm v10 with root `pnpm-workspace.yaml`
**Best Practice:** Latest stable pnpm with security-by-default
**Deviation:** None
**Source:** [pnpm.io/blog/2025/12/29/pnpm-in-2025](https://pnpm.io/blog/2025/12/29/pnpm-in-2025)

### 10. Local Development Database

**Choice:** Docker Compose (PostgreSQL 17) as primary + Neon branches as alternative
**Best Practice:** Dual-path for contributor flexibility
**Deviation:** None

---

## File Structure

```
eduspotio/
├── .agent/                          # Documentation (existing)
├── .claude/                         # Claude config (existing)
├── apps/
│   ├── webapp/                      # Next.js 16 app (existing)
│   │   ├── eslint.config.mjs        # NEW: flat config extending @eduspot/eslint-config
│   │   ├── next.config.ts           # MODIFIED: add transpilePackages
│   │   └── app/globals.css          # MODIFIED: @import tailwindcss + @import @eduspot/tailwind-config
│   └── marketing/                   # Next.js 16 app (existing)
│       ├── eslint.config.mjs        # NEW: flat config
│       ├── next.config.ts           # MODIFIED: add transpilePackages
│       └── app/globals.css          # MODIFIED: same as webapp
├── packages/
│   ├── db/                          # NEW: @eduspot/db
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── enums.ts         # All pgEnum definitions
│   │   │   │   ├── auth-refs.ts     # BetterAuth table stubs (.existing())
│   │   │   │   ├── community.ts     # communitySettings, domains
│   │   │   │   ├── spaces.ts        # spaceGroups, spaces, spaceMemberships
│   │   │   │   ├── content.ts       # posts, comments, reactions
│   │   │   │   ├── courses.ts       # courses, modules, lessons, enrollments, lessonProgress
│   │   │   │   ├── billing.ts       # customers, products, prices, subscriptions, plans, planSpaceAccess, planCourseAccess, memberships
│   │   │   │   ├── notifications.ts # notifications
│   │   │   │   ├── media.ts         # media
│   │   │   │   ├── gamification.ts  # points, leaderboard
│   │   │   │   └── index.ts         # Barrel export
│   │   │   ├── relations.ts         # All defineRelations() in one file
│   │   │   ├── client.ts            # Neon WebSocket drizzle client factory
│   │   │   ├── helpers/
│   │   │   │   ├── tenant.ts        # tenantDB() wrapper with AsyncLocalStorage + SET LOCAL
│   │   │   │   ├── soft-delete.ts   # Soft delete filter helpers
│   │   │   │   ├── pagination.ts    # Cursor-based keyset pagination
│   │   │   │   └── index.ts         # Barrel export
│   │   │   └── index.ts             # Public API: re-exports schema, client, helpers
│   │   ├── drizzle/                 # Generated migrations (committed)
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── tsconfig/                    # NEW: @eduspot/tsconfig
│   │   ├── base.json               # Base TypeScript config
│   │   ├── nextjs.json             # Next.js-specific extends base
│   │   ├── library.json            # Library/package extends base
│   │   └── package.json
│   ├── tailwind-config/            # NEW: @eduspot/tailwind-config
│   │   ├── theme.css               # @theme tokens for Eduspot brand
│   │   ├── postcss.config.js       # Shared PostCSS config
│   │   └── package.json
│   └── eslint-config/              # NEW: @eduspot/eslint-config
│       ├── base.js                 # Core rules (TypeScript, Prettier)
│       ├── next.js                 # Next.js-specific rules
│       └── package.json
├── docker-compose.yml              # NEW: PostgreSQL 17
├── .env.example                    # NEW: DATABASE_URL template
├── pnpm-workspace.yaml             # NEW: root workspace config
├── turbo.json                      # MODIFIED: pipeline -> tasks, add db tasks
├── package.json                    # NEW: root workspace package.json
├── prettier.config.js              # Existing
├── .gitignore                      # Existing (may need drizzle/* addition)
├── CLAUDE.md                       # Existing
└── LICENSE                         # Existing
```

---

## Data Model

All tables follow the schema defined in `.agent/System/architecture.md` Section 3.2 exactly. The Drizzle schema files translate the architecture document's TypeScript definitions 1:1.

### Key Implementation Details

**Primary Keys:**
- Eduspot-owned tables: `uuid('id').primaryKey().defaultRandom()`
- Stripe-synced tables: `text('id').primaryKey()` (Stripe object IDs)
- BetterAuth FK columns: `text` type (BetterAuth uses string IDs)

**BetterAuth Table Stubs (`auth-refs.ts`):**
```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Read-only stubs — BetterAuth owns these tables via `npx better-auth generate`
// Defined here ONLY for Drizzle relation definitions. Not included in migrations.
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  image: text('image'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name'),
  slug: text('slug'),
  logo: text('logo'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at'),
});
```

These stubs are excluded from migration generation by not including them in `drizzle.config.ts`'s schema path, OR by using the Drizzle v1 `.existing()` mechanism if available.

**RLS Policies (on all tenant-scoped tables):**
```typescript
import { pgPolicy, pgRole } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const appUser = pgRole('app_user').existing();

// Example: posts table with RLS
export const posts = pgTable('posts', {
  // ... columns from architecture.md
}, (t) => [
  pgPolicy('posts_tenant_isolation', {
    as: 'permissive',
    to: appUser,
    for: 'all',
    using: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
    withCheck: sql`community_id = (SELECT current_setting('app.current_tenant_id', true))`,
  }),
  // indexes...
]);
```

Note: The `(SELECT current_setting(...))` wrapper triggers PostgreSQL's initPlan optimization, caching the result per-statement instead of evaluating per-row.

---

## API Contract

No API routes are in scope (per brief). This is the data layer only. Apps import from `@eduspot/db`:

```typescript
// Import schema, client, and helpers
import { db } from '@eduspot/db';
import { posts, spaces, eq } from '@eduspot/db';
import { tenantDB } from '@eduspot/db/helpers';

// Tenant-scoped query (RLS enforced via SET LOCAL)
const spacePosts = await tenantDB(communityId, async (tx) => {
  return tx.query.posts.findMany({
    where: { spaceId: targetSpaceId, deletedAt: null },
    with: { author: true, comments: { limit: 3 } },
    orderBy: { bumpedAt: 'desc' },
    limit: 20,
  });
});
```

---

## Integration Points

### Internal
- **Apps (webapp, marketing)** import `@eduspot/db` as `workspace:*` dependency
- **Apps** extend `@eduspot/tsconfig/nextjs.json`
- **Apps** import `@eduspot/tailwind-config` in their `globals.css`
- **Apps** extend `@eduspot/eslint-config/next` in their `eslint.config.mjs`
- **Apps** add `@eduspot/db` to `transpilePackages` in `next.config.ts`

### External
- **Neon** — Cloud PostgreSQL via `@neondatabase/serverless` WebSocket driver
- **Docker** — Local PostgreSQL 17 via `docker-compose.yml`
- **BetterAuth** — Owns auth tables; Eduspot schema references via FK text columns

---

## Security Considerations

### Row-Level Security
- RLS enabled on ALL tenant-scoped tables via `pgPolicy()` in Drizzle schema
- Policies use `current_setting('app.current_tenant_id', true)` — returns NULL if unset (secure by default)
- `SET LOCAL` scoped to transaction only — no context leakage in connection pools
- Dedicated `app_user` PostgreSQL role WITHOUT `BYPASSRLS` for all application queries
- Owner/superuser role used ONLY for migrations

### Connection Security
- Never use `neondb_owner` role in application connection strings (bypasses RLS)
- Use pooled endpoint (`-pooler`) for application queries
- Use direct endpoint for migrations only
- `DATABASE_URL` in `.env` — never committed

### Data Protection
- Soft deletes (`deleted_at`) on all UGC tables
- Foreign keys enforced at database level
- Unique constraints scoped to tenant: `unique().on(table.communityId, table.slug)`

---

## Implementation Constraints

1. **Drizzle v1 beta** — Pin exact versions in `package.json`. Monitor for breaking changes in beta releases. If v1 beta proves unstable, fallback plan is stable v0.45.x with manual RLS SQL migrations and Relations v1.

2. **BetterAuth table stubs** — Must NOT be included in migration generation. Verify by running `drizzle-kit generate` and confirming no CREATE TABLE statements for `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `team`, `teamMember`.

3. **Migration ordering** — BetterAuth tables must exist before Eduspot migrations run (FK references). Document this in the contributor guide: run `npx better-auth generate` first, then `pnpm db:migrate`.

4. **Neon WebSocket in Node.js** — Requires `ws` and `bufferutil` packages. Add to `packages/db` dependencies. Not needed in edge runtimes.

5. **pnpm v10 lifecycle scripts** — Blocked by default. Add `allowBuilds` in `pnpm-workspace.yaml` for packages that need postinstall scripts (e.g., `sharp`, `@neondatabase/serverless`).

6. **Turborepo 2.0 migration** — Run `npx @turbo/codemod migrate` to convert `pipeline` to `tasks`. Add `packageManager` field to root `package.json`.

7. **ESLint** — `next lint` is removed in Next.js 16. Add explicit `"lint": "eslint ."` script to each app's `package.json`.

8. **Tailwind v4 monorepo scanning** — Each app must include `@source` directives for shared packages that contain Tailwind classes. Without this, classes from shared packages are not generated.

---

## Client Configuration

### `packages/db/src/client.ts`

```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import { relations } from './relations';

// WebSocket polyfill for Node.js environments
if (typeof WebSocket === 'undefined') {
  const ws = await import('ws');
  neonConfig.webSocketConstructor = ws.default;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle({ client: pool, schema, relations });
export type Database = typeof db;
```

### `packages/db/src/helpers/tenant.ts`

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';
import { sql } from 'drizzle-orm';
import { db, type Database } from '../client';

export const tenantContext = new AsyncLocalStorage<string | undefined>();

export async function tenantDB<T>(
  communityId: string,
  callback: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${communityId}, true)`
    );
    return callback(tx as unknown as Database);
  });
}
```

### `packages/db/drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  entities: {
    roles: {
      provider: 'neon',
    },
  },
});
```

---

## Turborepo Configuration

### `turbo.json` (migrated to v2)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
      "inputs": ["$TURBO_DEFAULT$", ".env", ".env.local"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## pnpm Workspace Configuration

### `pnpm-workspace.yaml` (root)

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root `package.json`

```json
{
  "name": "eduspotio",
  "private": true,
  "packageManager": "pnpm@10.x.x",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "clean": "turbo run clean",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:push": "turbo run db:push",
    "db:studio": "turbo run db:studio"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

---

## Docker Compose

### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:17
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: eduspot
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### `.env.example`

```env
# Local development (Docker)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eduspot

# Neon (cloud development)
# DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# Direct connection for migrations (Neon only - non-pooled)
# DATABASE_URL_DIRECT=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

---

## Documentation References

Before implementing, consult these official docs:

- [Drizzle ORM v1 beta release notes](https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2) - Breaking changes, new APIs
- [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls) - pgPolicy, pgRole, .existing() pattern
- [Drizzle ORM Relations v2](https://orm.drizzle.team/docs/relations-v2) - defineRelations API
- [Drizzle + Neon connection guide](https://orm.drizzle.team/docs/connect-neon) - Driver setup
- [Neon migration guide](https://neon.com/docs/guides/drizzle-migrations) - Direct vs pooled connections
- [Turborepo 2.0 upgrade guide](https://turborepo.dev/docs/crafting-your-repository/upgrading) - Codemod, breaking changes
- [Next.js 16 ESLint config](https://nextjs.org/docs/app/api-reference/config/eslint) - Flat config, rootDir
- [Tailwind CSS v4 theme docs](https://tailwindcss.com/docs/theme) - @theme, @theme inline, namespaces
- [Tailwind CSS v4 source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files) - @source directive
- [ESLint flat config guide](https://eslint.org/docs/latest/use/configure/configuration-files) - defineConfig, extends

---

## Testing Requirements

- **Schema verification:** Run `drizzle-kit generate` and inspect output SQL — verify all tables, indexes, enums, and RLS policies are generated correctly
- **Migration smoke test:** Run `drizzle-kit migrate` against a fresh PostgreSQL 17 instance and verify all tables are created
- **RLS verification:** Connect as `app_user` role, verify queries without `SET LOCAL` return zero rows; verify queries with `SET LOCAL` return only tenant-scoped data
- **BetterAuth exclusion:** Verify `drizzle-kit generate` does NOT create `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `team`, `teamMember` tables
- **Build verification:** Run `turbo run build` from root — verify both apps build successfully with `@eduspot/db` imported
- **Lint verification:** Run `turbo run lint` from root — verify ESLint flat config works across all apps and packages

---

## Rollout

### Implementation Order

1. **Root workspace setup** — Create root `package.json`, move `pnpm-workspace.yaml` to root, upgrade Turborepo 2.0
2. **Shared config packages** — `packages/tsconfig`, `packages/eslint-config`, `packages/tailwind-config`
3. **App integration** — Update both apps to use shared configs, add `transpilePackages`
4. **Database package** — `packages/db` with schema, client, helpers, migrations
5. **Docker Compose + .env.example** — Local dev setup
6. **Verification** — Run full build, lint, and migration smoke test

### Rollback Plan

All changes are additive (new files, new packages). The existing `apps/webapp` and `apps/marketing` are minimally modified (only config files change). If any step fails:

- Shared config packages can be reverted by removing imports and restoring inline configs
- Database package is fully standalone — removing it from app dependencies reverts to pre-implementation state
- Turborepo migration is reversible via `git revert` (old `pipeline` key still works with warnings)
