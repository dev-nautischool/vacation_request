---
story_key: 2-3-configure-fallback-approver
epic: 2
story: 3
baseline_commit: b3092b1
---

# Story 2.3: Configure Fallback Approver

Status: review

## Story

As a supervisor,
I want to designate another supervisor as my fallback approver with a mandatory expiry date,
So that my trainers' pending requests can still be actioned when I am unavailable.

## Acceptance Criteria

1. **Given** an authenticated supervisor on the Users page  
   **When** they select another supervisor as their fallback and set an expiry date  
   **Then** a `fallback_approvers` record is created linking the two supervisors with the expiry date  
   **And** the fallback approver can see and act on the delegating supervisor's trainers' pending requests

2. **Given** a supervisor submits the fallback config form without an expiry date  
   **When** the Server Action runs  
   **Then** it returns `ActionResult` error with code `VALIDATION_ERROR` and the form shows "An expiry date is required"

3. **Given** a fallback configuration with a past expiry date  
   **When** the system evaluates the fallback relationship  
   **Then** the fallback approver no longer has access to the delegating supervisor's requests

4. **Given** a supervisor views their Users page  
   **When** an active fallback is configured  
   **Then** the fallback approver name and expiry date are displayed with a visual "active" indicator

5. **Given** a supervisor has an existing fallback configured  
   **When** they submit a new fallback configuration  
   **Then** the previous fallback record is replaced (set `active = false`) with the new one

## Tasks / Subtasks

- [x] Task 1: Add `configureFallback` to `src/lib/services/user.service.ts` (AC: 1, 2, 3, 5)
  - [x] `configureFallback(actorId, fallbackUserId, expiresAt)` → `Promise<ActionResult<FallbackApprover>>`
  - [x] Validate `fallbackUserId` is non-empty — return VALIDATION_ERROR if missing
  - [x] Validate `expiresAt` is provided — return VALIDATION_ERROR with "An expiry date is required" if missing
  - [x] Validate `fallbackUserId !== actorId` — return VALIDATION_ERROR if self-assignment
  - [x] Validate `fallbackUserId` refers to a non-deleted SUPERVISOR — return VALIDATION_ERROR if not
  - [x] Deactivate existing active records: `prisma.fallbackApprover.updateMany({ where: { supervisorId: actorId, active: true }, data: { active: false } })`
  - [x] Create new record: `prisma.fallbackApprover.create({ data: { supervisorId: actorId, fallbackUserId, expiresAt, active: true } })`
  - [x] Return `ActionResult<FallbackApprover>`

- [x] Task 2: Add `configureFallback` Server Action to `src/lib/actions/users.ts` (AC: 1, 2)
  - [x] Guard with `canActorPerformAction(actor, 'MANAGE_USERS')` — return UNAUTHORIZED if not SUPERVISOR
  - [x] Extract `fallbackUserId` and `expiresAt` from FormData
  - [x] Validate `fallbackUserId` non-empty; return VALIDATION_ERROR if missing
  - [x] Validate `expiresAt` non-empty; return VALIDATION_ERROR with "An expiry date is required" if missing
  - [x] Delegate to `configureFallbackService(actor.id, fallbackUserId, new Date(expiresAt))`
  - [x] Call `revalidatePath('/users')` on success

- [x] Task 3: Create `FallbackConfig` component and update Users page (AC: 1, 3, 4, 5)
  - [x] Create `src/components/features/users/FallbackConfig.tsx` (client component)
    - [x] Props: `currentFallback: { id, fallbackUserId, fallbackUser: { name }, expiresAt } | null`, `supervisors: { id, name }[]`
    - [x] If `currentFallback` is non-null: show fallback user name + expiry date + "Active" or "Expired" badge (compare `expiresAt` to `new Date()`)
    - [x] Form with supervisor select (populated from `supervisors` prop, excluding none — all supervisors shown, actor filter is done at service layer) + `<input type="date" name="expiresAt" />` + submit button
    - [x] Use `useActionState<ActionResult<FallbackApprover> | null, FormData>(configureFallback, null)` + `useFormStatus`
    - [x] Toast on success: "Fallback approver configured." on error: show `state.error`
    - [x] If `supervisors.length === 0`: show "No other supervisors available"
  - [x] Update `src/app/users/page.tsx`
    - [x] Import `getSession` from `@/lib/session`
    - [x] Call `const session = await getSession()` and extract `currentUserId = session!.user.id`
    - [x] Query active fallback: `prisma.fallbackApprover.findFirst({ where: { supervisorId: currentUserId, active: true }, select: { id, fallbackUserId, expiresAt, fallbackUser: { select: { id, name } } } })`
    - [x] Derive `otherSupervisors = supervisors.filter(s => s.id !== currentUserId)` for the select
    - [x] Import and render `<FallbackConfig currentFallback={activeFallback} supervisors={otherSupervisors} />` in a new section below UserList

- [x] Task 4: Tests (AC: 1, 2, 3, 5)
  - [x] `src/lib/services/user.service.test.ts` — add `describe("configureFallback", ...)` block
    - [x] Happy path: deactivates existing, creates new, returns success
    - [x] VALIDATION_ERROR when `fallbackUserId` is empty
    - [x] VALIDATION_ERROR when `expiresAt` is missing
    - [x] VALIDATION_ERROR when `fallbackUserId === actorId` (self-assignment)
    - [x] VALIDATION_ERROR when `fallbackUserId` does not refer to a SUPERVISOR
    - [x] NOT_FOUND when `fallbackUserId` user does not exist or is deleted
  - [x] `src/lib/actions/users.test.ts` — add `describe("configureFallback action", ...)` block
    - [x] UNAUTHORIZED when session missing or actor is TRAINER
    - [x] VALIDATION_ERROR when `fallbackUserId` missing from FormData
    - [x] VALIDATION_ERROR when `expiresAt` missing from FormData
    - [x] Delegates to service for SUPERVISOR with valid inputs

## Dev Notes

### Files to Update / Create

- **UPDATE** `src/lib/services/user.service.ts` — add `configureFallback`
- **UPDATE** `src/lib/actions/users.ts` — add `configureFallback` action
- **CREATE** `src/components/features/users/FallbackConfig.tsx` — new client component
- **UPDATE** `src/app/users/page.tsx` — add session resolution, fallback query, FallbackConfig render
- **UPDATE** `src/lib/services/user.service.test.ts` — extend with configureFallback tests
- **UPDATE** `src/lib/actions/users.test.ts` — extend with configureFallback action tests

### Prisma Model Reference

```prisma
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

- Access via `prisma.fallbackApprover` (lowercase, no underscore)
- Import type: `import type { FallbackApprover } from "@/generated/prisma/client"`

### configureFallback Service Implementation

```ts
export async function configureFallback(
  actorId: string,
  fallbackUserId: string,
  expiresAt: Date,
): Promise<ActionResult<FallbackApprover>> {
  if (!fallbackUserId) {
    return { success: false, error: "Fallback user is required", code: ERRORS.VALIDATION_ERROR }
  }
  if (!expiresAt) {
    return { success: false, error: "An expiry date is required", code: ERRORS.VALIDATION_ERROR }
  }
  if (fallbackUserId === actorId) {
    return { success: false, error: "Cannot assign yourself as fallback approver", code: ERRORS.VALIDATION_ERROR }
  }

  const fallbackUser = await prisma.user.findFirst({
    where: { id: fallbackUserId, deletedAt: null },
    select: { id: true, role: true },
  })
  if (!fallbackUser) {
    return { success: false, error: "User not found", code: ERRORS.NOT_FOUND }
  }
  if (fallbackUser.role !== "SUPERVISOR") {
    return { success: false, error: "Fallback approver must be a supervisor", code: ERRORS.VALIDATION_ERROR }
  }

  // Deactivate any existing active fallback for this supervisor
  await prisma.fallbackApprover.updateMany({
    where: { supervisorId: actorId, active: true },
    data: { active: false },
  })

  const record = await prisma.fallbackApprover.create({
    data: {
      supervisorId: actorId,
      fallbackUserId,
      expiresAt,
      active: true,
    },
  })

  return { success: true, data: record }
}
```

### configureFallback Action

```ts
export async function configureFallback(
  _prevState: ActionResult<FallbackApprover> | null,
  formData: FormData,
): Promise<ActionResult<FallbackApprover>> {
  const actor = await resolveActor()
  if (!actor) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }
  if (!canActorPerformAction({ id: actor.id, role: actor.role }, "MANAGE_USERS")) {
    return { success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }
  }

  const fallbackUserId = (formData.get("fallbackUserId") as string | null) ?? ""
  const expiresAtStr = (formData.get("expiresAt") as string | null) ?? ""

  if (!fallbackUserId) {
    return { success: false, error: "Fallback user is required", code: ERRORS.VALIDATION_ERROR }
  }
  if (!expiresAtStr) {
    return { success: false, error: "An expiry date is required", code: ERRORS.VALIDATION_ERROR }
  }

  const expiresAt = new Date(expiresAtStr)

  const result = await configureFallbackService(actor.id, fallbackUserId, expiresAt)
  if (result.success) {
    revalidatePath("/users")
  }
  return result
}
```

### Updated Users Page Pattern

```tsx
import { getSession } from "@/lib/session"
import { FallbackConfig } from "@/components/features/users/FallbackConfig"

export default async function UsersPage() {
  const session = await getSession()
  const currentUserId = session!.user.id

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, email: true, role: true,
      supervisorId: true,
      supervisor: { select: { id: true, name: true } },
    },
  })

  const supervisors = users
    .filter((u) => u.role === "SUPERVISOR")
    .map((u) => ({ id: u.id, name: u.name }))

  const otherSupervisors = supervisors.filter((s) => s.id !== currentUserId)

  const activeFallback = await prisma.fallbackApprover.findFirst({
    where: { supervisorId: currentUserId, active: true },
    select: {
      id: true,
      fallbackUserId: true,
      expiresAt: true,
      fallbackUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <h1 ...>Users</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <UserForm />
        <UserList users={users} supervisors={supervisors} />
      </div>
      <div className="mt-8">
        <FallbackConfig currentFallback={activeFallback} supervisors={otherSupervisors} />
      </div>
    </div>
  )
}
```

### FallbackConfig Component Pattern

```tsx
"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Button, useToast } from "@/components/ui"
import { configureFallback } from "@/lib/actions/users"
import type { ActionResult } from "@/types"
import type { FallbackApprover } from "@/generated/prisma/client"

interface FallbackOption { id: string; name: string }
interface FallbackInfo { id: string; fallbackUserId: string; fallbackUser: { id: string; name: string }; expiresAt: Date }

interface FallbackConfigProps {
  currentFallback: FallbackInfo | null
  supervisors: FallbackOption[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Saving…" : "Configure Fallback"}
    </Button>
  )
}

export function FallbackConfig({ currentFallback, supervisors }: FallbackConfigProps) {
  const [state, action] = useActionState<ActionResult<FallbackApprover> | null, FormData>(
    configureFallback,
    null,
  )
  const { toast } = useToast()

  useEffect(() => {
    if (!state) return
    if (state.success) toast("Fallback approver configured.", "success")
    else toast(state.error, "error")
  }, [state, toast])

  const now = new Date()
  const isActive = currentFallback && new Date(currentFallback.expiresAt) > now

  return (
    <section className="border border-[var(--color-border)] p-6">
      <h2 className="font-[var(--font-heading)] text-[20px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-primary)] mb-4">
        Fallback Approver
      </h2>

      {currentFallback && (
        <div className="mb-4 flex items-center gap-3">
          <span className="font-[var(--font-body)] text-[14px] text-[var(--color-text-body)]">
            {currentFallback.fallbackUser.name}
          </span>
          <span className="font-[var(--font-body)] text-[13px] text-[var(--color-text-secondary)]">
            Expires {new Date(currentFallback.expiresAt).toLocaleDateString()}
          </span>
          {isActive ? (
            <span className="border-2 border-[var(--color-status-approved)] text-[var(--color-status-approved)] px-2 py-0.5 text-[11px] font-[var(--font-heading)] font-bold uppercase tracking-[0.1em]">
              Active
            </span>
          ) : (
            <span className="border-2 border-[var(--color-status-rejected)] text-[var(--color-status-rejected)] px-2 py-0.5 text-[11px] font-[var(--font-heading)] font-bold uppercase tracking-[0.1em]">
              Expired
            </span>
          )}
        </div>
      )}

      {supervisors.length === 0 ? (
        <p className="font-[var(--font-body)] text-[14px] text-[var(--color-text-secondary)] italic">
          No other supervisors available to configure as fallback.
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-4 max-w-md">
          <div className="flex flex-col gap-1">
            <label className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Fallback Supervisor
            </label>
            <select
              name="fallbackUserId"
              defaultValue={currentFallback?.fallbackUserId ?? ""}
              className="h-9 border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-[var(--font-body)] text-[13px]"
            >
              <option value="" disabled>Select supervisor</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-[var(--font-heading)] text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Expiry Date
            </label>
            <input
              type="date"
              name="expiresAt"
              className="h-9 border border-[var(--color-border)] bg-[var(--color-surface)] px-2 font-[var(--font-body)] text-[13px]"
            />
            {state && !state.success && state.error.includes("expiry") && (
              <p className="text-[12px] text-[var(--color-status-rejected)]">{state.error}</p>
            )}
          </div>

          <SubmitButton />
        </form>
      )}
    </section>
  )
}
```

### Test Pattern for Mock Extension

The `user.service.test.ts` mock already stubs `prisma.fallbackApprover` — but it doesn't yet, so we need to add it:

```ts
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    account: {
      create: vi.fn(),
    },
    fallbackApprover: {        // ADD THIS
      updateMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))
```

In test file, add mock cast:
```ts
const mockFallbackApprover = prisma.fallbackApprover as unknown as {
  updateMany: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
}
```

### Prisma Import Pattern

```ts
import { prisma } from "@/lib/prisma"                             // singleton
import type { FallbackApprover, Role } from "@/generated/prisma/client"  // NOT @prisma/client
import type { ActionResult } from "@/types"
import { ERRORS } from "@/lib/errors"
```

### Action Imports Extension

In `src/lib/actions/users.ts`, add to the service import:
```ts
import {
  createUser as createUserService,
  removeUser as removeUserService,
  assignSupervisor as assignSupervisorService,
  configureFallback as configureFallbackService,  // ADD
} from "@/lib/services/user.service"
import type { ActionResult } from "@/types"
import type { FallbackApprover, Role, User } from "@/generated/prisma/client"  // ADD FallbackApprover
```

### Date Handling for expiresAt

The `<input type="date" />` produces a string like `"2026-09-15"`. Convert with `new Date(expiresAtStr)`. This produces a valid UTC midnight date. No need for `TZDate` here — the expiry boundary is date-only, and UTC midnight is fine for a date comparison.

### AC3 Evaluation Logic

The fallback permission check (used in stories 2.4 and 4.x) queries:
```ts
prisma.fallbackApprover.findFirst({
  where: {
    supervisorId: delegatingSupervisorId,
    fallbackUserId: actorId,
    active: true,
    expiresAt: { gt: new Date() },   // still valid
  },
})
```
This AC is about the query logic, not UI. Story 2.3 ensures the data model is correct; story 2.4 will enforce the permission check.

### References

- [Source: prd.md#7] — FR23: supervisor configures fallback with mandatory expiry date, auto-cleared when expires
- [Source: epics.md#Story 2.3] — acceptance criteria
- [Source: prisma/schema.prisma#FallbackApprover] — model definition
- [Previous Story: 2-2-assign-supervisor-to-trainer.md] — action/service patterns to extend

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `src/lib/services/user.service.ts`: added `configureFallback(actorId, fallbackUserId, expiresAt)` — validates fallback user is non-deleted SUPERVISOR, blocks self-assignment, deactivates existing active records via updateMany, creates new FallbackApprover record
- `src/lib/actions/users.ts`: added `configureFallback` Server Action — same MANAGE_USERS guard, extracts fallbackUserId + expiresAt from FormData, revalidatePath on success
- `src/components/features/users/FallbackConfig.tsx`: new client component — shows current active/expired fallback with badge, form for selecting supervisor + expiry date, useActionState pattern
- `src/app/users/page.tsx`: added getSession() for currentUserId, queries active fallback with fallbackUser relation, derives otherSupervisors, renders FallbackConfig below UserList
- 10 new tests (service: 5, action: 5); 125 total pass, TypeScript clean
- Fixed mock queue bleed issue: use mockResolvedValueOnce for all setup in configureFallback tests; removed unused findFirst mock from self-assignment test

### File List

- src/lib/services/user.service.ts (modified — added configureFallback)
- src/lib/services/user.service.test.ts (modified — added configureFallback tests, extended prisma mock)
- src/lib/actions/users.ts (modified — added configureFallback action)
- src/lib/actions/users.test.ts (modified — added configureFallback action tests)
- src/components/features/users/FallbackConfig.tsx (created)
- src/app/users/page.tsx (modified — session, fallback query, FallbackConfig render)

### Change Log

- 2026-06-17: Story 2.3 implemented — configureFallback service + action, FallbackConfig component, Users page updated with session resolution and fallback section, 10 new tests (125 total pass)
