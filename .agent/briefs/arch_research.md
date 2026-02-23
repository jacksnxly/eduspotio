# Deep Research Prompt: Architecture & Database Schema for an Open Source Education + Community Platform

## Context

I'm building **Eduspot**, an open source, self-hostable education and community platform. Think the intersection of Skool, Whop, Mighty Networks, and Circle — but open source and whitelabel-ready. The platform combines structured learning (courses, modules, lessons) with community features (feeds, posts, comments, member directories) and monetization (subscriptions, one-time purchases, tiered access).

**My tech stack is already decided:**
- Next.js 16 (App Router) + TypeScript
- PostgreSQL as the primary database
- Drizzle ORM
- Stripe for payments
- BetterAuth for authentication

**What I need from you is a deep, research-backed analysis of how to architect the platform and design the database schema.** Not opinions — I want you to find how existing platforms in this space actually solve these problems, what patterns work at scale, and what mistakes to avoid.

---

## Research Areas

### 1. Multi-Tenancy Architecture

Research how platforms like Mighty Networks, Circle, Bettermode, and Discourse handle multi-tenancy. Specifically:

- **Isolation strategy:** Do they use shared database with tenant_id columns, schema-per-tenant, or database-per-tenant? What are the tradeoffs at different scales (10 tenants vs 1,000 vs 100,000)?
- **Row-Level Security (RLS):** Do any of these platforms use PostgreSQL RLS for tenant isolation? What are the real-world performance implications?
- **Custom domains:** How do platforms like Kajabi, Teachable, and Mighty Networks handle custom domain mapping per tenant? What's the DNS/SSL infrastructure look like (wildcard certs, Let's Encrypt automation, Caddy/Nginx reverse proxy)?
- **Theming per tenant:** How is per-tenant branding (colors, logos, fonts) stored and resolved? Is it a JSON config column, a separate config table, or CSS variable injection?

I want to understand which approach is best for an open source project where someone might self-host for a single community OR run it as a multi-tenant SaaS.

### 2. Database Schema Design

Research the actual data models used by community + education platforms. I want schema patterns, not just entity lists. Specifically:

**Core entities I need covered:**
- Users / Members (with multi-tenant awareness)
- Tenants / Organizations / Communities
- Roles & Permissions (RBAC — how do Skool, Circle, Discourse model roles?)
- Posts / Feed items (polymorphic content types: text, prompt, announcement, welcome)
- Comments / Threads (flat vs nested — what do Skool and Circle actually use?)
- Reactions / Likes
- Courses / Modules / Lessons (hierarchical content — how does Teachable, Kajabi, or Thinkific structure this?)
- Enrollments / Progress tracking
- Subscriptions / Plans / Payments (Stripe integration patterns)
- Notifications
- Media / Uploads

**Specific questions:**
- How do platforms handle **polymorphic content** (a feed that shows posts, course updates, member intros, and announcements)? Single table with a `type` column? Separate tables with a union view? Join table pattern?
- How is **course progress** tracked? Per-lesson completion? Percentage-based? What about drip content (time-locked or completion-locked lessons)?
- How do Stripe subscription models map to database schema? How is the relationship between Stripe's `subscription`, `price`, `product` objects and the platform's internal `plan`, `membership`, `access` concepts modeled?
- How do platforms handle **soft deletes** vs hard deletes for user-generated content?
- What **indexes** are critical for a feed-based application with tenant isolation?

### 3. Authorization & Permissions Model

Research how community platforms handle granular permissions:

- **Role hierarchy:** How do Skool, Circle, Mighty Networks define roles (Owner, Admin, Moderator, Member, Guest)?
- **Resource-level permissions:** Can a Moderator in Space A have different permissions than in Space B? How is this modeled?
- **Content access control:** How do platforms gate content behind subscription tiers? Is it role-based, plan-based, or tag-based?
- **RBAC vs ABAC:** Which model do most community platforms use? Are there any using attribute-based access control?

Find specific examples of permission schemas from open source projects like Discourse, Forem (dev.to), Matrix/Element, or Livekit-based platforms.

### 4. Content & Feed Architecture

Research how the social feed works at a database level:

- **Feed generation:** Fan-out on write (pre-compute feeds per user) vs fan-out on read (query at request time)? What do platforms like Circle and Mighty Networks use?
- **Content ordering:** How are feeds sorted? Pure chronological? Algorithmic? Activity-based (bump on new comment)?
- **Spaces/Channels:** How do platforms organize content into sub-communities? How does this affect the schema? Is a "Space" just a foreign key on posts, or is it a more complex structure?
- **Rich text storage:** How is rich text (from editors like Tiptap/ProseMirror) stored? Raw JSON (ProseMirror doc), HTML string, or Markdown? What are the tradeoffs for search, rendering, and migration?

### 5. Scalability Patterns

Research what breaks first when community platforms scale:

- **N+1 queries:** What are the most common N+1 patterns in feed-based apps and how are they solved?
- **Notification systems:** How do platforms handle notifications at scale? Separate notifications table with polling? Server-Sent Events? WebSockets? What's the pragmatic choice for an MVP that can scale?
- **Full-text search:** How do Discourse and other community platforms handle search? PostgreSQL full-text search vs Elasticsearch/Meilisearch? At what scale does pg_trgm stop being enough?
- **File/media handling:** How do platforms store and serve user uploads? Direct to S3 with signed URLs? Through the application? CDN patterns?

### 6. Open Source Reference Implementations

Find and analyze the database schemas and architectures of these open source projects:

- **Discourse** (Ruby — the gold standard for community forums)
- **Forem** (Ruby — dev.to's platform)
- **Loomio** (Ruby — collaborative decision-making)
- **Canvas LMS** (Ruby — education-focused)
- **Moodle** (PHP — largest open source LMS)
- **Cal.com** (Next.js — multi-tenant SaaS patterns)
- **Formbricks** (Next.js — multi-tenant with Prisma/Drizzle)
- **Documenso** (Next.js — multi-tenant patterns)
- **Huly** (TypeScript — project management with real-time)

For each, I want:
- How they handle multi-tenancy
- Their core schema decisions (especially around content, permissions, and relationships)
- What they got right and what developers commonly complain about
- Any migration pain points that suggest the original schema was a mistake

---

## Output Format

Structure your research as:

1. **Executive Summary** — The recommended architecture in 1 paragraph
2. **Multi-Tenancy Recommendation** — With specific justification and migration path
3. **Complete Database Schema** — As a Drizzle ORM compatible schema with table definitions, relationships, indexes, and comments explaining each design decision
4. **Authorization Model** — Recommended approach with schema
5. **Feed Architecture** — Recommended approach with query patterns
6. **Scalability Notes** — What to build now vs what to defer
7. **Lessons from Open Source** — Key takeaways from reference implementations
8. **Anti-Patterns to Avoid** — Specific mistakes other platforms made that I should not repeat

For the database schema, I want actual table definitions with column types, not just entity-relationship diagrams. Include the reasoning for each design choice (e.g., "UUID vs serial for primary keys because...").

---

## What I Don't Need

- Generic advice like "use indexes" or "normalize your data"
- Theoretical comparisons without real-world evidence
- Recommendations for different tech stacks (I've already decided on Next.js + PostgreSQL + Drizzle)
- AI-generated schema that isn't backed by research into how existing platforms actually do it