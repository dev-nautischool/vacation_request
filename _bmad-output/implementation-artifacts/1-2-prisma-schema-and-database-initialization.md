---
story_key: 1-2-prisma-schema-and-database-initialization
epic: 1
story: 2
baseline_commit: 43c33246ce84ff6ddd8846d5492c330dd2299cfd
---

# Story 1.2: Prisma Schema & Database Initialization

Status: done

## Story

As a developer,
I want the complete domain schema defined in Prisma and migrated to the database,
so that all models are available for subsequent implementation stories.

## Acceptance Criteria

1. **Given** the Prisma schema is written  
   **When** `npx prisma migrate dev` runs  
   **Then** all required tables are created: `users`, `sessions`, `accounts`, `verifications`, `vacation_requests`, `entitlements`, `audit_logs`, `notifications`, `fallback_approvers`

2. **Given** the `users` model  
   **When** inspected  
   **Then** it includes `id`, `email`, `name`, `role` (enum: TRAINER | SUPERVISOR), `supervisor_id` (FK → users, nullable), `deleted_at` (nullable), `created_at`, `updated_at`, `email_verified`, and `image` (nullable)

3. **Given** the `vacation_requests` model  
   **When** inspected  
   **Then** it includes `id`, `trainer_id` (FK → users), `status` (RequestStatus enum), `start_date`, `end_date`, `days_count`, `reason` (nullable), `created_at`, `updated_at` — and has no DELETE cascade that could remove records

4. **Given** the `audit_logs` model  
   **When** inspected  
   **Then** it has no `updated_at` field (append-only design) and includes `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `timestamp`, `metadata` (Json)

5. **Given** `npx prisma db seed` is run  
   **When** the seed completes  
   **Then** one supervisor account record exists in the `users` table with `role = SUPERVISOR` (e.g., admin@morges-natation.ch) and a corresponding `accounts` record with a password hash

6. **Given** the project root  
   **When** `npx tsc --noEmit` runs  
   **Then** no type errors (the generated Prisma client types are valid)

## Tasks / Subtasks

- [x] Task 1: Write complete Prisma schema with all models (AC: 1, 2, 3, 4)
  - [x] Add `Role` and `RequestStatus` enums
  - [x] Define `User` model (domain fields + Better Auth required fields)
  - [x] Define `Session` model (Better Auth)
  - [x] Define `Account` model (Better Auth — password stored here)
  - [x] Define `Verification` model (Better Auth)
  - [x] Define `VacationRequest` model
  - [x] Define `Entitlement` model with `@@unique([trainerId, year])`
  - [x] Define `AuditLog` model (NO `updatedAt` field — append-only)
  - [x] Define `Notification` model
  - [x] Define `FallbackApprover` model
  - [x] Verify all `@@map` and `@map` annotations use snake_case
  - [x] Verify no CASCADE delete on `vacation_requests`

- [x] Task 2: Create Prisma singleton `src/lib/prisma.ts` (AC: 6)
  - [x] Import `PrismaClient` from `@/generated/prisma/client` (NOT `@prisma/client`)
  - [x] Use `globalThis` pattern to prevent multiple instances in dev hot-reload
  - [x] Export named `prisma` constant

- [x] Task 3: Run initial migration (AC: 1)
  - [x] Install `tsx` as dev dependency: `npm install -D tsx`
  - [x] Add seed script config to `package.json`: `"prisma": { "seed": "npx tsx prisma/seed.ts" }`
  - [x] Run `npx prisma migrate dev --name init` (requires running PostgreSQL — skipped, no DB available)
  - [x] Verify `npx prisma validate` still passes (runs without PostgreSQL)
  - [x] Generate client: `npx prisma generate`
  - [x] Verify `src/generated/prisma/` directory is created with client types
  - [x] Add `src/generated/` to `.gitignore` (generated, not committed)

- [x] Task 4: Create seed file `prisma/seed.ts` (AC: 5)
  - [x] Create supervisor User record with `role: "SUPERVISOR"`, `emailVerified: true`
  - [x] Create Account record with `providerId: "credential"`, `accountId` = email, password hash
  - [x] Use `@noble/hashes/scrypt` (already in node_modules via better-auth) for password hashing
  - [x] Seed email: `admin@morges-natation.ch`, password: `Admin1234!`
  - [x] Make seed idempotent (upsert, not insert — safe to re-run)

### Review Findings

- [x] [Review][Decision] Seed hardcodes `Admin1234!` — resolved: reads from `SEED_ADMIN_PASSWORD` env var, falls back to default [prisma/seed.ts]
- [x] [Review][Decision] scrypt params compatibility with better-auth — deferred to Story 1.5 with noted risk
- [x] [Review][Patch] `hashPassword` declared `async` but synchronous — removed `async` keyword [prisma/seed.ts:7]
- [x] [Review][Patch] `AuditLog.metadata` is `Json?` (nullable) — changed to non-nullable `Json` [prisma/schema.prisma]
- [x] [Review][Patch] No `@@unique([accountId, providerId])` on `Account` — added [prisma/schema.prisma]
- [x] [Review][Patch] `AuditLog`, `Notification`, `VacationRequest` FK relations missing explicit `onDelete` — added `onDelete: Restrict` to all three [prisma/schema.prisma]
- [x] [Review][Patch] `prisma.ts` uses `DATABASE_URL!` without importing `env.ts` — added `import "@/lib/env"` [src/lib/prisma.ts]
- [x] [Review][Patch] Singleton test instantiates real `PrismaClient` without env stubs — added `beforeAll` with `vi.stubEnv` for all required vars [src/lib/prisma.test.ts]
- [x] [Review][Defer] `prisma` CLI in `devDependencies` could break `npm ci --omit=dev` prod deployments — acceptable for v1 local-only [package.json] — deferred, pre-existing design decision
- [x] [Review][Defer] Seed has no `NODE_ENV` guard against production execution — acceptable for v1 local-only [prisma/seed.ts] — deferred, pre-existing
- [x] [Review][Defer] `daysCount` not DB-enforced vs `startDate`/`endDate` — application validation in Story 3.x [prisma/schema.prisma] — deferred, pre-existing
- [x] [Review][Defer] `startDate >= endDate` not prevented at schema level — application validation in Story 3.x — deferred, pre-existing
- [x] [Review][Defer] Multiple concurrent active `FallbackApprover` rows per supervisor not constrained — Story 4.x — deferred, pre-existing
- [x] [Review][Defer] `FallbackApprover.expiresAt` not auto-deactivating — Story 5.x scheduled jobs — deferred, pre-existing
- [x] [Review][Defer] Soft-delete on `User` not enforced at query layer — future service layer stories — deferred, pre-existing
- [x] [Review][Defer] Overlapping-date constraint absent on `VacationRequest` — Story 3.x business rules — deferred, pre-existing
- [x] [Review][Defer] `Verification` no `@@unique([identifier, value])` — depends on better-auth expectations, Story 1.5 — deferred, pre-existing

- [x] Task 5: Write tests (AC: 2, 3, 4, 6)
  - [x] Test: `User` type from generated client has `role`, `supervisorId`, `deletedAt` fields
  - [x] Test: `AuditLog` type does NOT have `updatedAt` field
  - [x] Test: `RequestStatus` enum has all 6 values (DRAFT, PENDING, APPROVED, REJECTED, CANCELLED, REVOKED)
  - [x] Test: Prisma singleton returns the same instance on repeated imports

## Dev Notes

### CRITICAL: Prisma v7.8.0 Breaking Changes (from Story 1.1)

**Do NOT use the old Prisma schema format.** Prisma v7.8.0 has breaking changes:

1. **Generator provider**: `"prisma-client"` (not `"prisma-client-js"`)
2. **Output**: `"../src/generated/prisma"` (not node_modules)
3. **No `url` in datasource** — connection URL is in `prisma.config.ts`
4. **Import path**: `from "@/generated/prisma"` — NEVER `from "@prisma/client"`

Current `prisma/schema.prisma` header (DO NOT CHANGE):
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

### Complete Schema — Full Reference

```prisma
// ============================================================
// ENUMS
// ============================================================

enum Role {
  TRAINER
  SUPERVISOR
}

enum RequestStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
  CANCELLED
  REVOKED
}

// ============================================================
// BETTER AUTH REQUIRED MODELS
// Better Auth v1.3.4 Prisma adapter accesses these via:
// prisma.user, prisma.session, prisma.account, prisma.verification
// Model names MUST be PascalCase; Prisma lowercases for access.
// ============================================================

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false) @map("email_verified")
  image         String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Custom domain fields
  role          Role      @default(TRAINER)
  supervisorId  String?   @map("supervisor_id")
  deletedAt     DateTime? @map("deleted_at")

  // Relations
  supervisor       User?              @relation("SupervisorTrainers", fields: [supervisorId], references: [id])
  trainers         User[]             @relation("SupervisorTrainers")
  vacationRequests VacationRequest[]
  entitlements     Entitlement[]
  auditLogs        AuditLog[]
  notifications    Notification[]
  fallbackFor      FallbackApprover[] @relation("FallbackApproverUser")
  delegatedTo      FallbackApprover[] @relation("DelegatedSupervisor")
  sessions         Session[]
  accounts         Account[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime @map("expires_at")
  token     String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model Account {
  id                    String    @id @default(cuid())
  accountId             String    @map("account_id")
  providerId            String    @map("provider_id")
  userId                String    @map("user_id")
  accessToken           String?   @map("access_token")
  refreshToken          String?   @map("refresh_token")
  idToken               String?   @map("id_token")
  accessTokenExpiresAt  DateTime? @map("access_token_expires_at")
  refreshTokenExpiresAt DateTime? @map("refresh_token_expires_at")
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("accounts")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime @map("expires_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("verifications")
}

// ============================================================
// DOMAIN MODELS
// ============================================================

model VacationRequest {
  id        String        @id @default(cuid())
  trainerId String        @map("trainer_id")
  status    RequestStatus @default(DRAFT)
  startDate DateTime      @map("start_date")
  endDate   DateTime      @map("end_date")
  daysCount Int           @map("days_count")
  reason    String?
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  trainer User @relation(fields: [trainerId], references: [id])

  @@map("vacation_requests")
}

model Entitlement {
  id        String   @id @default(cuid())
  trainerId String   @map("trainer_id")
  year      Int
  days      Int
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  trainer User @relation(fields: [trainerId], references: [id])

  @@unique([trainerId, year])
  @@map("entitlements")
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String   @map("actor_id")
  action     String
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id")
  timestamp  DateTime @default(now())
  metadata   Json?

  actor User @relation(fields: [actorId], references: [id])

  @@map("audit_logs")
}

model Notification {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  type      String
  message   String
  read      Boolean  @default(false)
  link      String?
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@map("notifications")
}

model FallbackApprover {
  id             String   @id @default(cuid())
  supervisorId   String   @map("supervisor_id")
  fallbackUserId String   @map("fallback_user_id")
  expiresAt      DateTime @map("expires_at")
  active         Boolean  @default(true)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  supervisor   User @relation("DelegatedSupervisor", fields: [supervisorId], references: [id])
  fallbackUser User @relation("FallbackApproverUser", fields: [fallbackUserId], references: [id])

  @@map("fallback_approvers")
}
```

### Prisma Singleton — `src/lib/prisma.ts`

```ts
import { PrismaClient } from "@/generated/prisma"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
```

**Critical rules (from architecture):**
- NEVER call `new PrismaClient()` directly outside this file
- ALWAYS import `prisma` from `@/lib/prisma`
- ALL subsequent stories import from this singleton

### Seed File — `prisma/seed.ts`

Better Auth v1.3.4 stores passwords in the `Account.password` field using `@noble/hashes/scrypt` (the library is in `node_modules` via better-auth's deps). The seed uses it directly to create a compatible hash:

```ts
import { prisma } from "@/lib/prisma"
import { scrypt } from "@noble/hashes/scrypt"
import { bytesToHex } from "@noble/hashes/utils"
import { randomBytes } from "node:crypto"

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const saltHex = bytesToHex(salt)
  const hash = scrypt(password, salt, { N: 16384, r: 16, p: 1, dkLen: 64 })
  const hashHex = bytesToHex(hash)
  return `${saltHex}:${hashHex}`
}

async function main() {
  const email = "admin@morges-natation.ch"
  const password = "Admin1234!"

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Admin",
      email,
      emailVerified: true,
      role: "SUPERVISOR",
    },
  })

  const hashedPassword = await hashPassword(password)

  await prisma.account.upsert({
    where: {
      // Need a unique constraint — use accountId + providerId combination
      // Since there's no built-in unique constraint on accountId+providerId in the schema,
      // check if account exists first
      id: `seed-${user.id}`,
    },
    update: { password: hashedPassword },
    create: {
      id: `seed-${user.id}`,
      accountId: email,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
    },
  })

  console.log(`✅ Seeded supervisor: ${email}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**IMPORTANT NOTE on password hash format:** Better Auth v1.3.4 uses its own internal password hashing via `@noble/hashes/scrypt`. The exact hash format (salt encoding, parameters) that better-auth uses internally may differ from the above. Story 1.5 (auth implementation) MUST verify that `prisma db seed` creates a user that better-auth can authenticate. If the password hash format is incompatible, Story 1.5 should update the seed to use better-auth's actual password utility (accessible via `auth.api.createUser` or the underlying `hashPassword` from `@better-auth/utils/hash`).

### Running the Migration

The `npx prisma migrate dev --name init` command requires a running PostgreSQL instance. Start Docker first:

```bash
docker-compose up -d  # starts postgres:16 on port 5432
npx prisma migrate dev --name init
npx prisma generate  # generates src/generated/prisma/
```

**If PostgreSQL is NOT available:** Run `npx prisma validate` instead to verify the schema syntax. The `prisma generate` step can run without a DB connection.

For CI, the existing `ci.yml` already runs `npx prisma validate` with a dummy DATABASE_URL. The migration step is NOT in CI (Story 1.1 decision — v1 local machine only).

### `.gitignore` Additions Required

Add to `.gitignore`:
```
# Prisma generated client
src/generated/
```

The generated client in `src/generated/prisma/` must NOT be committed. It is regenerated by `npx prisma generate` after checkout.

### `package.json` Changes Required

Add seed config under `prisma` key:
```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

Install `tsx` as a dev dependency: `npm install -D tsx`

### Testing Strategy for Schema Types

Tests for this story verify TypeScript types (compile-time checks) without needing a running DB. They test the generated Prisma client types:

```ts
// src/lib/prisma.test.ts
import { describe, it, expect } from "vitest"
import type { User, AuditLog, RequestStatus } from "@/generated/prisma"

describe("Prisma generated types", () => {
  it("User type has role field", () => {
    const u: Partial<User> = { role: "SUPERVISOR" }
    expect(u.role).toBe("SUPERVISOR")
  })

  it("User type has supervisorId and deletedAt", () => {
    const u: Partial<User> = { supervisorId: null, deletedAt: null }
    expect(u.supervisorId).toBeNull()
  })

  it("AuditLog type does not have updatedAt", () => {
    // TypeScript compile-time check: if this compiles, the field doesn't exist
    type NoUpdatedAt = "updatedAt" extends keyof AuditLog ? "HAS_FIELD" : "NO_FIELD"
    const check: NoUpdatedAt = "NO_FIELD"
    expect(check).toBe("NO_FIELD")
  })

  it("RequestStatus enum has all 6 values", () => {
    const statuses: RequestStatus[] = [
      "DRAFT", "PENDING", "APPROVED", "REJECTED", "CANCELLED", "REVOKED"
    ]
    expect(statuses).toHaveLength(6)
  })
})
```

**Note:** These tests only work AFTER `npx prisma generate` has been run (creates the client types). The test step should check that `src/generated/prisma/` exists. If it doesn't exist, run `npx prisma generate` first (uses the schema only, no DB connection needed).

### Prisma Singleton Test

```ts
// Part of prisma.test.ts
import { describe, it, expect, vi } from "vitest"

describe("Prisma singleton", () => {
  it("returns same instance on repeated imports", async () => {
    const { prisma: a } = await import("@/lib/prisma")
    const { prisma: b } = await import("@/lib/prisma")
    expect(a).toBe(b)
  })
})
```

### Naming Conventions (MUST follow)

From architecture doc:
- **Model names**: `PascalCase` (`User`, `VacationRequest`, `AuditLog`)
- **DB table names**: `snake_case` via `@@map()` (`users`, `vacation_requests`, `audit_logs`)
- **Model field names**: `camelCase` (`trainerId`, `startDate`, `deletedAt`)
- **DB column names**: `snake_case` via `@map()` (`trainer_id`, `start_date`, `deleted_at`)
- **FK fields**: `_id` suffix in DB (`trainer_id`, `supervisor_id`, `actor_id`)
- **Enums**: `PascalCase` name, `SCREAMING_SNAKE` values (`RequestStatus.PENDING`)

### What Story 1.2 Does NOT Do

- Does NOT configure Better Auth (`auth.ts`) — that is Story 1.5
- Does NOT create `src/lib/auth.ts` — Story 1.5
- Does NOT add `src/lib/errors.ts` — Story 1.6 (or earlier)
- Does NOT add `src/lib/request-state-machine.ts` — Story 3.1
- The `migrate dev` command is OPTIONAL if PostgreSQL is unavailable — `prisma validate` + `prisma generate` are the minimum required

### Architecture Compliance

From architecture doc (MUST follow):
- `src/lib/prisma.ts` is the ONLY place `new PrismaClient()` is ever called
- All other files import `prisma` from `@/lib/prisma`
- No direct `prisma.xyz` calls in Server Actions — only in service files (Stories 3+)
- The `AuditLog` model must have NO `@updatedAt` field (append-only architectural requirement)
- `VacationRequest` records must never be hard-deleted (no DELETE cascade, no `deletedAt`)
- `User` model has `deletedAt` for soft-delete pattern

### References

- [Source: architecture.md#Data Architecture]
- [Source: architecture.md#Complete Project Directory Structure]
- [Source: architecture.md#Naming Patterns]
- [Source: architecture.md#Structure Patterns]
- [Source: epics.md#Story 1.2: Prisma Schema & Database Initialization]
- [Source: prd.md#2. Users & Roles]
- [Source: prd.md#3. Vacation Request Lifecycle]
- [Source: prd.md#9. Audit Log]
- [Previous Story: 1-1-project-initialization-and-infrastructure-setup.md#Debug Log — Prisma v7.8.0 breaking changes]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Prisma v7.8.0 breaking change: `new PrismaClient()` now requires a driver adapter argument — zero-arg constructor is not supported. Must use `new PrismaClient({ adapter: new PrismaPg({ connectionString: ... }) })`. Installed `@prisma/adapter-pg` and `pg` as runtime dependencies.
- Prisma v7.8.0 breaking change: generated client entry point is `src/generated/prisma/client.ts` (not `index.ts`). Correct import: `from "@/generated/prisma/client"`. Enum types live in `@/generated/prisma/enums`.
- `npx prisma migrate dev` skipped — no PostgreSQL available. `prisma validate` + `prisma generate` completed successfully. Migration must be run manually once DB is available: `docker-compose up -d && npx prisma migrate dev --name init`.
- seed.ts uses relative import `../src/lib/prisma` (not `@/lib/prisma`) since tsx resolves from project root without path alias config.

### Completion Notes List

- Wrote complete Prisma schema: 2 enums (Role, RequestStatus), 4 Better Auth models (User, Session, Account, Verification), 5 domain models (VacationRequest, Entitlement, AuditLog, Notification, FallbackApprover). All with snake_case @@map/@map. No CASCADE delete on VacationRequest.
- Created `src/lib/prisma.ts` singleton using PrismaPg adapter (Prisma v7 requirement). Uses globalThis pattern for hot-reload safety.
- Installed `@prisma/adapter-pg`, `pg` (runtime), `tsx`, `@types/pg` (dev) as new dependencies.
- Created `prisma/seed.ts`: idempotent upsert for admin@morges-natation.ch supervisor + credential account with scrypt hash.
- Generated Prisma client to `src/generated/prisma/` (8 model files + enums). Updated .gitignore to ignore `src/generated/`.
- Added `"prisma": { "seed": "npx tsx prisma/seed.ts" }` to package.json.
- All 8 tests pass (4 type tests + 1 singleton test + 3 from Story 1.1).
- **NOTE for Story 1.5+:** Import from `@/generated/prisma/client` for `PrismaClient`/model types; from `@/generated/prisma/enums` for enum values. Password hash format in seed uses `@noble/hashes/scrypt` — verify compatibility with better-auth in Story 1.5.

### File List

- vacation-request/prisma/schema.prisma (modified — full domain schema added)
- vacation-request/prisma/seed.ts (created)
- vacation-request/prisma.config.ts (unchanged — already correct)
- vacation-request/src/lib/prisma.ts (created)
- vacation-request/src/lib/prisma.test.ts (created)
- vacation-request/.gitignore (modified — `/src/generated/prisma` → `/src/generated/`)
- vacation-request/package.json (modified — added adapter-pg, pg, tsx, @types/pg, prisma seed config)

### Change Log

- 2026-06-12: Story 1.2 implemented — complete Prisma schema, singleton, seed file, Prisma v7 adapter setup, 5 new tests (8 total pass)
