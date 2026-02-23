# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**eduspotio** - An open source education platform for creators and communities.

Comparable to Skool, Mighty Networks, and Whop - but open source.

### Core Features

- **Courses & Lessons** - Structured learning content
- **Communities & Groups** - Member spaces and discussions
- **Live Events & Calls** - Scheduled sessions and webinars
- **Payments & Subscriptions** - Monetization and billing
- **Gamification** - Points, badges, and leaderboards

### License

AGPL v3 with enterprise features under a separate commercial license. See [LICENSE](./LICENSE) for details.

## Repository Structure

Monorepo - frontend, backend, and shared packages in one repository.

Tech stack: TBD

## SESSION INITIALIZATION

**IMPORTANT:** At the start of every session:

1. **Get the current developer's Git username:**

   ```bash
   git config user.name
   ```

2. **Load the developer-specific session context:**

   Read `.agent/sessions/{git_username}/last_session.md`

   If the developer's session folder doesn't exist yet, that's okay - it will be created when they run `/save_session`.

3. **Also read** `.agent/README.md` for overall project context.

## DEVELOPER SESSION STRUCTURE

Each developer has their own session context folder:

```
.agent/sessions/
├── {developer1}/
│   └── last_session.md
├── {developer2}/
│   └── last_session.md
└── ...
```

This allows multiple contributors to maintain their own session context without conflicts.

## VIBE CODING WORKFLOW

This project uses the **vibe-coding-toolkit** for structured development:

```
Phase 1: /feature-brief    → Discovery interview → .agent/briefs/{feature}.md
Phase 2: /technical-spec   → Research & design  → .agent/specs/{feature}.md
Phase 3: /implement-feature → Build from spec    → Code changes
Phase 4: /review-code      → Audit & verify     → Approval or fixes
```

**Rules:**

- Phase 2 requires an approved brief from Phase 1
- Phase 3 requires an approved spec from Phase 2
- Never skip phases - each gate ensures quality

## DOCUMENTATION STRUCTURE

```
.agent/
├── sessions/{username}/   # Developer session context
│   └── last_session.md
├── briefs/                # Feature briefs (Phase 1 output)
├── specs/                 # Technical specs (Phase 2 output)
├── Tasks/                 # PRD & implementation plans
├── System/                # Architecture & tech stack docs
├── SOP/                   # Standard operating procedures
└── README.md              # Index of all documentation
```

Always update `.agent` docs after implementing features to keep them current.

## COMMIT GUIDELINES

Use Conventional Commits:

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation
- `refactor:` code restructuring
- `test:` adding tests

**IMPORTANT:** Always ask for approval before committing or pushing.

## TECH STACK

- **Framework:** Next.js 16 (App Router) + React 19
- **Database:** PostgreSQL (Neon serverless) + Drizzle ORM
- **Auth:** BetterAuth (planned)
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest
- **CI/CD:** GitHub Actions + Dependabot
- **Monorepo:** pnpm workspaces + Turborepo

## REFERENCE ARCHITECTURE

Use `~/Projects/dub/` (dub.co) as a mature SaaS reference when designing patterns:

- `withWorkspace()`-style HOF for auth + permissions + rate limiting
- Typed `ApiError` class for consistent error responses
- Zod validation at all API boundaries
- `next-safe-action` for type-safe server actions

## Learned Rules

- Do not pin dependency versions to exact — use `latest` or `beta` tags. Dependabot handles automated version management via grouped weekly PRs. <!-- learned 2026-02-23 -->
- Use `~/Projects/dub/` as reference architecture for SaaS patterns (auth HOF, error handling, API design, RBAC). Consult it when designing new foundational patterns. <!-- learned 2026-02-23 -->
- When spawning parallel agent teams for code changes, assign each agent a distinct set of files/directories with zero overlap. Run `pnpm install` once after all agents complete, not per-agent. <!-- learned 2026-02-23 -->
- In `drizzle.config.ts`, set `schema: "./src/schema/index.ts"` (barrel file only), NOT `"./src/schema"` (directory). Directory scan reads all .ts files including the barrel re-export, causing drizzle-kit to see every table/enum twice. <!-- learned 2026-02-23 -->
- The `pgRole("app_user").existing()` declaration means the role must already exist on the database. Before `db:push` on a fresh database, run: `CREATE ROLE app_user NOLOGIN;` <!-- learned 2026-02-23 -->
- Drizzle v2 `defineRelations()`: self-referencing FKs (e.g., `comments.parentCommentId → comments.id`) cause TypeScript circular inference errors that poison the entire table's type. Use `@ts-ignore` + `prettier-ignore` to suppress. Known Drizzle ORM beta limitation. <!-- learned 2026-02-23 -->
- BetterAuth `createAccessControl()` does NOT have `hasPermission()`. Each role from `ac.newRole()` has `authorize(request)` → `{ success, error? }`. Check permissions: `roles[roleName].authorize({ resource: ["action"] })`. <!-- learned 2026-02-23 -->
- Env validation in `lib/env.ts` must skip the throw during `next build` — route handlers trigger module evaluation at build time. Guard with `process.env.NEXT_PHASE === "phase-production-build"`. <!-- learned 2026-02-23 -->
- Drizzle v2 composite unique constraints use standalone `unique()` from `drizzle-orm/pg-core`, NOT `t.unique()`. Syntax: `(t) => [unique("constraint_name").on(t.col1, t.col2)]`. <!-- learned 2026-02-23 -->
- Prefer `@ts-expect-error` over `@ts-ignore` for Drizzle self-referencing FK suppression — it acts as a canary that flags when the upstream bug is fixed. <!-- learned 2026-02-23 -->
- Resend Node.js SDK does NOT throw on API errors — it resolves with `{ data, error }`. Always destructure the return and check `error` explicitly. A `try/catch` around `resend.emails.send()` will not catch 401/403/422/429 failures. <!-- learned 2026-02-23 -->
- Use `typeof auth.$Infer.Session` for BetterAuth session type inference, not `Awaited<ReturnType<typeof auth.api.getSession>>`. The `$Infer` API is the official stable inference surface. <!-- learned 2026-02-23 -->
