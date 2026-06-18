---
story_key: 2-2-assign-supervisor-to-trainer
epic: 2
story: 2
baseline_commit: b3092b1
---

# Story 2.2: Assign Supervisor to Trainer

Status: done

## Story

As a supervisor,
I want to assign a supervisor to each trainer,
so that every trainer has exactly one responsible approver at any time.

## Acceptance Criteria

1. **Given** a supervisor views the Users page  
   **When** they assign a supervisor to a trainer  
   **Then** the trainer's `supervisorId` is updated and the new supervisor is reflected in the UI

2. **Given** a trainer already has a supervisor assigned  
   **When** a different supervisor is assigned  
   **Then** the previous assignment is replaced (a trainer has exactly one supervisor at any time)

3. **Given** a supervisor attempts to assign themselves as a trainer's supervisor  
   **When** the Server Action runs  
   **Then** it returns `ActionResult` error with code `VALIDATION_ERROR`

4. **Given** a trainer with no supervisor assigned  
   **When** the Users page is inspected  
   **Then** the trainer row is visually flagged as missing a supervisor assignment

## Tasks / Subtasks

- [x] Task 1: Add `assignSupervisor` to `src/lib/services/user.service.ts` (AC: 1, 2, 3)
  - [x] `assignSupervisor(actorId, trainerId, supervisorId)` — validates and updates `supervisorId` on trainer
  - [x] Validate trainerId refers to a non-deleted TRAINER
  - [x] Validate supervisorId refers to a non-deleted SUPERVISOR
  - [x] Return VALIDATION_ERROR if supervisorId === actorId (supervisor assigning themselves)
  - [x] Also return VALIDATION_ERROR if supervisorId === trainerId (safety: same person can't be both)
  - [x] Update `users.supervisorId` via `prisma.user.update`
  - [x] Return `ActionResult<User>`

- [x] Task 2: Add `assignSupervisor` Server Action to `src/lib/actions/users.ts` (AC: 1, 2, 3)
  - [x] Guard with `canActorPerformAction(actor, 'MANAGE_USERS')`
  - [x] Extract `trainerId` and `supervisorId` from FormData
  - [x] Validate both fields are non-empty; return VALIDATION_ERROR if missing
  - [x] Delegate to service; call `revalidatePath('/users')` on success

- [x] Task 3: Update Users page and UserList to show supervisor assignment (AC: 1, 4)
  - [x] Update `src/app/users/page.tsx`: fetch users with supervisor relation included
  - [x] Pass list of supervisors to UserList for the assignment dropdown
  - [x] Update `src/components/features/users/UserList.tsx`: for TRAINER rows, add supervisor assignment UI
    - [x] Show current supervisor name (or "No supervisor" warning badge if null)
    - [x] Show a supervisor select dropdown + assign button per TRAINER row
    - [x] Visual flag (warning styling) on rows where `supervisorId` is null
  - [x] For SUPERVISOR rows, show no assignment controls (supervisors are not assigned)

- [x] Task 4: Tests (AC: 1, 2, 3)
  - [x] `src/lib/services/user.service.test.ts` — add tests for `assignSupervisor`
    - [x] Happy path: updates `supervisorId`, replaces existing assignment
    - [x] VALIDATION_ERROR when supervisorId === actorId (self-assignment)
    - [x] VALIDATION_ERROR when target is not a TRAINER
    - [x] VALIDATION_ERROR when supervisor userId does not refer to a SUPERVISOR
    - [x] NOT_FOUND when trainerId does not exist / is deleted
  - [x] `src/lib/actions/users.test.ts` — add tests for `assignSupervisor` action
    - [x] UNAUTHORIZED when no session / TRAINER actor
    - [x] VALIDATION_ERROR when trainerId or supervisorId missing
    - [x] Delegates to service on valid input

## Dev Notes

### Files to Update (not create)

- **UPDATE** `src/lib/services/user.service.ts` — add `assignSupervisor`
- **UPDATE** `src/lib/actions/users.ts` — add `assignSupervisor` action  
- **UPDATE** `src/app/users/page.tsx` — add supervisor relation to query + pass supervisors
- **UPDATE** `src/components/features/users/UserList.tsx` — add supervisor assignment UI per TRAINER row
- **UPDATE** `src/lib/services/user.service.test.ts` — extend with new tests
- **UPDATE** `src/lib/actions/users.test.ts` — extend with new tests

### assignSupervisor Service Implementation

```ts
export async function assignSupervisor(
  actorId: string,
  trainerId: string,
  supervisorId: string,
): Promise<ActionResult<User>> {
  // Self-assignment guard: actor cannot assign themselves
  if (supervisorId === actorId && supervisorId === trainerId) {
    // Both checks below cover this, but early exit is fine too
  }

  const trainer = await prisma.user.findFirst({
    where: { id: trainerId, deletedAt: null },
    select: { id: true, role: true },
  })
  if (!trainer) {
    return { success: false, error: "Trainer not found", code: ERRORS.NOT_FOUND }
  }
  if (trainer.role !== "TRAINER") {
    return { success: false, error: "Target user is not a trainer", code: ERRORS.VALIDATION_ERROR }
  }

  const supervisor = await prisma.user.findFirst({
    where: { id: supervisorId, deletedAt: null },
    select: { id: true, role: true },
  })
  if (!supervisor) {
    return { success: false, error: "Supervisor not found", code: ERRORS.NOT_FOUND }
  }
  if (supervisor.role !== "SUPERVISOR") {
    return { success: false, error: "Target user is not a supervisor", code: ERRORS.VALIDATION_ERROR }
  }
  if (supervisorId === actorId) {
    // AC3: supervisor cannot assign themselves
    return { success: false, error: "Cannot assign yourself as a trainer's supervisor", code: ERRORS.VALIDATION_ERROR }
  }

  const user = await prisma.user.update({
    where: { id: trainerId },
    data: { supervisorId },
  })

  return { success: true, data: user }
}
```

**Note on AC3:** The AC says "supervisor attempts to assign themselves." The guard is `supervisorId === actorId`. If any supervisor other than the actor is a valid assignment target, that's allowed.

### Updated Page Query

The page needs to include the supervisor relation so UserList can display the current supervisor name:

```ts
// src/app/users/page.tsx
const users = await prisma.user.findMany({
  where: { deletedAt: null },
  orderBy: { createdAt: "asc" },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    supervisorId: true,
    supervisor: {
      select: { id: true, name: true },
    },
  },
})

const supervisors = users.filter(u => u.role === "SUPERVISOR")
```

Pass `supervisors` as a prop to `UserList` and also the extended user data.

### UserList Update Strategy

The `UserList` component currently receives `UserRow = { id, name, email, role }`. Extend this type to include supervisor info:

```ts
interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  supervisorId: string | null        // NEW
  supervisor: { id: string; name: string } | null  // NEW
}
```

For TRAINER rows:
- If `supervisorId` is null → show a warning indicator ("No supervisor assigned") in a distinct style (e.g., orange/warning color using `--color-status-pending`)
- Show a `<select>` populated with the `supervisors` list + an "Assign" button
- Wrap in a form that calls `assignSupervisor` action

For SUPERVISOR rows:
- No supervisor assignment controls (supervisors supervise others, not assigned themselves)

### Supervisor Select Pattern

The select + assign is a small inline form per TRAINER row. Use the same `useActionState` + `useFormStatus` pattern from Story 2.1:

```tsx
function AssignSupervisorForm({
  trainerId,
  supervisors,
  currentSupervisorId,
}: {
  trainerId: string
  supervisors: { id: string; name: string }[]
  currentSupervisorId: string | null
}) {
  const [state, action] = useActionState<ActionResult<User> | null, FormData>(assignSupervisor, null)
  const { toast } = useToast()

  useEffect(() => {
    if (!state) return
    if (state.success) toast("Supervisor assigned.", "success")
    else toast(state.error, "error")
  }, [state, toast])

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="trainerId" value={trainerId} />
      <select name="supervisorId" defaultValue={currentSupervisorId ?? ""} ...>
        <option value="" disabled>Select supervisor</option>
        {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <SubmitButton />
    </form>
  )
}
```

### Visual Flag for Missing Supervisor

A trainer without a supervisor is a data-integrity concern. Highlight the row:

```tsx
// In the row className or via a warning badge in the supervisor column
{user.supervisorId === null && (
  <span className="border-2 border-[var(--color-status-pending)] text-[var(--color-status-pending)] px-2 py-0.5 text-[11px] font-[var(--font-heading)] font-bold uppercase tracking-[0.1em]">
    No Supervisor
  </span>
)}
```

### Prisma Import Pattern (from Story 2.1)

```ts
import { prisma } from "@/lib/prisma"                    // always singleton
import type { Role, User } from "@/generated/prisma/client" // NOT @prisma/client
import type { ActionResult } from "@/types"
import { ERRORS } from "@/lib/errors"
```

### Test Extension Pattern

Add new describe blocks to the existing test files — do NOT replace them. Append `describe("assignSupervisor", ...)` after the existing `describe("createUser", ...)` and `describe("removeUser", ...)` blocks.

The Prisma mock in `user.service.test.ts` currently stubs `user.findFirst`, `user.create`, `user.update`. For `assignSupervisor` tests, `user.findFirst` is called twice (trainer lookup, supervisor lookup) and `user.update` once. Use `mockResolvedValueOnce` to return different values per call:

```ts
mockUser.findFirst
  .mockResolvedValueOnce({ id: "t1", role: "TRAINER" })   // trainer lookup
  .mockResolvedValueOnce({ id: "s1", role: "SUPERVISOR" }) // supervisor lookup
mockUser.update.mockResolvedValue({ ...fakeUser, supervisorId: "s1" })
```

### References

- [Source: architecture.md#Service Boundaries] — service layer, canActorPerformAction in actions
- [Source: architecture.md#Naming Patterns] — consistent with createUser/removeUser patterns
- [Source: epics.md#Story 2.2] — acceptance criteria and business rules
- [Source: prd.md#7] — "Assign a supervisor to a trainer (one supervisor per trainer)"
- [Previous Story: 2-1-create-and-remove-user-accounts.md] — user.service.ts, actions/users.ts, UserList.tsx patterns to extend

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `src/lib/services/user.service.ts`: added `assignSupervisor(actorId, trainerId, supervisorId)` — validates trainer/supervisor roles, blocks self-assignment (supervisorId === actorId), updates supervisorId via prisma.user.update
- `src/lib/actions/users.ts`: added `assignSupervisor` Server Action — same MANAGE_USERS guard, delegates to service, revalidatePath on success
- `src/app/users/page.tsx`: updated query to include `supervisorId` + `supervisor` relation; derives `supervisors` list and passes to UserList
- `src/components/features/users/UserList.tsx`: extended UserRow type with `supervisorId`/`supervisor`; TRAINER rows now show "No Supervisor" warning badge + inline AssignSupervisorForm; SUPERVISOR rows show "—"
- 11 new tests added (service: 6, action: 4); 115 total pass, TypeScript clean

### Change Log

- 2026-06-17: Story 2.2 implemented — assignSupervisor service + action, Users page updated with supervisor relation, UserList updated with inline assignment form and no-supervisor visual flag, 11 new tests (115 total pass)

### File List

- src/lib/services/user.service.ts (modified — added assignSupervisor)
- src/lib/services/user.service.test.ts (modified — added assignSupervisor tests)
- src/lib/actions/users.ts (modified — added assignSupervisor action)
- src/lib/actions/users.test.ts (modified — added assignSupervisor action tests)
- src/app/users/page.tsx (modified — supervisor relation in query, supervisors prop)
- src/components/features/users/UserList.tsx (modified — supervisor assignment UI)
