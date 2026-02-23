---
description: "Save session context for continuity across conversations"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "AskUserQuestion"]
---

# Save Session

You are an expert session documenter. Create comprehensive session summaries that capture all changes and context, ensuring any engineer or LLM can understand exactly what was accomplished.

## Step 1: Get Developer Identity

```bash
git config user.name
```

Store as `$DEV_USERNAME`.

## Step 2: Create Developer Folder

```bash
mkdir -p .agent/sessions/{$DEV_USERNAME}
```

## Step 3: Analyze Session

Gather information about what happened this session:

1. **Check git status** for modified/added files
2. **Check recent commits** if any were made
3. **Review conversation context** for what was discussed/built
4. **Check .agent/briefs/** for new feature briefs created
5. **Check .agent/specs/** for new specs created

## Step 4: Generate Session Summary

Write to `.agent/sessions/{$DEV_USERNAME}/last_session.md`:

```markdown
# Session Summary [YYYY-MM-DD]

## Developer

**Git Username:** `{$DEV_USERNAME}`

## Session Objective

[Clear statement of what this session aimed to accomplish]

## Files Modified

### Created
- `path/to/file.ext` - [purpose]

### Modified
- `path/to/file.ext` - [what changed]

### Deleted
- `path/to/file.ext` - [reason]

## Implementation Details

### Main Changes
[Detailed explanation of what was built/fixed/refactored]

### Technical Decisions
[Key choices made and reasoning]

### Code Structure
[If new patterns or architecture was introduced]

## Workflow Progress

| Phase | Document | Status |
|-------|----------|--------|
| Brief | .agent/briefs/BRIEF-*.md | [Created/Updated/N/A] |
| Spec | .agent/specs/SPEC-*.md | [Created/Updated/N/A] |
| Implementation | [files] | [In Progress/Complete/N/A] |
| Review | [audit] | [Passed/Pending/N/A] |

## Testing & Validation

[What was tested and results]

## Current State

[Where the project stands after this session]

## Blockers/Issues

- [Any unresolved problems]
- [TODOs that weren't completed]

## Next Steps

1. [Priority task for next session]
2. [Secondary tasks]

## Related Documentation

- [Links to relevant docs in .agent folder]
```

## Step 5: Evaluate CLAUDE.md Lessons

Before confirming the save, evaluate whether this session produced lessons worth persisting to `CLAUDE.md`.

### Scan the Session For:

1. **Corrections you received** — The user corrected your approach, naming, tool choice, or assumptions
2. **Repeated failures** — Something failed multiple times before you got it right
3. **Project conventions discovered** — Patterns, naming rules, or architecture decisions that future sessions should know
4. **User preferences expressed** — Explicit instructions about how they want things done
5. **Framework/tool gotchas** — Unexpected behavior that caused bugs or confusion

### Decision Logic

**Propose CLAUDE.md updates when ANY of these are true:**
- The user corrected you and the correction applies to future work (not a one-off)
- You discovered a project convention not already documented in `CLAUDE.md`
- A tool or framework behaved unexpectedly and the workaround should be remembered
- The user explicitly stated a preference that should persist

**Skip CLAUDE.md updates when ALL of these are true:**
- No corrections were made during the session
- No new conventions or patterns were discovered
- The session was routine work following existing rules

### If Lessons Found

Read the current `CLAUDE.md`:

```bash
cat CLAUDE.md 2>/dev/null || echo "NO_CLAUDE_MD"
```

Filter out lessons that already exist as rules. Then present only the genuinely new ones:

```
AskUserQuestion({
  questions: [{
    question: "I found [N] lessons from this session that could improve future work. Want to save them to CLAUDE.md?",
    header: "Learn",
    options: [
      { label: "Yes, show me", description: "Review and approve the lessons before saving" },
      { label: "Save all", description: "Trust my judgment — add them all to CLAUDE.md" },
      { label: "Skip", description: "Don't update CLAUDE.md this time" }
    ],
    multiSelect: false
  }]
})
```

**If "Yes, show me":**

Present each lesson:
```
1. **[Short title]**: [Imperative rule]
   _Source: [What triggered this — user correction, failed attempt, discovery]_
```

Then ask which to keep.

**If "Save all":**

Proceed directly to updating.

**If "Skip":**

Continue to Step 6 without changes.

### Updating CLAUDE.md

When adding lessons:

1. Look for an existing `## Learned Rules` section in `CLAUDE.md`
2. If it exists → append new bullets
3. If not → create the section at the end of the file
4. Each rule: `- [Imperative instruction] <!-- learned YYYY-MM-DD -->`
5. Use the Edit tool for targeted updates — do NOT rewrite the entire file
6. If no `CLAUDE.md` exists at all → skip (suggest running `/vctk-learn` for full setup)

### If No Lessons Found

Say nothing about CLAUDE.md. Proceed silently to Step 6.

---

## Step 6: Confirm Save

After writing, confirm:

```
Session saved to .agent/sessions/{$DEV_USERNAME}/last_session.md
[If CLAUDE.md updated: "CLAUDE.md updated with [N] learned rules."]

Summary:
- [1-2 sentence summary of session]
- Next: [Primary next step]
```

---

## Guidelines

- Run this at the end of each coding session before switching context
- Include enough detail to resume work after time away
- Reference specific file paths and line numbers where relevant
- Capture the "why" behind decisions, not just the "what"
- Keep it concise but complete
- The CLAUDE.md learning step should feel natural — not forced. Only propose rules that genuinely help future sessions
