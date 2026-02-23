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
