---
description: Plan and implement a new feature end-to-end
---

# New Feature: $ARGUMENTS

## Process

Follow these steps in order. Do not skip any step.

### 1. Understand
- Read `CLAUDE.md`, `docs/ARCHITECTURE.md`, and `docs/CONVENTIONS.md` to understand the codebase context
- Identify existing patterns relevant to this feature (look at similar screens and lib functions)
- List any unclear requirements and ask before proceeding

### 2. Plan
Before writing any code, produce:

**Feature brief:**
- What this feature does (user-facing description)
- Affected screens and components
- New files to create
- Data layer changes (Supabase queries or mutations in `src/lib/`)
- State management changes (Zustand store additions if needed)
- New screens or navigation routes required
- Any native APIs or device permissions involved (camera, location, notifications, etc.)

**Ask the user to confirm the plan before proceeding.**

### 3. Data layer
- Add query/mutation functions in `src/lib/[feature].ts`
- Use Zod schemas from `@trustdesign/shared/schemas` for validation
- Return `ActionResult` from `@trustdesign/shared/types` for consistent error handling:
  ```ts
  import type { ActionResult } from '@trustdesign/shared/types'
  export async function doSomething(): Promise<ActionResult> {
    try {
      // ...
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }
  ```

### 4. State (if needed)
- Extend or create a Zustand store in `src/stores/`
- Use selectors to avoid unnecessary re-renders

### 5. UI layer
- Create screens in `src/app/` following Expo Router file conventions
- Build reusable parts as components in `src/components/`
- Use components from `src/components/ui/` as building blocks
- Apply design tokens from `@trustdesign/shared/tokens` for all styling
- Add loading states and empty/error states
- Request device permissions inline (only when needed, explain why in the prompt)

### 6. Navigation
- Add new routes to `src/app/` under the correct group (`(auth)`, `(app)/(tabs)`, etc.)
- Update tab bar or stack navigators in `_layout.tsx` files if needed
- Add deep link path to `app.json` scheme if applicable

### 7. Tests
- Write unit tests for lib functions in `src/lib/__tests__/`
- Write component tests using React Native Testing Library
- Test key user interactions and error states

### 8. Verify
- Run `npm run type-check` (always available)
- Run `npm run lint` if ESLint is configured (see #3)
- Run `npm run test` if Jest is configured (see #4)
- Fix any errors before marking complete
- Test on both iOS and Android if using platform-specific code

### 9. Summary
Provide a brief summary of what was built, what files were changed, and any follow-up tasks.
