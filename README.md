# eduspot.io — Open Source Education Platform

<p align="center">
  <strong>Courses. Communities. Live Events. Payments. Gamification.</strong>
</p>

<p align="center">
  <a href="https://github.com/jacksnxly/eduspotio/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/jacksnxly/eduspotio/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPLv3-blue.svg?style=for-the-badge" alt="AGPLv3 License"></a>
</p>

**eduspot.io** is an open source education platform for creators and communities. Build and monetize courses, host live events, foster discussions, and engage learners with gamification — all from a single, self-hostable platform.

Comparable to Skool, Mighty Networks, and Whop — but open source.

## Highlights

- **Courses & Lessons** — Structured learning with modules, lessons, enrollments, and progress tracking
- **Communities & Groups** — Member spaces, posts, comments, and reactions
- **Live Events & Calls** — Scheduled sessions and webinars with attendee management
- **Payments & Subscriptions** — Plans, invoices, and payment methods for monetization
- **Gamification** — Points, badges, and leaderboards to drive engagement
- **Row-Level Security** — Database-level tenant isolation for multi-community deployments
- **Self-hostable** — Run on your own infrastructure with full control over your data

## Tech Stack

| Layer     | Technology                                 |
| --------- | ------------------------------------------ |
| Framework | Next.js 16 (App Router) + React 19         |
| Database  | PostgreSQL (Neon serverless) + Drizzle ORM |
| Auth      | BetterAuth (planned)                       |
| Styling   | Tailwind CSS 4                             |
| Testing   | Vitest                                     |
| CI/CD     | GitHub Actions + Dependabot                |
| Monorepo  | pnpm workspaces + Turborepo                |

## Repository Structure

```
eduspotio/
├── apps/
│   ├── webapp/          # Main application (Next.js 16)
│   └── marketing/       # Marketing site (Next.js 16)
├── packages/
│   ├── db/              # Database schema, client, helpers (Drizzle ORM)
│   ├── eslint-config/   # Shared ESLint flat config
│   ├── tailwind-config/ # Shared Tailwind theme + PostCSS
│   └── tsconfig/        # Shared TypeScript configs
├── .github/
│   ├── workflows/ci.yml # Build, lint, format, test
│   └── dependabot.yml   # Grouped weekly dependency updates
└── docker-compose.yml   # Local PostgreSQL for development
```

## Getting Started

### Prerequisites

- **Node.js** >= 22
- **pnpm** >= 10
- **PostgreSQL** (or use Docker / Neon)

### Install

```bash
git clone https://github.com/jacksnxly/eduspotio.git
cd eduspotio
pnpm install
```

### Environment

Copy the example env file and fill in your values:

```bash
cp apps/webapp/.env.example apps/webapp/.env
```

Required variables:

| Variable               | Description                  |
| ---------------------- | ---------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string |
| `BETTER_AUTH_SECRET`   | Auth secret key              |
| `NEXT_PUBLIC_APP_NAME` | App display name             |
| `NEXT_PUBLIC_APP_URL`  | App URL                      |

### Database Setup

**Option A: Docker (local development)**

```bash
docker compose up -d
```

**Option B: Neon (serverless)**

Create a database at [neon.tech](https://neon.tech) and set `DATABASE_URL`.

Then push the schema:

```bash
# Create the required role first (one-time)
psql $DATABASE_URL -c "CREATE ROLE app_user NOLOGIN;"

# Push schema to database
pnpm run db:push
```

### Development

```bash
pnpm run dev
```

### Build

```bash
pnpm run build
```

## Scripts

| Command                 | Description                        |
| ----------------------- | ---------------------------------- |
| `pnpm run dev`          | Start all apps in development mode |
| `pnpm run build`        | Build all apps and packages        |
| `pnpm run lint`         | Lint all apps                      |
| `pnpm run test`         | Run all tests                      |
| `pnpm run format`       | Format all files with Prettier     |
| `pnpm run format:check` | Check formatting without writing   |
| `pnpm run db:push`      | Push schema to database            |
| `pnpm run db:generate`  | Generate migration files           |
| `pnpm run db:migrate`   | Run migrations                     |
| `pnpm run db:studio`    | Open Drizzle Studio                |

## Database Schema

25 tables across 10 schema modules with 12 Row-Level Security policies:

```
Community       → communities, memberships, invites
Spaces          → spaces, posts, comments, reactions
Courses         → courses, modules, lessons, enrollments, progress
Content         → events, event attendees
Billing         → plans, subscriptions, invoices, payment methods
Gamification    → points, badges, leaderboard
Notifications   → notification preferences, delivery
Media           → file uploads, attachments
```

All tenant-scoped tables are protected by RLS policies using `app.current_tenant_id`, ensuring database-level isolation between communities.

## Architecture

```
┌─────────────────────────────────────────┐
│              Next.js 16 App             │
│            (App Router + RSC)           │
├─────────────────────────────────────────┤
│          BetterAuth (planned)           │
│     withCommunity() HOF (planned)       │
├─────────────────────────────────────────┤
│            Drizzle ORM                  │
│    Type-safe queries + relations        │
├─────────────────────────────────────────┤
│          PostgreSQL (Neon)              │
│   RLS policies · Composite indexes     │
│   25 tables · 9 enums · 30+ indexes    │
└─────────────────────────────────────────┘
```

## Contributing

Contributions are welcome! Please read the codebase conventions before submitting:

1. Fork the repo and create a branch from `main`
2. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.)
3. Ensure `pnpm run build`, `pnpm run lint`, and `pnpm run format:check` all pass
4. Submit a pull request

## License

AGPLv3 — see [LICENSE](LICENSE) for details.

Enterprise features under `apps/web/(ee)/` and `packages/ee/` are licensed separately under a commercial license.
