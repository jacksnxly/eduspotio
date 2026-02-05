# Dub.co Architecture Analysis

Reference architecture research from [Dub.co](https://github.com/dubinc/dub) - an open source link management platform.

## Why Dub as Reference?

- Open source with AGPL + EE licensing model (same as eduspotio)
- Modern monorepo structure
- Battle-tested SaaS architecture
- Multi-tenant workspace model
- Affiliate/partner program system

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Database | MySQL (PlanetScale serverless) |
| ORM | Prisma 6.x |
| Auth | NextAuth.js (Auth.js) |
| Cache/Rate Limit | Upstash Redis |
| Email | Resend |
| Storage | Cloudflare R2 |
| Analytics | Tinybird |
| Enterprise SSO | BoxyHQ Jackson |
| Payments | Stripe |

---

## Monorepo Structure

```
dub/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/
│       │   ├── (ee)/           # Enterprise Edition (separate license)
│       │   ├── api/            # API routes
│       │   └── ...
│       └── lib/
│           ├── auth/           # Authentication logic
│           ├── api/            # API utilities
│           └── ...
├── packages/
│   ├── prisma/                 # Database schema & client
│   │   ├── schema/             # Modular .prisma files (31 files)
│   │   └── client.ts           # Prisma client exports
│   ├── email/                  # Email templates (React Email)
│   ├── ui/                     # Shared UI components
│   ├── utils/                  # Shared utilities
│   ├── tailwind-config/        # Shared Tailwind config
│   └── ee/                     # Enterprise packages
└── ...
```

---

## Key Patterns

### 1. Modular Prisma Schema

Instead of one giant `schema.prisma`, Dub splits into 31 domain-specific files:

```
packages/prisma/schema/
├── schema.prisma       # Main config + User/Account/Session
├── workspace.prisma    # Project, ProjectUsers, ProjectInvite
├── link.prisma         # Link model
├── partner.prisma      # Partner, PartnerUser
├── program.prisma      # Affiliate programs
├── commission.prisma   # Earnings tracking
├── fraud.prisma        # Fraud detection
└── ... (24 more)
```

### 2. Multi-Tenancy via Workspace

- `Project` model = Workspace (primary tenant)
- All entities scoped by `projectId`
- Team members via `ProjectUsers` with roles (owner/member)
- Invites via `ProjectInvite`

### 3. Denormalized Metrics

Pre-calculate expensive aggregations:

```prisma
model ProgramEnrollment {
  totalClicks        Int
  totalLeads         Int
  totalSales         Int
  totalCommissions   Int
  // Avoids expensive COUNT queries
}
```

### 4. JSON Fields for Flexibility

```prisma
model Link {
  geo           Json?   // Device geo-targeting
  testVariants  Json?   // A/B test config
}

model Program {
  embedData     Json?   // UI customization
  resources     Json?   // Dynamic resources
}
```

### 5. Soft Deletes via Status Fields

No `deletedAt` pattern. Instead:

```prisma
model Link {
  archived    Boolean   @default(false)
  disabledAt  DateTime?
  expiresAt   DateTime?
}
```

---

## Database Statistics

| Metric | Value |
|--------|-------|
| Total Models | 70 |
| Schema Files | 31 |
| Enums | 31 |
| Core Tables | ~15 |
| Supporting Tables | ~55 |

---

## Relevance for Eduspotio

### Direct Parallels

| Dub Entity | Eduspotio Equivalent |
|------------|----------------------|
| Project (Workspace) | School/Community |
| Link | Course/Lesson (tracking) |
| Partner | Creator/Instructor |
| Program | Affiliate/Referral program |
| Customer | Student/Member |
| Commission | Creator earnings |

### Patterns to Adopt

1. **Modular Prisma schemas** - One file per domain
2. **PlanetScale + Prisma** - Serverless MySQL
3. **Denormalized stats** - Pre-calculate for dashboards
4. **JSON fields** - Flexible metadata without migrations
5. **Composite indexes** - For tenant-scoped queries
6. **EE directory pattern** - Same licensing model

---

## Related Documentation

- [Dub Database Schema](dub_database_schema.md) - Full schema analysis
- [Dub Authentication](dub_authentication.md) - Auth implementation details
