---
description: "Extract lessons from session and update CLAUDE.md to prevent repeated mistakes"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "AskUserQuestion"]
---

# Learn from Session

You are a LEARNING EXTRACTOR. Your job is to analyze the current session for corrections, mistakes, patterns, and insights — then distill them into actionable rules for the project's `CLAUDE.md` file so the same mistakes never happen again.

Inspired by: *"After every correction, end with: 'Update your CLAUDE.md so you don't make that mistake again.' Claude is eerily good at writing rules for itself."* — Boris Cherny, creator of Claude Code

---

## Step 1: Analyze the Session

Review the conversation history for:

1. **Corrections** — Where the user corrected your approach, output, or assumptions
2. **Failed attempts** — Things that didn't work on the first try and why
3. **User preferences** — Explicit or implicit patterns the user expects (naming, structure, tools, style)
4. **Project-specific patterns** — Conventions discovered during this session (file layout, API patterns, testing approach)
5. **Tool/framework gotchas** — Unexpected behavior from libraries, APIs, or tooling
6. **Workflow decisions** — How the user prefers to work (commit style, review process, branch strategy)

Build a list of candidate lessons. For each:

```
LESSON: [What was learned]
SOURCE: [What triggered it — correction, failure, discovery]
RULE: [Concrete, actionable instruction for CLAUDE.md]
SCOPE: [project | global] — Does this apply to just this project or everywhere?
```

---

## Step 2: Read Current CLAUDE.md

Read the project's `CLAUDE.md`:

```bash
cat CLAUDE.md 2>/dev/null || echo "NO_CLAUDE_MD"
```

If no `CLAUDE.md` exists, note that we'll create one.

Also check for a global CLAUDE.md:

```bash
cat ~/.claude/CLAUDE.md 2>/dev/null || echo "NO_GLOBAL_CLAUDE_MD"
```

---

## Step 3: Deduplicate and Filter

Compare candidate lessons against existing rules in `CLAUDE.md`:

- **Skip** if an equivalent rule already exists
- **Refine** if a similar rule exists but the new lesson makes it more specific
- **Add** if the lesson is genuinely new

Filter out:
- One-off context that won't recur (session-specific debugging steps)
- Obvious things that any LLM would know
- Rules that contradict existing `CLAUDE.md` instructions without good reason

---

## Step 4: Present Lessons to User

Show the filtered lessons:

```
## Lessons Extracted from This Session

### New Rules
1. **[Short title]**
   Rule: [The concrete instruction]
   Source: [Brief context on why]

### Refinements to Existing Rules
1. **[Existing rule]** → **[Refined version]**
   Why: [What changed]

### Skipped (already covered)
- [Brief list of lessons that duplicate existing rules]
```

Then ask for approval:

```
AskUserQuestion({
  questions: [{
    question: "Which lessons should be saved to CLAUDE.md?",
    header: "Lessons",
    options: [
      { label: "All new rules", description: "Add all extracted lessons to CLAUDE.md" },
      { label: "Let me pick", description: "I'll select which ones to keep" },
      { label: "None", description: "Skip — don't update CLAUDE.md this time" }
    ],
    multiSelect: false
  }]
})
```

If "Let me pick" → ask which specific rules to include.

---

## Step 5: Determine Target File

```
AskUserQuestion({
  questions: [{
    question: "Where should these rules be saved?",
    header: "Target",
    options: [
      { label: "Project CLAUDE.md", description: "Rules specific to this project (./CLAUDE.md)" },
      { label: "Global CLAUDE.md", description: "Rules for all projects (~/.claude/CLAUDE.md)" },
      { label: "Both", description: "Some rules are project-specific, others are universal" }
    ],
    multiSelect: false
  }]
})
```

If "Both" → separate the rules by scope based on the `SCOPE` field from Step 1.

---

## Step 6: Update CLAUDE.md

### Formatting Rules

When adding to `CLAUDE.md`, follow these conventions:

1. **Group related rules** under existing sections when possible
2. **Create a `## Learned Rules` section** if one doesn't exist — place it after any existing content
3. **Each rule is a bullet point** — concise, imperative, actionable
4. **Include date** as a trailing comment for tracking: `<!-- learned YYYY-MM-DD -->`
5. **Never duplicate** — if refining, replace the old rule inline

### Template for New Section

If `CLAUDE.md` doesn't have a learned rules section yet:

```markdown

## Learned Rules

Rules extracted from development sessions to prevent repeated mistakes.

- [Rule 1] <!-- learned YYYY-MM-DD -->
- [Rule 2] <!-- learned YYYY-MM-DD -->
```

### Append Logic

- If `## Learned Rules` section exists → append new bullets to it
- If no such section → add it at the end of the file
- If no `CLAUDE.md` at all → create with a basic structure first, then add rules

Use the Edit tool to make targeted changes. Do NOT rewrite the entire file.

---

## Step 7: Confirm

After updating, show:

```
CLAUDE.md updated with [N] new rules.

Added:
- [Rule 1]
- [Rule 2]

Refined:
- [Old rule] → [New rule]

These rules will guide future sessions for this project.
```

---

## Rules

1. **DO** write rules in imperative form ("Always use...", "Never commit...", "Prefer X over Y")
2. **DO** make rules specific and verifiable — not vague ("use good patterns")
3. **DO** include the reasoning briefly when the rule isn't self-evident
4. **DO NOT** add rules about things Claude already knows (basic syntax, common patterns)
5. **DO NOT** add session-specific context as permanent rules
6. **DO NOT** add rules that contradict existing `CLAUDE.md` without explicit user approval
7. **DO NOT** remove or modify existing rules unless the user explicitly asks
8. **DO** keep the total `CLAUDE.md` manageable — if it grows beyond ~100 rules, suggest archiving older ones
