---
story_key: 4-1-approve-and-reject-pending-requests
epic: 4
story: 1
baseline_commit: cfc63e91c88d616fc953358aa46816ea50b8d2eb
---

# Story 4.1: Approve & Reject Pending Requests

Status: done

## Story

As a supervisor,
I want to approve or reject pending vacation requests from my trainers,
So that I can manage team availability and give trainers a timely decision.

## Acceptance Criteria

1. **Given** an authenticated supervisor on the Approvals page (`/approvals`)
   **When** the page loads
   **Then** all PENDING requests from their assigned trainers are listed, with trainer name, dates, day count, and submission date

2. **Given** a supervisor opens a request detail at `/approvals/:id`
   **When** the page loads
   **Then** they see: trainer name and avatar initial, requested dates, day count, current balance snapshot showing remaining days after approval, Approve (primary) and Reject (outline danger) buttons

3. **Given** a supervisor clicks "Approve"
   **When** the `approveRequest` Server Action runs
   **Then** `canTransition(PENDING, APPROVED, actorRole)` is called first
   **And** the request status is updated to APPROVED
   **And** an audit log entry is written
   **And** a toast confirms: "Request approved."
   **And** the supervisor is redirected to `/approvals`

4. **Given** a supervisor clicks "Reject"
   **When** the rejection reason textarea appears inline
   **Then** the supervisor must enter a reason before the "Confirm Rejection" button becomes enabled

5. **Given** a supervisor confirms rejection with a reason
   **When** the `rejectRequest` Server Action runs
   **Then** `canTransition(PENDING, REJECTED, actorRole)` is called first
   **And** the request status is updated to REJECTED with the reason stored
   **And** an audit log entry is written
   **And** a toast confirms: "Request rejected."

6. **Given** an active fallback approver for this supervisor
   **When** they view the Approvals page
   **Then** they can also see and approve/reject this supervisor's trainers' PENDING requests

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/services/approval.service.ts` — domain logic for approve/reject (AC: 3, 5)
  - [x] `approveRequest(actorId, requestId, actorRole)`: load request, verify actor scope, `canTransition(PENDING, APPROVED, actorRole)`, update status, `auditService.log`
  - [x] `rejectRequest(actorId, requestId, actorRole, reason)`: same flow with reason validation and REJECTED update
  - [x] Helper `resolveActorRole(actorId, trainerId)`: returns `"SUPERVISOR" | "FALLBACK"` by checking trainer.supervisorId and `getFallbackSupervisorIds`; throws if actor has no scope

- [x] Task 2: Create `src/lib/actions/approvals.ts` — Server Actions (AC: 3, 5)
  - [x] `approveRequest(prevState, formData)`: verify SUPERVISOR session; extract requestId from formData; call `resolveActorRole`, call service; `revalidatePath`; return `ActionResult<void>`
  - [x] `rejectRequest(prevState, formData)`: same but also extract and validate `reason`
  - [x] Both actions redirect to `/approvals` on success using `redirect()`

- [x] Task 3: Create `src/app/(authenticated)/approvals/page.tsx` — approval queue (AC: 1, 6)
  - [x] Server component; session + SUPERVISOR role guard (proxy already blocks trainers)
  - [x] Compute supervisor scope: own trainers + fallback-covered trainers
  - [x] `prisma.vacationRequest.findMany({ where: { status: "PENDING", trainer: { supervisorId: { in: scopeIds }, deletedAt: null } }, include: { trainer: true }, orderBy: { createdAt: "asc" } })`
  - [x] Render `<ApprovalQueue requests={...} />`

- [x] Task 4: Create `src/app/(authenticated)/approvals/[id]/page.tsx` — request detail (AC: 2, 3, 4, 5)
  - [x] Server component; load request with trainer; verify actor scope via `resolveActorRole`; compute `afterBalance = computeBalance(trainerId, year)` then project remaining after this request
  - [x] Render `<ApprovalDetail request={...} trainerName={...} afterBalance={...} actorRole={...} />`

- [x] Task 5: Create `src/app/(authenticated)/approvals/loading.tsx` — skeleton (AC: 2)
  - [x] 3 `<Skeleton variant="table-row" />` instances

- [x] Task 6: Create `src/components/features/approvals/ApprovalQueue.tsx` (AC: 1)
  - [x] Client component; props: `requests: (VacationRequest & { trainer: User })[]`
  - [x] Empty state: "No pending requests. Your trainers are all set."
  - [x] Table: Trainer | Dates | Days | Submitted | Action
  - [x] Each row links to `/approvals/{id}` via a "Review" button

- [x] Task 7: Create `src/components/features/approvals/ApprovalDetail.tsx` (AC: 2, 3, 4, 5)
  - [x] Client component; props: `request`, `trainerName`, `avatarInitial`, `afterBalance`, `actorRole`
  - [x] Avatar initial: first letter of trainer name in a coloured circle
  - [x] Dates formatted via `formatDate()`
  - [x] Balance snapshot shows current remaining AND projected remaining after approval
  - [x] Approve button (`variant="primary"`) wired to `approveRequest` action via `useActionState`
  - [x] Reject: "Reject" button reveals inline rejection textarea; "Confirm Rejection" only enabled when reason.trim().length > 0

- [x] Task 8: Rejection form inlined in `ApprovalDetail.tsx` (AC: 4, 5)
  - [x] Controlled textarea for reason; "Confirm Rejection" button disabled when reason empty
  - [x] On submit calls `rejectRequest` action via `useActionState`

- [x] Task 9: Write tests `src/lib/services/approval.service.test.ts` (AC: 3, 5)
  - [x] `approveRequest`: success path; INVALID_TRANSITION when status is not PENDING; UNAUTHORIZED when actor has no scope
  - [x] `rejectRequest`: success path; requires non-empty reason; INVALID_TRANSITION when status not PENDING

## Dev Notes

### Actor role resolution

The `actorRole` passed to `canTransition` must be `"SUPERVISOR"` or `"FALLBACK"` (type `ActorRole` from `@/lib/request-state-machine`). Determine it per request:

```ts
import { getFallbackSupervisorIds } from "@/lib/services/fallback.service"

export async function resolveActorRole(
  actorId: string,
  trainerId: string,
): Promise<ActorRole | null> {
  const trainer = await prisma.user.findUnique({
    where: { id: trainerId },
    select: { supervisorId: true },
  })
  if (!trainer) return null
  if (trainer.supervisorId === actorId) return "SUPERVISOR"
  const fallbackIds = await getFallbackSupervisorIds(actorId)
  if (fallbackIds.includes(trainer.supervisorId!)) return "FALLBACK"
  return null // actor has no scope over this trainer
}
```

If `resolveActorRole` returns `null`, the service returns `{ success: false, error: "Unauthorized", code: ERRORS.UNAUTHORIZED }`.

### Approval queue scope

On the list page, collect all supervisor IDs in scope:

```ts
const ownTrainers = await prisma.user.findMany({
  where: { supervisorId: actorId, deletedAt: null, role: "TRAINER" },
  select: { id: true },
})
const fallbackSupervisorIds = await getFallbackSupervisorIds(actorId)
const coveredTrainers = fallbackSupervisorIds.length > 0
  ? await prisma.user.findMany({
      where: { supervisorId: { in: fallbackSupervisorIds }, deletedAt: null, role: "TRAINER" },
      select: { id: true },
    })
  : []
const allTrainerIds = [...ownTrainers, ...coveredTrainers].map(t => t.id)
```

Then query `vacationRequest` where `trainerId: { in: allTrainerIds }`.

### Balance snapshot in detail view

Show two numbers: current remaining and projected remaining after approval:

```ts
const balance = await computeBalance(request.trainerId, request.startDate.getFullYear())
const projected = balance.remaining - request.daysCount
```

Display as: "X days remaining → Y after approval" or similar.

### Server Action pattern

Both `approveRequest` and `rejectRequest` must `redirect("/approvals")` on success (after `revalidatePath`). Import `redirect` from `"next/navigation"`.

```ts
"use server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function approveRequest(
  _prevState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  // ... resolve actor, call service ...
  if (result.success) {
    revalidatePath("/approvals")
    redirect("/approvals")
  }
  return result
}
```

Note: `redirect()` throws internally — do not wrap it in try/catch.

### Form status handling

Use `useActionState` (React 19 / Next.js 16) to wire Server Actions to forms:

```tsx
const [state, formAction, isPending] = useActionState(approveRequestAction, null)
```

### Imports

```ts
import type { VacationRequest } from "@/generated/prisma/models/VacationRequest"
import type { User } from "@/generated/prisma/models/User"
import { canTransition, type ActorRole } from "@/lib/request-state-machine"
import { ERRORS } from "@/lib/errors"
import * as auditService from "@/lib/services/audit.service"
import { getFallbackSupervisorIds } from "@/lib/services/fallback.service"
import { computeBalance } from "@/lib/services/vacation-balance.service"
import { formatDate } from "@/lib/date"
```

### References

- [Source: epics.md#Story 4.1] — acceptance criteria
- [Source: architecture.md#State Machine Enforcement] — `canTransition` usage
- [Source: architecture.md#API Pattern] — Server Actions returning `ActionResult<T>`
- [Source: story 3-1] — `auditService.log` pattern
- [Source: story 2-4] — fallback approver scope

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- src/lib/services/approval.service.ts (new)
- src/lib/services/approval.service.test.ts (new)
- src/lib/actions/approvals.ts (new)
- src/app/(authenticated)/approvals/page.tsx (new)
- src/app/(authenticated)/approvals/[id]/page.tsx (new)
- src/app/(authenticated)/approvals/loading.tsx (new)
- src/components/features/approvals/ApprovalQueue.tsx (new)
- src/components/features/approvals/ApprovalDetail.tsx (new)

### Change Log

- 2026-06-18: Implemented Story 4.1 — approve/reject service, Server Actions, approvals list + detail pages, queue and detail components with inline rejection form; 18 service tests all pass
