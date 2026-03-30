// Re-export shared types
// In native-starter we use the shared package types directly
// (no Prisma client — the RN app talks to the API, not the DB)
export type { User, Role, ActionResult } from '@trustdesign/shared'
