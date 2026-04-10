---
description: Scaffold a new starter template repo that meets the trustdesign-io starter spec
---

# Create Starter: $ARGUMENTS

Create a new starter template repository in the trustdesign-io org, fully
wired with auth, navigation, shared code, CI, documentation, and Claude Code
slash commands — following the starter specification.

> **Read `docs/STARTER_SPEC.md` first** — it defines everything a starter must
> include. This command scaffolds a repo that meets that spec.
>
> **Read `.claude/SHARED_CONFIG.md`** — it defines ORG, PROJECT_ID, bot token
> usage, GraphQL quoting rules, and git workflow rules.

---

## Step 1 — Gather details

If `$ARGUMENTS` is non-empty, parse it as the starter name (e.g. `desktop-starter`,
`api-starter`). For all other fields, ask the user.

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Repo name, must follow `starter-{platform}` convention | `starter-desktop` |
| **Platform** | What this starter targets | `React Native (Expo)`, `Electron`, `CLI`, `API` |
| **Framework** | Primary framework | `Expo SDK 55`, `Electron + React`, `Express` |
| **Styling approach** | How UI is styled | `Platform-native`, `Tailwind`, `CSS Modules` |
| **Routing** | How navigation/routing works | `Expo Router`, `React Router`, `file-based` |
| **Test framework** | Unit test tool | `Jest`, `Vitest` |
| **E2E framework** | End-to-end test tool (can be "none yet") | `Maestro`, `Playwright`, `none yet` |
| **Deploy target** | Where this ships | `App Store + Play Store`, `Vercel`, `npm`, `Docker` |
| **Description** | One-line repo description | `React Native (Expo) starter template for trustdesign projects` |

**Naming enforcement:** The name MUST match `starter-{platform}`. If the user
provides a name like `desktop-starter` or `native-starter`, correct it to
`starter-desktop` or `starter-native` and confirm. Reject names that don't
follow this convention. See `docs/STARTER_SPEC.md` for the naming rule.

Confirm all details with the user before proceeding.

---

## Step 2 — Create the GitHub repo

```bash
gh repo create trustdesign-io/$NAME \
  --public \
  --description "$DESCRIPTION" \
  --clone
cd $NAME
```

If `--clone` fails, clone manually:
```bash
gh repo clone trustdesign-io/$NAME
cd $NAME
```

---

## Step 3 — Scaffold the file structure

Create the directory structure defined in `docs/STARTER_SPEC.md`:

```bash
mkdir -p .claude/commands .github/workflows docs src
```

### 3a — CLAUDE.md

Generate `CLAUDE.md` following the format in the spec. Include:
- Tech stack table with the chosen framework, language, styling, etc.
- Directory structure (platform-appropriate)
- Auth flow summary
- Shared package usage
- npm scripts
- Setup steps
- Ticket & issue rules (reference `/create-ticket` from trustdesign-setup)

### 3b — Documentation

Generate these docs, adapting the content from starter-web's equivalents to
the target platform:

- `docs/ARCHITECTURE.md` — system overview with platform-appropriate diagram,
  rendering/data strategy, auth flow, key architectural decisions
- `docs/CONVENTIONS.md` — component anatomy, naming conventions, import ordering,
  error handling patterns — all adapted to the target platform
- `docs/WORKFLOW.md` — copy the agentic workflow from starter-web's version,
  updating CI steps and deploy steps for the new platform
- `docs/SETUP.md` — first-time setup guide for the target platform

### 3c — .env.example

Create `.env.example` with all required environment variables:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Adjust the prefix for the platform (e.g. `EXPO_PUBLIC_` for Expo,
`NEXT_PUBLIC_` for Next.js, no prefix for server-only).

---

## Step 4 — Claude Code slash commands

Create all five per-starter commands in `.claude/commands/`, adapting each
from starter-web's version to the target platform.

For each command, follow the same step-by-step process structure but replace
platform-specific details:

### `/new-feature` (`.claude/commands/new-feature.md`)
- Same 8-step process (Understand → Plan → Database → Server → UI → Tests → Verify → Summary)
- Replace Next.js patterns with platform equivalents
- Replace shadcn/ui references with platform component library
- Replace Server Components/Actions with platform data layer

### `/new-page` (`.claude/commands/new-page.md`)
- Replace App Router conventions with platform routing
- Replace Server Component patterns with platform screen patterns
- Update SEO section (native: skip; API: skip; web: keep)

### `/new-component` (`.claude/commands/new-component.md`)
- Replace shadcn/Tailwind patterns with platform styling
- Replace `cn()` utility with platform equivalent
- Keep accessibility, testing, and JSDoc sections

### `/apply-brand` (`.claude/commands/apply-brand.md`)
- Same input gathering (brand name, primary colour, industry, personality, palette)
- Replace CSS variable application with platform token system
- Replace globals.css updates with platform style updates
- Keep the colour generation algorithm and BRAND.md output

### `/review` (`.claude/commands/review.md`)
- Same review categories (Correctness, Conventions, Security, Performance, Tests, Build)
- Replace platform-specific checks (e.g. Server vs Client → Native vs Bridge)
- Keep severity format and output structure

---

## Step 5 — CI workflow

Create `.github/workflows/ci.yml` adapted to the platform:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Lint, Type-check, Test & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      # Platform-specific steps here (e.g. prisma generate, expo doctor)
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build
```

Add platform-specific steps as needed (Prisma generate, EAS credentials, etc.).

---

## Step 6 — Package.json

Ensure `package.json` has all required scripts from the spec:
- `start`, `build`, `test`, `lint`, `format`, `type-check`
- Plus platform-specific scripts

Include `@trustdesign/shared` as a git dependency:
```json
"@trustdesign/shared": "github:trustdesign-io/trustdesign-shared"
```

---

## Step 7 — Initial commit and push

```bash
git add -A
git commit -m "feat: scaffold $NAME from starter spec"
git push -u origin main
```

---

## Step 8 — Create repo label on Mission Control

```bash
gh label create "$NAME" --repo "trustdesign-io/$NAME" --color "0075ca" \
  --description "Issues from the $NAME repository"
```

---

## Step 9 — Audit against spec

Read `docs/STARTER_SPEC.md` one more time and verify the new repo has:

- [ ] `.claude/commands/` with all 5 slash commands
- [ ] `.github/workflows/ci.yml`
- [ ] `docs/` with ARCHITECTURE, CONVENTIONS, WORKFLOW, SETUP
- [ ] `CLAUDE.md`
- [ ] `.env.example`
- [ ] All 6 required npm scripts
- [ ] `@trustdesign/shared` dependency
- [ ] Auth flow (sign in, sign up, sign out, guard, onboarding)
- [ ] Platform-appropriate navigation
- [ ] Design tokens from shared package
- [ ] At least one passing test

Report any gaps and offer to fix them.

---

## Step 10 — Output summary

```
Starter created

  Name        : {name}
  Repo        : https://github.com/trustdesign-io/{name}
  Platform    : {platform}
  Framework   : {framework}
  Deploy      : {deploy_target}

  Commands    : /new-feature, /new-page, /new-component, /apply-brand, /review
  CI          : .github/workflows/ci.yml
  Docs        : CLAUDE.md, ARCHITECTURE, CONVENTIONS, WORKFLOW, SETUP

  Next steps  :
  1. cd {name} && npm install
  2. Copy .env.example to .env and fill in Supabase credentials
  3. /apply-brand to set up the visual identity
  4. /create-ticket to start adding features
```

---

## Notes

- This command creates the *skeleton*. The auth flow, navigation, and screens
  need to be implemented as the first batch of tickets.
- For platforms where a CLI generator exists (e.g. `create-expo-app`,
  `create-next-app`), use it as the starting point and layer the spec on top
  rather than building from scratch.
- Reference starter-web and native-starter as working examples when adapting
  commands and docs.
