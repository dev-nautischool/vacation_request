---
story_key: 2-4-fallback-approver-permission-scope
epic: 2
story: 4
baseline_commit: b3092b1
---

# Story 2.4: Fallback Approver Permission Scope

Status: done

## Story

As a fallback approver,
I want to be able to approve or reject pending requests for the delegating supervisor's trainers,
So that I can keep the approval queue moving without gaining broader admin rights.

## Acceptance Criteria

1. **Given** an authenticated supervisor who is an active fallback approver for Supervisor A  
   **When** they view the approvals queue  
   **Then** they can see PENDING requests from Supervisor A's trainers alongside their own trainers' requests  
   *(Full enforcement in Epic 4 — this story creates the lookup service)*

2. **Given** a fallback approver attempts to revoke an APPROVED request for a delegated trainer  
   **When** the Server Action runs  
   **Then** it returns `ActionResult` error with code `UNAUTHORIZED` (fallback approvers cannot revoke)  
   *(Full enforcement in Epic 4 revokeRequest action — this story defines the guard logic)*

3. **Given** a fallback approver attempts to set an entitlement for a delegated trainer  
   **When** the Server Action runs  
   **Then** it returns `ActionResult` error with code `UNAUTHORIZED` (fallback approvers cannot manage entitlements)  
   *(Full enforcement in Epic 4 setEntitlement action)*

4. **Given** a fallback approver attempts to manage users on behalf of the delegating supervisor  
   **When** the Server Action runs  
   **Then** it returns `ActionResult` error with code `UNAUTHORIZED`  
   *(Note: user management is inherently own-account-based; fallback relationship does not grant additional MANAGE_USERS rights — trivially satisfied by existing RBAC)*

5. **Given** the fallback configuration has expired  
   **When** a former fallback approver attempts to approve a request for the previously delegated trainers  
   **Then** it returns `ActionResult` error with code `UNAUTHORIZED`  
   *(Enforced by `isActiveFallbackFor` which filters `expiresAt: { gt: new Date() }`)*

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/services/fallback.service.ts` with fallback lookup helpers (AC: 1, 2, 3, 5)
  - [x] `isActiveFallbackFor(actorId, supervisorId)` → `Promise<boolean>`
    - [x] Query `prisma.fallbackApprover.findFirst({ where: { supervisorId, fallbackUserId: actorId, active: true, expiresAt: { gt: new Date() } } })`
    - [x] Return `record !== null`
  - [x] `getFallbackSupervisorIds(actorId)` → `Promise<string[]>`
    - [x] Query `prisma.fallbackApprover.findMany({ where: { fallbackUserId: actorId, active: true, expiresAt: { gt: new Date() } } })`
    - [x] Return `records.map(r => r.supervisorId)`

- [x] Task 2: Create `src/lib/services/fallback.service.test.ts` (AC: 1, 5)
  - [x] `isActiveFallbackFor`:
    - [x] Returns `true` when active non-expired record exists
    - [x] Returns `false` when no record (findFirst returns null)
    - [x] Returns `false` when findFirst returns null (covers both expired and inactive — Prisma filter handles it)
    - [x] Verify `findFirst` is called with `active: true` and `expiresAt: { gt: expect.any(Date) }`
  - [x] `getFallbackSupervisorIds`:
    - [x] Returns array of supervisorIds when records exist
    - [x] Returns empty array when findMany returns `[]`
    - [x] Verify `findMany` is called with `active: true` and `expiresAt: { gt: expect.any(Date) }`

## Dev Notes

### Design Context

**Fallback approvers are supervisors** — they hold `role: SUPERVISOR` in the users table. The fallback relationship is a separate `fallback_approvers` record. This means:
- Route protection (`proxy.ts`) does not need to change: the approvals queue is a SUPERVISOR-only route, and fallback approvers already have that role.
- `canActorPerformAction` does not need to change for user management (MANAGE_USERS is allowed for all SUPERVISORs in their own right — the fallback relationship does not add or remove this permission for own-account actions).
- The permission *restriction* on revoke/entitlement for *delegated* trainers is enforced by the future Epic 4 action implementations, which will call `isActiveFallbackFor` to determine whether the actor's authority over a given trainer is own-supervisor or fallback-only.

**Lookup pattern used by Epic 4:**
```ts
// In revokeRequest / setEntitlement actions:
const isFallback = await isActiveFallbackFor(actor.id, trainer.supervisorId)
if (isFallback) {
  return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
}
```

**Lookup pattern used by Epic 4 approval queue:**
```ts
// To expand the approval queue scope:
const fallbackSupervisorIds = await getFallbackSupervisorIds(actor.id)
// then include trainers of those supervisors in the query
```

### Files to Create

- **CREATE** `src/lib/services/fallback.service.ts` — fallback lookup functions
- **CREATE** `src/lib/services/fallback.service.test.ts` — unit tests

### fallback.service.ts Implementation

```ts
import { prisma } from "@/lib/prisma"

export async function isActiveFallbackFor(actorId: string, supervisorId: string): Promise<boolean> {
  const record = await prisma.fallbackApprover.findFirst({
    where: {
      supervisorId,
      fallbackUserId: actorId,
      active: true,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })
  return record !== null
}

export async function getFallbackSupervisorIds(actorId: string): Promise<string[]> {
  const records = await prisma.fallbackApprover.findMany({
    where: {
      fallbackUserId: actorId,
      active: true,
      expiresAt: { gt: new Date() },
    },
    select: { supervisorId: true },
  })
  return records.map((r) => r.supervisorId)
}
```

### Test Pattern

```ts
vi.mock("@/lib/prisma", () => ({
  prisma: {
    fallbackApprover: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { isActiveFallbackFor, getFallbackSupervisorIds } from "./fallback.service"
import { prisma } from "@/lib/prisma"

const mockFallbackApprover = prisma.fallbackApprover as unknown as {
  findFirst: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
}
```

For `isActiveFallbackFor`:
- Active case: `mockFallbackApprover.findFirst.mockResolvedValueOnce({ id: "fb-1" })` → expect `true`
- No record: `mockFallbackApprover.findFirst.mockResolvedValueOnce(null)` → expect `false`
- Verify `findFirst` called with `where: { supervisorId, fallbackUserId: actorId, active: true, expiresAt: { gt: expect.any(Date) } }`

For `getFallbackSupervisorIds`:
- Records: `mockFallbackApprover.findMany.mockResolvedValueOnce([{ supervisorId: "s1" }, { supervisorId: "s2" }])` → expect `["s1", "s2"]`
- Empty: `mockFallbackApprover.findMany.mockResolvedValueOnce([])` → expect `[]`

### Prisma Import Pattern

```ts
import { prisma } from "@/lib/prisma"  // singleton, always
```

No type imports needed (functions return primitives or derived arrays).

### Why expiresAt check is in the service, not the route

The fallback expiry check could theoretically be in `proxy.ts` (middleware), but since route protection only checks role (SUPERVISOR), and the expiry is record-level (not role-level), the check must live in the service query. This is correct: access control at the data boundary, not just the route boundary.

### References

- [Source: prd.md#7] — FR24: fallback approver can approve/reject only; cannot revoke, manage entitlements, or manage users
- [Source: epics.md#Story 2.4] — acceptance criteria
- [Source: prisma/schema.prisma#FallbackApprover] — model definition
- [Previous Story: 2-3-configure-fallback-approver.md] — FallbackApprover record creation; this story consumes it

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `src/lib/services/fallback.service.ts`: created with `isActiveFallbackFor(actorId, supervisorId)` and `getFallbackSupervisorIds(actorId)` — both filter by `active: true, expiresAt: { gt: new Date() }`, enforcing AC5 (expired fallback = no access)
- `src/lib/services/fallback.service.test.ts`: 6 tests covering true/false/query-clause for each function; all pass
- No changes to existing files — route protection and RBAC already correct; Epic 4 actions will import `isActiveFallbackFor` to enforce revoke/entitlement restrictions
- 6 new tests; 131 total pass, TypeScript clean

### File List

- src/lib/services/fallback.service.ts (created)
- src/lib/services/fallback.service.test.ts (created)

### Change Log

- 2026-06-17: Story 2.4 implemented — fallback.service.ts with isActiveFallbackFor + getFallbackSupervisorIds, 6 new tests (131 total pass)
