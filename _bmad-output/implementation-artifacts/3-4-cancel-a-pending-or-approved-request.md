---
story_key: 3-4-cancel-a-pending-or-approved-request
epic: 3
story: 4
baseline_commit: 5c9d3472a7f0d9ad0b9e8172b0983be340f243e2
---

# Story 3.4: Cancel a Pending or Approved Request

Status: done

## Story

As a trainer,
I want to cancel a vacation request that is PENDING or APPROVED,
So that I can withdraw a request I no longer need and free up the balance days.

## Acceptance Criteria

1. **Given** a trainer views a PENDING or APPROVED request in My Requests  
   **When** they click "Cancel Request"  
   **Then** a confirmation modal appears: "Cancel this request? This cannot be undone."

2. **Given** the trainer confirms cancellation  
   **When** the `cancelRequest` Server Action runs  
   **Then** `canTransition(current_status, CANCELLED, 'TRAINER')` is called first  
   **And** the request status is updated to CANCELLED  
   **And** an audit log entry is written  
   **And** a toast confirms: "Request cancelled."

3. **Given** a request is cancelled  
   **When** the trainer views their balance  
   **Then** the previously pending/approved days are no longer counted against their balance

4. **Given** a trainer attempts to cancel a REJECTED, REVOKED, or CANCELLED request  
   **When** the Server Action runs  
   **Then** it returns `ActionResult` error with code `INVALID_TRANSITION` (no cancel button is shown for terminal states)

## Tasks / Subtasks

- [ ] Task 1: Add `cancelRequest` to `src/lib/services/request.service.ts` (AC: 2, 3, 4)
  - [ ] `cancelRequest(trainerId: string, requestId: string): Promise<ActionResult<void>>`
  - [ ] Fetch the request: `prisma.vacationRequest.findFirst({ where: { id: requestId, trainerId } })`; return NOT_FOUND if absent
  - [ ] Call `canTransition(currentStatus, 'CANCELLED', 'TRAINER')`; return INVALID_TRANSITION if false
  - [ ] Update status: `prisma.vacationRequest.update({ where: { id: requestId }, data: { status: 'CANCELLED' } })`
  - [ ] Call `auditService.log(trainerId, 'REQUEST_CANCELLED', 'VacationRequest', requestId, { previousStatus: currentStatus })`
  - [ ] Return `{ success: true, data: undefined }`

- [ ] Task 2: Add `cancelRequest` Server Action to `src/lib/actions/requests.ts` (AC: 2, 4)
  - [ ] `"use server"` directive (file already exists from story 3-2)
  - [ ] Guard auth + TRAINER role + `canActorPerformAction(actor, 'CANCEL_REQUEST')`
  - [ ] Parse `requestId` from FormData
  - [ ] Delegate to `requestService.cancelRequest(actor.id, requestId)`
  - [ ] On success: `revalidatePath('/requests')`, `revalidatePath('/dashboard')`

- [ ] Task 3: Add cancel tests to `src/lib/services/request.service.test.ts` (AC: 2, 3, 4)
  - [ ] Success: PENDING → CANCELLED writes update and audit log
  - [ ] Success: APPROVED → CANCELLED writes update and audit log
  - [ ] Invalid: REJECTED → CANCELLED returns INVALID_TRANSITION, no DB write
  - [ ] Invalid: CANCELLED → CANCELLED returns INVALID_TRANSITION
  - [ ] Not found: returns NOT_FOUND if request doesn't exist or belongs to other trainer

- [ ] Task 4: Update `src/components/features/requests/RequestHistory.tsx` to add cancel action (AC: 1, 2)
  - [ ] Already created in story 3-6; this story adds cancel functionality inline
  - [ ] Show "Cancel Request" button (danger outline) only for PENDING or APPROVED requests
  - [ ] Button triggers `<Modal>` with text "Cancel this request? This cannot be undone."
  - [ ] Modal confirm: call `cancelRequest` Server Action; on success show toast "Request cancelled." and the row updates to CANCELLED

## Dev Notes

### cancelRequest service — ownership enforcement

The `findFirst` query must always include `trainerId` in the where clause to prevent a trainer from cancelling another trainer's request:

```ts
const request = await prisma.vacationRequest.findFirst({
  where: { id: requestId, trainerId },
  select: { id: true, status: true },
})
```

### State machine integration

`canTransition('PENDING', 'CANCELLED', 'TRAINER')` → true (valid)  
`canTransition('APPROVED', 'CANCELLED', 'TRAINER')` → true (valid)  
`canTransition('REJECTED', 'CANCELLED', 'TRAINER')` → false → return INVALID_TRANSITION

This is enforced by the `TRANSITIONS` table from story 3-1.

### Balance effect

Balance is computed dynamically by `VacationBalanceService` (story 3-1). Once a request is CANCELLED, it will be excluded from the `pending` and `taken` queries naturally (they filter for PENDING or APPROVED only). No explicit balance update is needed.

### RequestHistory dependency

Story 3-4 adds the cancel button to `RequestHistory.tsx` which is created in story 3-6. If implementing in story order, either:
- Create a minimal `RequestHistory.tsx` stub in this story with the cancel button, then expand in 3-6
- Or implement story 3-6 first (both stories modify the same component)

Recommended: implement the full `RequestHistory` in 3-5/3-6 and include cancel in the same pass. This story's service + action are the prerequisite.

### Toast after cancel

Use `useToast()` from `@/components/ui/Toast`. Show `toast.success("Request cancelled.")` after Server Action returns `{ success: true }`.

### References

- [Source: epics.md#Story 3.4] — acceptance criteria
- [Source: prd.md#3.2] — APPROVED→CANCELLED and PENDING→CANCELLED transitions
- [Source: story 3-1] — `canTransition`, `auditService.log` prerequisites
- [Source: story 3-2] — `requestService` and `requests.ts` action file prerequisites
- [Source: story 3-6] — `RequestHistory.tsx` component is created there

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

### Change Log
