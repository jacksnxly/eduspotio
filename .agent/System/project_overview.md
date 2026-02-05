# Eduspotio - Project Overview

## What is Eduspotio?

**eduspotio** is an open source education platform for creators and communities.

Comparable to Skool, Mighty Networks, and Whop - but open source.

## Core Features (Planned)

| Feature | Description |
|---------|-------------|
| Courses & Lessons | Structured learning content with progress tracking |
| Communities & Groups | Member spaces, discussions, and engagement |
| Live Events & Calls | Scheduled sessions, webinars, and live streaming |
| Payments & Subscriptions | Monetization, billing, and membership tiers |
| Gamification | Points, badges, leaderboards, and achievements |

## Tech Stack

**Status:** TBD

We're researching reference architectures from similar projects. See `reference/dub_architecture.md`.

## Repository Structure

**Type:** Monorepo

```
eduspotio/
├── apps/
│   └── web/           # Next.js web application (planned)
├── packages/
│   ├── prisma/        # Database schema and client (planned)
│   ├── ui/            # Shared UI components (planned)
│   └── ee/            # Enterprise Edition features (planned)
├── .agent/            # Documentation for engineers
├── CLAUDE.md          # AI assistant instructions
├── AGENTS.md          # Codex instructions (identical to CLAUDE.md)
└── LICENSE            # AGPL v3 + EE carve-outs
```

## License

- **Open Source:** AGPL v3
- **Enterprise:** Separate commercial license for `apps/web/(ee)/` and `packages/ee/`

Copyright (c) 2025-present VenturePoint LLC

## Reference Architecture

We're using [Dub.co](https://github.com/dubinc/dub) as inspiration for:

1. **Monorepo structure** - Apps + packages organization
2. **Database** - Prisma + PlanetScale (MySQL)
3. **Authentication** - NextAuth.js with multiple providers
4. **Enterprise features** - EE directory licensing model

See `reference/` folder for detailed analysis.

## Related Documentation

- [Dub Architecture Analysis](reference/dub_architecture.md)
- [Dub Database Schema](reference/dub_database_schema.md)
- [Dub Authentication](reference/dub_authentication.md)
