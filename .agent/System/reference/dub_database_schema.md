# Dub.co Database Schema Analysis

Detailed analysis of Dub.co's database architecture for reference.

---

## Database Technology

| Component | Technology |
|-----------|------------|
| Database | MySQL (PlanetScale serverless) |
| ORM | Prisma 6.19.1 |
| Relation Mode | `prisma` (no foreign key constraints) |
| Edge Support | @prisma/adapter-planetscale |

---

## Schema Organization

**70 models** across **31 modular `.prisma` files**:

```
packages/prisma/schema/
├── schema.prisma       # Config + Auth (User, Account, Session)
├── workspace.prisma    # Project, ProjectUsers, ProjectInvite
├── link.prisma         # Core link entity
├── domain.prisma       # Custom domains
├── tag.prisma          # Tagging system
├── partner.prisma      # Affiliate partners
├── program.prisma      # Affiliate programs
├── customer.prisma     # End customers
├── webhook.prisma      # Event webhooks
├── token.prisma        # API tokens
├── integration.prisma  # Third-party integrations
├── discount.prisma     # Discount codes
├── reward.prisma       # Reward configuration
├── commission.prisma   # Commission tracking
├── payout.prisma       # Partner payouts
├── invoice.prisma      # Invoices
├── fraud.prisma        # Fraud detection
├── bounty.prisma       # Bounty campaigns
├── folder.prisma       # Link organization
├── oauth.prisma        # OAuth apps
├── notification.prisma # Notifications
├── campaign.prisma     # Marketing campaigns
├── workflow.prisma     # Automation
├── message.prisma      # Direct messaging
├── group.prisma        # Partner groups
├── utm.prisma          # UTM templates
├── dashboard.prisma    # Public dashboards
├── misc.prisma         # Year-in-review, etc.
├── network.prisma      # Program discovery
├── platform.prisma     # Partner platforms
└── jackson.prisma      # SSO (BoxyHQ Jackson)
```

---

## Core Entity Models

### User (Authentication)

```prisma
model User {
  id                   String    @id @default(cuid())
  name                 String?
  email                String?   @unique
  emailVerified        DateTime?
  image                String?
  passwordHash         String?
  invalidLoginAttempts Int       @default(0)
  lockedAt             DateTime?
  isMachine            Boolean   @default(false)
  source               String?
  defaultWorkspace     String?
  defaultPartnerId     String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  // Relations
  accounts             Account[]
  sessions             Session[]
  projects             ProjectUsers[]
  partners             PartnerUser[]
  tokens               Token[]
  // ... more relations
}
```

### Project (Workspace/Tenant)

```prisma
model Project {
  id                   String    @id @default(cuid())
  name                 String
  slug                 String    @unique
  logo                 String?

  // Billing
  plan                 String    @default("free")
  stripeId             String?   @unique
  billingCycleStart    Int?
  paymentFailedAt      DateTime?

  // Usage tracking
  usage                Int       @default(0)
  usageLimit           Int       @default(1000)
  linksUsage           Int       @default(0)
  linksLimit           Int       @default(25)
  domainsLimit         Int       @default(3)
  tagsLimit            Int       @default(5)
  usersLimit           Int       @default(1)
  aiLimit              Int       @default(10)

  // Integrations
  stripeConnectId      String?
  shopifyStoreId       String?

  // SSO
  ssoEnabled           Boolean   @default(false)
  ssoEmailDomain       String?

  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  // Relations
  users                ProjectUsers[]
  invites              ProjectInvite[]
  links                Link[]
  domains              Domain[]
  tags                 Tag[]
  programs             Program[]
  // ... more relations
}
```

### Link

```prisma
model Link {
  id              String    @id @default(cuid())
  domain          String
  key             String    // Short key (e.g., "abc123")
  url             String    @db.LongText
  shortLink       String    @unique
  archived        Boolean   @default(false)
  expiresAt       DateTime?
  expiredUrl      String?
  disabledAt      DateTime?

  // OG Metadata
  proxy           Boolean   @default(false)
  title           String?
  description     String?
  image           String?
  video           String?

  // UTM Parameters
  utm_source      String?
  utm_medium      String?
  utm_campaign    String?
  utm_term        String?
  utm_content     String?

  // Device Targeting
  ios             String?
  android         String?
  geo             Json?

  // A/B Testing
  testVariants    Json?
  testStartedAt   DateTime?
  testCompletedAt DateTime?

  // Analytics (denormalized)
  clicks          Int       @default(0)
  leads           Int       @default(0)
  conversions     Int       @default(0)
  sales           Int       @default(0)
  saleAmount      Int       @default(0)

  // Attribution
  userId          String?
  projectId       String
  folderId        String?
  programId       String?
  partnerId       String?
  externalId      String?
  tenantId        String?

  // Timestamps
  lastClicked     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([domain, key])
  @@unique([projectId, externalId])
  @@index([projectId, folderId, archived, createdAt(sort: Desc)])
  @@index([programId, partnerId])
}
```

---

## Affiliate Program Models

### Partner

```prisma
model Partner {
  id              String    @id @default(cuid())
  name            String
  email           String    @unique
  image           String?
  country         String?
  profileType     PartnerProfileType @default(individual)

  // Payout Methods
  paypalEmail     String?   @unique
  stripeConnectId String?   @unique
  payoutMethodHash String?

  // Verification
  discoverableAt  DateTime?
  trustedAt       DateTime?

  // Social Links (with verification)
  website         String?
  websiteVerifiedAt DateTime?
  youtube         String?
  youtubeVerifiedAt DateTime?
  // ... more social fields

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  programs        ProgramEnrollment[]
  users           PartnerUser[]
  customers       Customer[]
  payouts         Payout[]
  commissions     Commission[]
}
```

### Program (Affiliate Program)

```prisma
model Program {
  id                String    @id @default(cuid())
  workspaceId       String
  name              String
  slug              String    @unique
  domain            String?   @unique
  logo              String?
  url               String?

  // Configuration
  primaryRewardEvent EventType @default(sale)
  minPayoutAmount   Int       @default(10000) // cents
  payoutMode        ProgramPayoutMode @default(internal)

  // Marketplace
  addedToMarketplaceAt DateTime?
  featuredOnMarketplaceAt DateTime?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  workspace         Project   @relation(fields: [workspaceId])
  partners          ProgramEnrollment[]
  rewards           Reward[]
  commissions       Commission[]
  payouts           Payout[]
}
```

### ProgramEnrollment (Partner ↔ Program)

```prisma
model ProgramEnrollment {
  id              String    @id @default(cuid())
  partnerId       String
  programId       String
  status          ProgramEnrollmentStatus @default(pending)

  // Denormalized Stats
  totalClicks     Int       @default(0)
  totalLeads      Int       @default(0)
  totalConversions Int      @default(0)
  totalSales      Int       @default(0)
  totalSaleAmount Int       @default(0)
  totalCommissions Int      @default(0)

  // Calculated Metrics
  netRevenue      Int       @default(0)
  earningsPerClick Float    @default(0)
  clickToLeadRate Float?
  leadToConversionRate Float?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([partnerId, programId])
  @@index([programId, status, totalSaleAmount(sort: Desc)])
}
```

### Commission

```prisma
model Commission {
  id              String    @id @default(cuid())
  programId       String
  partnerId       String
  type            CommissionType
  status          CommissionStatus @default(pending)
  amount          Int       // Sale amount in cents
  earnings        Int       // Partner earnings in cents
  currency        String    @default("usd")

  // Attribution
  linkId          String?
  customerId      String?
  payoutId        String?
  rewardId        String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([programId, partnerId, status])
  @@index([payoutId])
}
```

---

## Key Enums

```prisma
enum ProgramEnrollmentStatus {
  pending
  approved
  rejected
  invited
  declined
  deactivated
  banned
  archived
}

enum CommissionStatus {
  pending
  processed
  paid
  refunded
  duplicate
  fraud
  canceled
}

enum CommissionType {
  click
  lead
  sale
  custom
}

enum EventType {
  click
  lead
  sale
}

enum RewardStructure {
  percentage
  flat
}
```

---

## Indexing Strategy

### Composite Indexes for Multi-Tenancy

```prisma
// Link queries scoped to project
@@index([projectId, folderId, archived, createdAt(sort: Desc)])

// Partner performance within program
@@index([programId, status, totalSaleAmount(sort: Desc)])

// Fraud detection
@@index([programId, partnerId, customerId])
```

### Full-Text Search

```prisma
// Partner search
@@fulltext([email, name])

// Customer search
@@fulltext([email, name])
```

---

## Connection Configuration

```typescript
// Standard client
const prisma = new PrismaClient({
  omit: {
    user: { passwordHash: true }, // Never return password hash
  },
});

// Edge client (serverless)
import { PrismaPlanetScale } from "@prisma/adapter-planetscale";
const adapter = new PrismaPlanetScale(client);
const prismaEdge = new PrismaClient({ adapter });
```

---

## Related Documentation

- [Dub Architecture](dub_architecture.md) - Overall architecture
- [Dub Authentication](dub_authentication.md) - Auth implementation
