# .agent Documentation Index

This folder contains all project documentation for engineers working on **eduspotio**.

## Project Status

**Phase:** Pre-development (Architecture Research)
**Tech Stack:** TBD

## Quick Start

- **New to project?** Read `System/project_overview.md`
- **Reference architecture?** See `System/reference/` for research on similar projects
- **Need to do X?** Check `SOP/` for how-to guides
- **Working on feature?** Check `briefs/` and `specs/` for VCTK workflow docs

## Documentation Map

| Folder | Purpose | Status |
|--------|---------|--------|
| `System/` | Architecture & state docs | `project_overview.md` created |
| `System/reference/` | Research on reference projects | Dub.co analysis complete |
| `SOP/` | How-to guides | Empty (TBD with tech stack) |
| `Tasks/` | PRD & implementation plans | Empty |
| `briefs/` | Feature briefs (VCTK Phase 1) | Empty |
| `specs/` | Technical specs (VCTK Phase 2) | Empty |
| `sessions/` | Developer session history | Per-developer folders |

## Reference Architecture Research

We're using [Dub.co](https://github.com/dubinc/dub) as a reference for:
- Monorepo structure
- Database architecture (Prisma + PlanetScale)
- Authentication (NextAuth.js)
- Enterprise features (EE licensing)

See `System/reference/dub_architecture.md` for full analysis.

## VCTK Workflow

This project uses the vibe-coding-toolkit for structured development:

```
Phase 1: /feature-brief    → briefs/{feature}.md
Phase 2: /technical-spec   → specs/{feature}.md
Phase 3: /implement-feature → Code changes
Phase 4: /review-code      → Approval or fixes
```

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - AI assistant instructions
- [LICENSE](../LICENSE) - AGPL v3 + EE carve-outs
