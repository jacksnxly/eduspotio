# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-23

### Added

- Authentication system with email/password sign-in, email verification via Resend, optional Google OAuth, and organization-based role-based access control
- API route protection with session validation and community-scoped authorization guards for consistent auth across all endpoints
- Configurable verification email sender address via `RESEND_FROM_EMAIL` environment variable, with hardcoded fallback to `noreply@mail.eduspot.io`
- PostgreSQL database schema with 25 domain tables covering communities, spaces, courses, billing, gamification, notifications, and media (32 total including auth tables)
- Row-Level Security policies on all tenant-scoped tables for secure multi-tenant data isolation
- Monorepo project structure with pnpm workspaces, Turborepo, shared ESLint and TypeScript configs, and Docker Compose for local development
- Next.js 16 webapp with Zod environment validation and structured error responses via `ApiError` class

