---
status: PENDING TECHNICAL REVIEW
author: jacksnxly
created: 2026-02-23
feature: Auth System
---

# Feature Brief: Auth System

## Problem

**Persona:** Community creator — someone who wants to set up an online community with courses, discussions, and events on eduspotio.

**Trigger:** A creator arrives at the platform to set up their community but has no way to create an account. There is no sign-up, no login, no identity system at all.

**Current State:** Nothing exists. The platform has raw Next.js pages with no auth gates, no user identity, and no access control. Every request is anonymous.

**Pain:** Auth is a total foundation blocker. Every planned feature — courses, communities, events, payments, gamification — requires knowing who the user is. Without auth:

- No features can ship (all depend on user identity)
- No real user flows can be tested
- No contributors can work on user-facing features

## Solution

### Backend Auth Foundation (no frontend UI in this phase)

**Step 1: Sign-Up**

A new user registers via one of two methods:

- **Email + password** — user provides email and password. The system sends a verification email. The user must click the verification link before accessing any platform features.
- **Google OAuth** — user authenticates via Google. No email verification needed (Google has already verified the email). If an account with the same email already exists (from email+password sign-up), the Google account is auto-linked to the existing user.

If a user tries to register with an email that's already taken (email+password), the system responds: "An account with this email already exists. Sign in instead."

Password requirements: BetterAuth defaults.

**Step 2: Bundled Onboarding**

After sign-up, the user is immediately prompted to either create a new community or join an existing one. Sign-up and community association are a single onboarding flow — there is no "account without a community" state in the standard flow.

**Step 3: Multi-Community Membership**

A single user can belong to multiple communities simultaneously, with a different role in each. For example, a user could be an owner of Community A and a member of Community B.

**Step 4: Hierarchical RBAC**

Four community roles in ascending privilege order:

| Role | Permissions (cumulative — each includes all below) |
|------|---------------------------------------------------|
| **Member** | View content, join discussions |
| **Creator** | Publish courses and lessons |
| **Moderator** | Manage members, moderate discussions |
| **Owner** | Manage community settings, billing, delete community |

- The user who creates a community is automatically assigned the **Owner** role.
- Owners can promote/demote members to any role.
- Ownership is **transferable** — an owner can transfer ownership to any member (the original owner is demoted to moderator).

**Step 5: Session Management**

Use BetterAuth's default session handling out of the box.

## Examples

### Happy Path

**Input:** A creator signs up with email `alice@example.com` and password `SecurePass123`. She clicks the verification link in her inbox. She then creates a community called "Design Mastery".

**Output:** User `alice@example.com` is created with `emailVerified: true`. A community "Design Mastery" is created. Alice is assigned the `owner` role for that community. A session is established.

### Edge Case: Account Linking

**Input:** Bob signed up with email+password as `bob@example.com` two weeks ago. Today he clicks "Sign in with Google" using the same `bob@example.com` Gmail address.

**Output:** The system detects that `bob@example.com` already exists. The Google OAuth account is automatically linked to Bob's existing account. Bob is signed in to his original account with all his existing community memberships intact.

### Error Case: Duplicate Registration

**Input:** Carol tries to sign up with email+password using `carol@example.com`, but an account with that email already exists.

**Output:** The system responds with: "An account with this email already exists. Sign in instead." No new account is created.

### Edge Case: Account Deletion with Owned Communities

**Input:** Dave wants to delete his account. He owns two communities: "Code Club" and "Music Hub".

**Output:** The system prevents deletion: "You own 2 communities. Transfer or delete them before deleting your account." Dave must transfer ownership of each community to another member (or delete the community) before account deletion can proceed.

### Edge Case: Member Removal

**Input:** An owner removes a member from their community.

**Output:** The member's community access is revoked. Their content (posts, comments, course progress) is preserved and attributed to a "deleted member" placeholder. They can no longer access the community.

## Scope

### In Scope

- BetterAuth integration with the existing Drizzle + PostgreSQL stack
- Email + password sign-up with email verification
- Google OAuth sign-up/sign-in
- Auto-linking accounts when the same email is used across providers
- Bundled onboarding (sign-up triggers community create/join)
- Multi-community membership with per-community roles
- Hierarchical RBAC: member < creator < moderator < owner
- Ownership transfer between members
- Account deletion (requires transferring/deleting owned communities first)
- Session management via BetterAuth defaults
- Auth-related database schema (users, sessions, accounts, community memberships, roles)

### Out of Scope

- **Frontend UI** — no auth pages, forms, or components in this phase
- **Password reset flow** — deferred to a future brief
- **Admin dashboard** — platform-level admin interface is a separate feature
- **Invite system** — inviting users to communities via email/link is deferred
- **Two-factor authentication (2FA)** — deferred to a future security hardening phase
- **Rate limiting** — API rate limiting and brute-force protection deferred

## Open Questions

1. Should there be a platform-level "superadmin" role above community owners (for instance-wide moderation)? Deferred but worth noting.
2. What is the exact "join a community" flow during onboarding — search, browse, or enter a code? Needs a separate brief when frontend is in scope.
3. Should the "deleted member" placeholder show the original display name or be fully anonymized?

## Priority

**Foundation blocker — no deadline, highest priority.**

Auth is the next logical infrastructure layer. Every feature planned for eduspotio (courses, communities, events, payments, gamification) depends on user identity and access control. No features can be built, tested, or contributed to until this exists. There is no external deadline, but the entire project is blocked until this is in place.
