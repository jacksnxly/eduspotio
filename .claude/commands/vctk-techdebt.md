---
description: "Scan codebase for tech debt: duplicated code, TODOs, dead code, and inconsistencies"
allowed-tools: ["Read", "Glob", "Grep", "Bash", "AskUserQuestion"]
---

# Tech Debt Scanner

You are a TECH DEBT ANALYST. Your job is to systematically scan the codebase for code smells, duplication, dead code, and inconsistencies — then produce a prioritized, actionable report.

Inspired by: *"Build a /techdebt slash command and run it at the end of every session to find and kill duplicated code."* — Boris Cherny, creator of Claude Code

---

## Step 1: Determine Scope

```
AskUserQuestion({
  questions: [{
    question: "What scope should I scan for tech debt?",
    header: "Scope",
    options: [
      { label: "Full project", description: "Scan the entire codebase" },
      { label: "Recent changes", description: "Only files changed in the last 5 commits" },
      { label: "Specific directory", description: "I'll specify which folder to scan" }
    ],
    multiSelect: false
  }]
})
```

If "Recent changes":
```bash
git diff HEAD~5 --name-only --diff-filter=ACMR
```

If "Specific directory" → ask which directory.

---

## Step 2: Identify Tech Stack

Before scanning, determine what we're working with:

```bash
ls package.json Cargo.toml pyproject.toml requirements.txt go.mod Gemfile composer.json *.csproj 2>/dev/null
```

Adapt scan patterns to the detected language/framework.

---

## Step 3: Run Scans

Execute these scans in order. For each category, collect findings with file:line references.

### Scan 1: TODO / FIXME / HACK Comments

Search for markers that indicate known debt:

```
Grep: pattern="(TODO|FIXME|HACK|XXX|WORKAROUND|TEMP|TEMPORARY|DEPRECATED)"
```

For each finding, classify:
- **Actionable** — has clear intent, could be fixed now
- **Stale** — been there for a long time with no context
- **Vague** — no useful information ("TODO: fix this")

### Scan 2: Code Duplication

Look for duplicated patterns:

1. Search for functions/methods with similar names or signatures
2. Look for repeated code blocks (3+ similar lines appearing in multiple files)
3. Check for copy-paste patterns (same logic in different locations with minor variations)

Use Grep to find repeated patterns:
```
Grep: pattern="function [name]|def [name]|const [name]"
```

Cross-reference results to identify near-duplicates.

### Scan 3: Dead Code

Search for potentially unused code:

1. **Unused exports** — exported functions/classes not imported elsewhere
2. **Commented-out code** — blocks of commented code (not documentation comments)
3. **Unreachable code** — code after returns, breaks, or in always-false branches
4. **Unused variables** — declared but never referenced (check cautiously)

```
Grep: pattern="^(//|#)\s*(function|def |class |const |let |var |export)"
```

### Scan 4: Inconsistent Patterns

Look for inconsistency within the codebase:

1. **Naming conventions** — mixing camelCase and snake_case within the same language
2. **Error handling** — some places use try/catch, others don't; mixed patterns
3. **Import styles** — mixing default/named imports, relative/absolute paths
4. **API patterns** — inconsistent response shapes, status codes, or error formats
5. **File structure** — some modules well-organized, others flat dumps

### Scan 5: Dependency Health

Check for dependency issues:

```bash
# Node.js
cat package.json 2>/dev/null | head -100

# Python
cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null | head -50

# Check for duplicate/conflicting deps
# Check for very old pinned versions
```

Look for:
- Duplicate dependencies (same thing, different packages)
- Very old pinned versions
- Unused dependencies (declared but not imported anywhere)
- Missing from lock file

### Scan 6: Complexity Hotspots

Identify overly complex files:

1. **Large files** — files with 300+ lines that might need splitting
2. **Deep nesting** — functions with 4+ levels of indentation
3. **Long functions** — functions with 50+ lines
4. **Many parameters** — functions taking 5+ parameters

```bash
# Find large files (excluding common non-code directories)
find . -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.rs" -o -name "*.go" | grep -v node_modules | grep -v .git | grep -v dist | grep -v build | xargs wc -l 2>/dev/null | sort -rn | head -20
```

---

## Step 4: Prioritize Findings

Score each finding on two axes:

**Impact** (how much it hurts the codebase):
- **High** — Causes bugs, blocks features, confuses developers regularly
- **Medium** — Slows development, makes changes harder
- **Low** — Cosmetic, minor inconsistency

**Effort** (how hard to fix):
- **Quick** — Under 15 minutes, single file
- **Medium** — 1-2 hours, few files
- **Large** — Half day+, structural change

Priority matrix:
| | Quick Fix | Medium Effort | Large Effort |
|---|-----------|--------------|-------------|
| **High Impact** | P0 — Fix now | P1 — Fix soon | P2 — Plan it |
| **Medium Impact** | P1 — Fix soon | P2 — Plan it | P3 — Backlog |
| **Low Impact** | P2 — Plan it | P3 — Backlog | P4 — Ignore |

---

## Step 5: Generate Report

```markdown
# Tech Debt Report

**Date:** [YYYY-MM-DD]
**Scope:** [Full project / Recent changes / Directory]
**Files scanned:** [N]

## Summary

| Category | Findings | Critical |
|----------|----------|----------|
| TODOs/FIXMEs | [N] | [N actionable] |
| Code Duplication | [N] patterns | [N high-impact] |
| Dead Code | [N] candidates | [N confirmed] |
| Inconsistencies | [N] | [N patterns] |
| Dependency Issues | [N] | [N risky] |
| Complexity Hotspots | [N] | [N files] |

**Overall Health:** [Good / Fair / Needs Attention / Critical]

## P0 — Fix Now (High Impact, Quick Fix)

### 1. [Title]
**File:** `[path:line]`
**Issue:** [Description]
**Fix:** [Concrete suggestion]

## P1 — Fix Soon

### 1. [Title]
**File:** `[path:line]`
**Issue:** [Description]
**Fix:** [Concrete suggestion]

## P2 — Plan It

[Grouped by category, briefer descriptions]

## P3/P4 — Backlog

[One-line items for tracking]

## Duplication Map

[If significant duplication found, show which files share logic]

| Pattern | Locations | Suggestion |
|---------|-----------|------------|
| [Logic description] | `file1:line`, `file2:line` | Extract to shared utility |

## Complexity Hotspots

| File | Lines | Issue | Suggestion |
|------|-------|-------|------------|
| [path] | [N] | [Too long / deep nesting / etc.] | [Split / refactor] |
```

---

## Step 6: Next Actions

```
AskUserQuestion({
  questions: [{
    question: "What would you like to do with these findings?",
    header: "Action",
    options: [
      { label: "Fix P0s now", description: "Tackle the high-impact quick fixes right now" },
      { label: "Create issues", description: "Turn findings into trackable issues" },
      { label: "Save report", description: "Save to .agent/System/techdebt-report.md for later" },
      { label: "Done", description: "Just wanted the overview — I'll handle it" }
    ],
    multiSelect: false
  }]
})
```

If "Fix P0s now" → work through each P0 item, making the fix and verifying it.

If "Create issues" → check if issue toolkit is available, create issues for P0-P2 items.

If "Save report" → write to `.agent/System/techdebt-report-[YYYY-MM-DD].md`.

---

## Rules

1. **DO** focus on patterns, not individual style nitpicks
2. **DO** provide concrete file:line references for every finding
3. **DO** suggest specific fixes, not vague "clean this up"
4. **DO** skip vendor code, generated code, and lock files
5. **DO NOT** report issues that linters/formatters would catch (that's their job)
6. **DO NOT** flag framework conventions as tech debt (e.g., Next.js file naming)
7. **DO NOT** suggest refactoring working code just because you'd write it differently
8. **DO NOT** count test files as "complexity hotspots" — test files are expected to be long
9. **DO** run this regularly — tech debt compounds when ignored
