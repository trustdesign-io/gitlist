# Agentic Development Workflow

This document describes how development work flows through starter-native using Claude Code
as the primary development agent.

---

## Overview

Work is tracked on **Mission Control** — a GitHub Projects board at
`github.com/orgs/trustdesign-io/projects/3`. Claude Code handles the full loop: picking
up tickets, implementing changes, opening PRs, self-reviewing them, and moving the ticket
to In Review for human sign-off.

The human's role is to **define work** (create tickets), **review PRs**, and **merge**.
Claude handles everything in between.

---

## The Board

| Status | Meaning |
|--------|---------|
| Backlog | Defined but not yet prioritised for action |
| Todo | Ready to be picked up |
| In Progress | Claude is actively working on it |
| In Review | PR open, waiting for human review and merge |
| Done | Merged and closed |

Tickets have four fields: **Priority** (Critical → Low), **Size** (XS → XL),
**Category** (Feature / Bug / Chore / Design / Docs / Research), and **Status**.

---

## Slash Commands

### Board and tickets (org-level, from trustdesign-setup)

| Command | What it does |
|---------|-------------|
| `/board` | Show open tickets for the current repo |
| `/create-ticket <title> [category:X] [priority:X] [size:X]` | Create an issue and add it to the board |
| `/update-ticket <number> [field:value ...]` | Update priority, size, category, status, title, or body |
| `/move-ticket <number> <status>` | Move a ticket to a different status column |

### Doing the work (org-level, from trustdesign-setup)

| Command | What it does |
|---------|-------------|
| `/take-task [next\|<number>\|<number> <number> ...]` | Pick up a ticket, implement it, open a PR, self-review, move to In Review |
| `/review-pr <number>` | Self-review an existing PR and post findings as a comment |

`/take-task next` picks the highest-priority **Todo** ticket for the current repo
(Critical > High > Medium > Low; tiebreak: lowest number first).

### Project-specific (this repo)

| Command | What it does |
|---------|-------------|
| `/new-feature <description>` | Plan and implement a new feature end-to-end |
| `/new-page <name>` | Scaffold a new Expo Router screen |
| `/new-component <name>` | Scaffold a new React Native component |
| `/apply-brand <brand-name>` | Apply brand colours, typography, and design tokens |
| `/review` | Run a pre-PR review checklist against project standards |

---

## End-to-End Flow

```
Human                          Claude Code
  │                                │
  ├─ /create-ticket ───────────────┤  Creates GitHub issue + adds to board
  │                                │
  ├─ /move-ticket N todo ──────────┤  Moves to Todo (ready to pick up)
  │                                │
  ├─ /take-task next ──────────────┤
  │                                ├─ Moves ticket to In Progress
  │                                ├─ Creates feature branch
  │                                ├─ Implements the change
  │                                ├─ Runs: type-check → lint → tests
  │                                ├─ Commits and pushes
  │                                ├─ Opens PR
  │                                ├─ Self-review via sub-agent → posts comment
  │                                └─ Moves ticket to In Review
  │                                │
  ├─ Reviews PR on GitHub ─────────┤
  ├─ Merges PR ────────────────────┤  GitHub auto-closes the issue
  │                                │
  └─ /take-task next ──────────────┘  Pick up the next ticket
```

---

## Branch and Commit Conventions

**Branches** are named by category:
- Feature / Docs / Research → `feature/{number}-{slug}`
- Bug → `fix/{number}-{slug}`
- Chore → `chore/{number}-{slug}`
- Design → `design/{number}-{slug}`

**Commits** follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add push notification preferences screen

Implements a settings screen where users can toggle notification categories.
Uses expo-notifications permission API and persists preferences to Supabase.

Refs #23
```

Commit types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `design`.

PRs always target `main`. Never push directly to `main`.

---

## CI Pipeline

**Status: Active** — `.github/workflows/ci.yml`

Every PR and push to `main` runs automatically:

| Step | Command | Description |
|------|---------|-------------|
| Install | `npm ci` | Clean install with cache |
| Lint | `npm run lint` | ESLint with shared config |
| Type-check | `npm run type-check` | TypeScript strict mode |
| Test | `npm run test` | Jest + RNTL unit tests |
| Build | `npx expo export --platform all` | Verify the bundle compiles |

The build step uses placeholder Supabase values so `expo export` succeeds in CI without
real credentials. For production builds, set `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` as GitHub Actions secrets.

Claude will not open a PR with a failing type-check or lint. Errors are fixed on the
branch before pushing.

---

## Bot Identity

> **Required:** `$TRUSTDESIGN_BOT_TOKEN` must be set in your shell before slash commands
> can post as the bot. If it is not set, actions fall back to your own authenticated token.

Tickets and PR comments from Claude appear under the **trustdesign-bot** GitHub account
when the token is present. Bot setup is handled at the org level in `trustdesign-setup`.

Git commits from Claude use:
```bash
git commit --author="trustdesign-bot <bot@trustdesign.io>" -m "..."
```

---

## Human Checkpoints

Claude operates autonomously but always stops for human input at:

1. **Before starting a Backlog ticket** — `/take-task next` will ask before touching a
   ticket that isn't in Todo
2. **After opening a PR** — Claude moves to In Review and waits; it never merges
3. **Ambiguous requirements** — if the issue body doesn't make "done" clear, Claude asks
   one focused question before continuing
4. **Design tickets** — Claude always presents a written plan and waits for explicit
   approval before creating or modifying any files

For multi-day tasks, Claude moves the ticket back to Todo, adds a comment explaining what
is needed, and tells the user rather than producing partial work.
